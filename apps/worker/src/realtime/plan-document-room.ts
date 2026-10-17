// =============================================================================
// FILE:    apps/worker/src/realtime/plan-document-room.ts
// PURPOSE: The collaborative notes room for one plan: a Yjs document served
//          over the y-websocket wire protocol (sync + awareness frames) on
//          the WebSocket Hibernation API. The merged document persists to
//          this object's own storage on a short debounce, so a plan's notes
//          survive restarts and hibernation without D1 row churn.
// USED BY: apps/worker/src/index.ts (class export),
//          routes/plan-document-socket-routes.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { DurableObject } from 'cloudflare:workers'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as Y from 'yjs'

// ---- Types ------------------------------------------------------------------

/** Client awareness ids tracked per connection, for cleanup on close. */
type ConnectionAttachment = {
  awarenessClientIds: number[]
}

// ---- Constants --------------------------------------------------------------

/** y-websocket wire message types (first byte of every binary frame). */
const MESSAGE_TYPE_SYNC = 0
const MESSAGE_TYPE_AWARENESS = 1

/** How long after the last change the merged document flushes to storage. */
const PERSIST_DEBOUNCE_MS = 2_000

/** The key the merged Yjs update lives under in this object's storage. */
const DOCUMENT_STATE_KEY = 'document-state'

// ---- Internal helpers -------------------------------------------------------

/**
 * Frames one sync message: y-websocket sends sync content as the raw tail
 * after the type byte (the sync sub-type inside carries its own framing).
 */
function frameSyncMessage(syncContent: Uint8Array): Uint8Array {
  const framedMessage = new Uint8Array(1 + syncContent.length)
  framedMessage[0] = MESSAGE_TYPE_SYNC
  framedMessage.set(syncContent, 1)
  return framedMessage
}

/**
 * Frames one awareness update: y-websocket length-prefixes awareness
 * payloads, unlike sync — the two halves of the protocol disagree, so this
 * room matches each half exactly.
 */
function frameAwarenessMessage(awarenessUpdate: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, MESSAGE_TYPE_AWARENESS)
  encoding.writeVarUint8Array(encoder, awarenessUpdate)
  return encoding.toUint8Array(encoder)
}

/**
 * Scans a raw awareness update for the client ids it carries, so the room
 * can forget a closing connection's states. The payload is a varuint entry
 * count, then per entry: varuint clientId, varuint clock, varuint string
 * length, JSON state bytes.
 */
function scanAwarenessClientIds(updatePayload: Uint8Array): number[] {
  const decoder = decoding.createDecoder(updatePayload)
  const clientIds: number[] = []
  try {
    const entryCount = decoding.readVarUint(decoder)
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      clientIds.push(decoding.readVarUint(decoder))
      decoding.readVarUint(decoder) // clock
      decoding.readVarUint8Array(decoder) // JSON state bytes (varuint length)
    }
  } catch {
    // A truncated frame must not take the room down; keep what we scanned.
  }
  return clientIds
}

// ---- Durable Object ---------------------------------------------------------

/**
 * One room per plan, named by the plan id (`idFromName`). The Worker is the
 * only caller: it forwards WebSocket upgrades to /connect after its own
 * membership gate.
 */
export class PlanDocumentRoom extends DurableObject {
  private document: Y.Doc | null = null
  private awareness: awarenessProtocol.Awareness | null = null
  private isDocumentLoaded = false

  public override async fetch(request: Request): Promise<Response> {
    const roomPath = new URL(request.url).pathname
    if (request.method !== 'GET' || roomPath !== '/connect') {
      return new Response('Not found', { status: 404 })
    }

    const isUpgradable = request.headers.get('upgrade') === 'websocket'
    if (!isUpgradable) {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }

    const { document: loadedDocument, awareness: loadedAwareness } =
      await this.ensureDocumentLoaded()

    const pairedWebSocket = new WebSocketPair()
    this.ctx.acceptWebSocket(pairedWebSocket[1])
    pairedWebSocket[1].serializeAttachment({
      awarenessClientIds: [],
    } satisfies ConnectionAttachment)

    // The newcomer gets the full document state (no state vector filter —
    // simple and correct; the document is small) and everyone's presence.
    const syncReplyEncoder = encoding.createEncoder()
    syncProtocol.writeSyncStep2(syncReplyEncoder, loadedDocument)
    pairedWebSocket[1].send(frameSyncMessage(encoding.toUint8Array(syncReplyEncoder)))

    const awarenessStates = [...loadedAwareness.getStates().keys()]
    const hasAwarenessStates = awarenessStates.length > 0
    if (hasAwarenessStates) {
      pairedWebSocket[1].send(
        frameAwarenessMessage(
          awarenessProtocol.encodeAwarenessUpdate(loadedAwareness, awarenessStates),
        ),
      )
    }

    return new Response(null, { status: 101, webSocket: pairedWebSocket[0] })
  }

  /** Sync and awareness frames from a connected editor. */
  public override async webSocketMessage(
    connectionWebSocket: WebSocket,
    rawMessage: string | ArrayBuffer,
  ): Promise<void> {
    try {
      await this.processWebSocketMessage(connectionWebSocket, rawMessage)
    } catch (processingError) {
      // One malformed frame must never kill the room or the connection.
      console.error('Plan document room dropped a malformed frame:', processingError)
    }
  }

