// =============================================================================
// FILE:    apps/worker/src/realtime/workspace-room.ts
// PURPOSE: The realtime room for one workspace: relays tiny workspace events
//          ("an idea was voted on") to every connected teammate and keeps the
//          presence snapshot ("who is looking right now"). Built on the
//          WebSocket Hibernation API — idle connections cost nothing on the
//          free tier, and presence lives in per-socket attachments so it
//          survives hibernation.
// USED BY: apps/worker/src/index.ts (class export), routes/workspace-socket-routes.ts,
//          realtime/notify-workspace-room.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { DurableObject } from 'cloudflare:workers'
import {
  parseClientRealtimeMessage,
  parseServerRealtimeMessage,
  type ServerRealtimeMessage,
  type WorkspaceEventMessage,
  type WorkspaceViewer,
} from '@ideo/shared'

// ---- Types ------------------------------------------------------------------

/** Everything the room knows about one connected browser tab. */
type ConnectionAttachment = {
  userId: string
  displayName: string
  avatarColor: string
  /** The idea this tab is looking at; null while on the board. */
  viewingIdeaId: string | null
  /** Wall-clock time of the last heartbeat, for staleness filtering. */
  lastSeenAt: number
}

// ---- Constants --------------------------------------------------------------

/** Presence entries older than this are treated as gone (missed closes). */
const PRESENCE_STALE_MS = 2 * 60 * 1000

// ---- Internal helpers -------------------------------------------------------

/** Reads a connection's attachment, tolerating a missing/corrupt one. */
function readConnectionAttachment(connectionWebSocket: WebSocket): ConnectionAttachment | null {
  const attachment: unknown = connectionWebSocket.deserializeAttachment()
  const hasIdentityFields =
    typeof attachment === 'object' &&
    attachment !== null &&
    'userId' in attachment &&
    'displayName' in attachment &&
    'avatarColor' in attachment
  return hasIdentityFields ? (attachment as ConnectionAttachment) : null
}

// ---- Durable Object ---------------------------------------------------------

/**
 * One room per workspace, named by the workspace id (`idFromName`).
 * The Worker is the only caller: it forwards WebSocket upgrades to /connect
 * and mutation notifications to /broadcast.
 */
export class WorkspaceRoom extends DurableObject {
  /**
   * GET /connect — forwards a WebSocket upgrade into the room (identity
   * arrives via trusted internal headers set by the Worker's route; upgrades
   * are GET requests, and workerd delivers stub fetches with an upgrade
   * header as GET even if the caller sent another method).
   * POST /broadcast — relays one validated workspace event to every socket.
   */
  public override async fetch(request: Request): Promise<Response> {
    const roomPath = new URL(request.url).pathname

    if (request.method === 'GET' && roomPath === '/connect') {
      return this.forwardConnection(request)
    }

    if (request.method === 'POST' && roomPath === '/broadcast') {
      return this.relayWorkspaceEvent(request)
    }

    return new Response('Not found', { status: 404 })
  }

  /** Forwards the upgrade request into a room WebSocket with its identity. */
  private forwardConnection(request: Request): Response {
    const isUpgradable = request.headers.get('upgrade') === 'websocket'
    if (!isUpgradable) {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }

    const connectedUserId = request.headers.get('x-ideo-user-id')
    const connectedDisplayName = request.headers.get('x-ideo-user-name')
    const connectedAvatarColor = request.headers.get('x-ideo-user-color')
    const hasIdentity = connectedUserId !== null && connectedDisplayName !== null
    if (!hasIdentity) {
      return new Response('Missing room identity', { status: 403 })
    }

    const pairedWebSocket = new WebSocketPair()
    this.ctx.acceptWebSocket(pairedWebSocket[1])

    const connectionAttachment: ConnectionAttachment = {
      userId: connectedUserId,
      displayName: decodeURIComponent(connectedDisplayName),
      avatarColor: connectedAvatarColor ?? '#0e7490',
      viewingIdeaId: null,
      lastSeenAt: Date.now(),
    }
    pairedWebSocket[1].serializeAttachment(connectionAttachment)

    // The newcomer immediately learns who is already here.
    this.sendToSocket(pairedWebSocket[1], {
      type: 'presence_update',
      viewers: this.collectViewers(),
    })
    // ...and everyone else learns about the newcomer.
    this.broadcastPresenceIfChanged()

    return new Response(null, { status: 101, webSocket: pairedWebSocket[0] })
  }

