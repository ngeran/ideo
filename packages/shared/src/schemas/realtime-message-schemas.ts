// =============================================================================
// FILE:    packages/shared/src/schemas/realtime-message-schemas.ts
// PURPOSE: Zod schemas for every WebSocket message in a workspace room: the
//          tiny workspace events broadcast after idea mutations, and the
//          presence snapshots ("who is looking right now"). Both sides parse
//          with the same schemas, so a drifted client or server fails loudly.
// USED BY: packages/shared/src/index.ts, worker WorkspaceRoom, web use-workspace-room
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'

// ---- Validation schemas -----------------------------------------------------

/** What happened on the board; `subjectId` is the idea it happened to. */
export const WORKSPACE_EVENT_TYPES = [
  'idea_created',
  'idea_updated',
  'idea_voted',
  'idea_commented',
] as const
export type WorkspaceEventType = (typeof WORKSPACE_EVENT_TYPES)[number]

/** Server → client: a tiny "something changed" nudge (never the payload). */
export const workspaceEventMessageSchema = z.object({
  type: z.literal('workspace_event'),
  eventType: z.enum(WORKSPACE_EVENT_TYPES),
  subjectId: z.string(),
})

/** One person currently in the room; `viewingIdeaId` is null on the board. */
export const workspaceViewerSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
  viewingIdeaId: z.string().nullable(),
})

/** Server → client: the full viewer snapshot, sent only when it changes. */
export const presenceUpdateMessageSchema = z.object({
  type: z.literal('presence_update'),
  viewers: z.array(workspaceViewerSchema),
})

/** Client → server: presence heartbeat and "which idea am I looking at". */
export const workspacePresenceMessageSchema = z.object({
  type: z.literal('presence'),
  viewingIdeaId: z.string().nullable(),
})

/** Any message the server sends to a client (a discriminated union). */
export const serverRealtimeMessageSchema = z.discriminatedUnion('type', [
  workspaceEventMessageSchema,
  presenceUpdateMessageSchema,
])

/** Any message the client may send to the server (a discriminated union). */
export const clientRealtimeMessageSchema = z.discriminatedUnion('type', [
  workspacePresenceMessageSchema,
])

// ---- Parsers ----------------------------------------------------------------

/**
 * Parses one raw decoded WebSocket message from the server.
 * Returns the typed message, or null for anything malformed (a client must
 * never crash on a bad frame — it just ignores it).
 */
export function parseServerRealtimeMessage(rawMessage: unknown): ServerRealtimeMessage | null {
  const parsedMessage = serverRealtimeMessageSchema.safeParse(rawMessage)
  return parsedMessage.success ? parsedMessage.data : null
}

/**
 * Parses one raw decoded WebSocket message from a client.
 * Returns the typed message, or null for anything malformed.
 */
export function parseClientRealtimeMessage(rawMessage: unknown): WorkspacePresenceMessage | null {
  const parsedMessage = clientRealtimeMessageSchema.safeParse(rawMessage)
  return parsedMessage.success ? parsedMessage.data : null
}

// ---- Types ------------------------------------------------------------------
export type WorkspaceEventMessage = z.infer<typeof workspaceEventMessageSchema>
export type WorkspaceViewer = z.infer<typeof workspaceViewerSchema>
export type PresenceUpdateMessage = z.infer<typeof presenceUpdateMessageSchema>
export type WorkspacePresenceMessage = z.infer<typeof workspacePresenceMessageSchema>
export type ServerRealtimeMessage = z.infer<typeof serverRealtimeMessageSchema>
export type ClientRealtimeMessage = z.infer<typeof clientRealtimeMessageSchema>