  private async processWebSocketMessage(
    connectionWebSocket: WebSocket,
    rawMessage: string | ArrayBuffer,
  ): Promise<void> {
    const isBinaryFrame = rawMessage instanceof ArrayBuffer
    if (!isBinaryFrame) return

    const { document: loadedDocument, awareness: loadedAwareness } =
      await this.ensureDocumentLoaded()

    const frameDecoder = decoding.createDecoder(new Uint8Array(rawMessage))
    let messageType: number
    try {
      messageType = decoding.readVarUint(frameDecoder)
    } catch {
      return // malformed frame: ignore
    }

    if (messageType === MESSAGE_TYPE_SYNC) {
      const replyEncoder = encoding.createEncoder()
      const processedMessageType = syncProtocol.readSyncMessage(
        frameDecoder,
        replyEncoder,
        loadedDocument,
        'server',
      )
      if (encoding.length(replyEncoder) > 0) {
        connectionWebSocket.send(frameSyncMessage(encoding.toUint8Array(replyEncoder)))
      }
      // Step 1 requests read state without changing it; steps 2 and updates
      // apply remote changes and must be persisted.
      if (processedMessageType !== syncProtocol.messageYjsSyncStep1) {
        this.scheduleDocumentPersist()
      }
      return
    }

    if (messageType === MESSAGE_TYPE_AWARENESS) {
      const updatePayload = decoding.readVarUint8Array(frameDecoder)
      const connectionAttachment = this.readAttachment(connectionWebSocket)
      if (connectionAttachment !== null) {
        connectionAttachment.awarenessClientIds.push(...scanAwarenessClientIds(updatePayload))
        connectionWebSocket.serializeAttachment(connectionAttachment)
      }

      // Teach the room, then relay to every other connected editor.
      awarenessProtocol.applyAwarenessUpdate(loadedAwareness, updatePayload, null)
      this.relayToOthers(connectionWebSocket, frameAwarenessMessage(updatePayload))
    }
  }

  /** An editor left: forget its awareness states and flush if it was last. */
  public override async webSocketClose(connectionWebSocket: WebSocket): Promise<void> {
    try {
      await this.processWebSocketClose(connectionWebSocket)
    } catch (cleanupError) {
      console.error('Plan document room failed to clean up a connection:', cleanupError)
    }
  }

  private async processWebSocketClose(connectionWebSocket: WebSocket): Promise<void> {
    const { awareness: loadedAwareness } = await this.ensureDocumentLoaded()
    const connectionAttachment = this.readAttachment(connectionWebSocket)
    if (connectionAttachment !== null) {
      const knownClientIds = [...new Set(connectionAttachment.awarenessClientIds)]
      if (knownClientIds.length > 0) {
        awarenessProtocol.removeAwarenessStates(loadedAwareness, knownClientIds, null)
        const removalUpdate = awarenessProtocol.encodeAwarenessUpdate(
          loadedAwareness,
          knownClientIds,
        )
        this.relayToOthers(connectionWebSocket, frameAwarenessMessage(removalUpdate))
      }
    }

    const hasRemainingConnections = this.ctx.getWebSockets().length > 0
    if (!hasRemainingConnections) await this.flushDocumentToStorage()
  }

  public override webSocketError(): void {
    // Errors precede a close; the close handler does the cleanup.
  }

  /** The debounced persist tick: write the merged document once. */
  public override async alarm(): Promise<void> {
    await this.flushDocumentToStorage()
  }

  // ---- Internals ----------------------------------------------------------------

  /** Reads a connection's attachment, tolerating a missing/corrupt one. */
  private readAttachment(connectionWebSocket: WebSocket): ConnectionAttachment | null {
    const attachment: unknown = connectionWebSocket.deserializeAttachment()
    if (
      typeof attachment !== 'object' ||
      attachment === null ||
      !('awarenessClientIds' in attachment)
    ) {
      return null
    }
    return attachment as ConnectionAttachment
  }

  /**
   * Loads the persisted document exactly once per wake-up: applies the stored
   * merged update into a fresh Y.Doc and prepares the awareness tracker.
   * Returns the loaded pair so handlers never see nulls.
   */
  private async ensureDocumentLoaded(): Promise<{
    document: Y.Doc
    awareness: awarenessProtocol.Awareness
  }> {
    if (!this.isDocumentLoaded) {
      this.document = new Y.Doc()
      const storedState = await this.ctx.storage.get<Uint8Array>(DOCUMENT_STATE_KEY)
      if (storedState !== undefined) {
        Y.applyUpdate(this.document, storedState)
      }

      this.awareness = new awarenessProtocol.Awareness(this.document)
      this.awareness.setLocalState(null) // the room itself is never "editing"
      this.isDocumentLoaded = true
    }

    if (this.document === null || this.awareness === null) {
      throw new Error('Plan document room failed to load.')
    }
    return { document: this.document, awareness: this.awareness }
  }

  /** Persists once, shortly after the first unsaved change. */
  private scheduleDocumentPersist(): void {
    void this.ctx.storage.setAlarm(Date.now() + PERSIST_DEBOUNCE_MS)
  }

  /** Writes the merged document to storage (idempotent, cheap for small docs). */
  private async flushDocumentToStorage(): Promise<void> {
    if (this.document === null) return
    await this.ctx.storage.put(DOCUMENT_STATE_KEY, Y.encodeStateAsUpdate(this.document))
  }

  /** Sends one framed message to every connected socket except the sender. */
  private relayToOthers(senderWebSocket: WebSocket, framedMessage: Uint8Array): void {
    for (const connectionWebSocket of this.ctx.getWebSockets()) {
      if (connectionWebSocket === senderWebSocket) continue
      try {
        connectionWebSocket.send(framedMessage)
      } catch {
        // A dying connection raced the relay; its close handler cleans up.
      }
    }
  }
}