  /** Relays one workspace event to every connected socket, verbatim. */
  private async relayWorkspaceEvent(request: Request): Promise<Response> {
    const parsedEvent = parseServerRealtimeMessage(await request.json().catch(() => undefined))
    const isWorkspaceEvent = parsedEvent !== null && parsedEvent.type === 'workspace_event'
    if (!isWorkspaceEvent) {
      return new Response('Invalid broadcast body', { status: 400 })
    }

    const eventMessage: WorkspaceEventMessage = parsedEvent
    for (const connectionWebSocket of this.ctx.getWebSockets()) {
      this.sendToSocket(connectionWebSocket, eventMessage)
    }
    return new Response(null, { status: 204 })
  }

  /** Presence heartbeats: update this tab's view state and re-snapshot. */
  public override webSocketMessage(
    connectionWebSocket: WebSocket,
    rawMessage: string | ArrayBuffer,
  ): void {
    const isTextMessage = typeof rawMessage === 'string'
    if (!isTextMessage) return

    const presenceMessage = parseClientRealtimeMessage(JSON.parse(rawMessage))
    if (presenceMessage === null || presenceMessage.type !== 'presence') return

    const connectionAttachment = readConnectionAttachment(connectionWebSocket)
    if (connectionAttachment === null) return

    connectionAttachment.viewingIdeaId = presenceMessage.viewingIdeaId
    connectionAttachment.lastSeenAt = Date.now()
    connectionWebSocket.serializeAttachment(connectionAttachment)

    this.broadcastPresenceIfChanged()
  }

  /** A tab left (or its connection died): drop it and re-snapshot. */
  public override webSocketClose(connectionWebSocket: WebSocket): void {
    connectionWebSocket.serializeAttachment(null)
    this.broadcastPresenceIfChanged()
  }

  public override webSocketError(connectionWebSocket: WebSocket): void {
    connectionWebSocket.serializeAttachment(null)
    this.broadcastPresenceIfChanged()
  }

  // ---- Presence snapshotting --------------------------------------------------

  /**
   * Builds the viewer list from live connections: stale entries (no heartbeat
   * within the TTL) are dropped, and a user with several tabs appears once,
   * preferring a tab that is looking at an idea.
   * Returns the viewers, newest heartbeat first.
   */
  private collectViewers(): WorkspaceViewer[] {
    const viewersPerUser = new Map<string, WorkspaceViewer>()

    for (const connectionWebSocket of this.ctx.getWebSockets()) {
      const connectionAttachment = readConnectionAttachment(connectionWebSocket)
      if (connectionAttachment === null) continue

      const isStaleConnection = Date.now() - connectionAttachment.lastSeenAt > PRESENCE_STALE_MS
      if (isStaleConnection) continue

      const knownViewer = viewersPerUser.get(connectionAttachment.userId)
      const prefersThisConnection =
        knownViewer === undefined ||
        (knownViewer.viewingIdeaId === null && connectionAttachment.viewingIdeaId !== null)
      if (prefersThisConnection) {
        viewersPerUser.set(connectionAttachment.userId, {
          userId: connectionAttachment.userId,
          displayName: connectionAttachment.displayName,
          avatarColor: connectionAttachment.avatarColor,
          viewingIdeaId: connectionAttachment.viewingIdeaId,
        })
      }
    }

    return [...viewersPerUser.values()]
  }

  /**
   * Sends the current snapshot to everyone — but only when it actually
   * differs from the last one sent, so heartbeats never spam the room.
   */
  private broadcastPresenceIfChanged(): void {
    const viewers = this.collectViewers()
    const snapshotJson = JSON.stringify({
      type: 'presence_update',
      viewers,
    } satisfies ServerRealtimeMessage)
    if (snapshotJson === this.lastPresenceSnapshotJson) return
    this.lastPresenceSnapshotJson = snapshotJson

    for (const connectionWebSocket of this.ctx.getWebSockets()) {
      this.sendToSocket(connectionWebSocket, snapshotJson)
    }
  }

  /** The last snapshot JSON sent room-wide (dedupes heartbeat broadcasts). */
  private lastPresenceSnapshotJson: string | null = null

  /** Sends to one socket, ignoring failures from dying connections. */
  private sendToSocket(
    connectionWebSocket: WebSocket,
    message: ServerRealtimeMessage | string,
  ): void {
    try {
      connectionWebSocket.send(typeof message === 'string' ? message : JSON.stringify(message))
    } catch {
      // A closing socket raced the send; its close/error handler cleans up.
    }
  }
}
