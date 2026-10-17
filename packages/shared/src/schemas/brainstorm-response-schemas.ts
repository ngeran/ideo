// =============================================================================
// FILE:    packages/shared/src/schemas/brainstorm-response-schemas.ts
// PURPOSE: Zod schemas describing brainstorm-session responses: list, detail
//          (session + its sparks), and the small mutation bodies. Sparks are
//          ordinary ideas and reuse the idea response schema, so the
//          server's anonymity rules apply unchanged.
// USED BY: packages/shared/src/index.ts, worker routes, web api client
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { ideaResponseSchema } from './idea-response-schemas'

// ---- Validation schemas -----------------------------------------------------

/** The session creator's person fields (sessions have no anonymity rule). */
const sessionCreatorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
})

/** One brainstorm session, as the list and detail render it. */
export const brainstormSessionResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  topic: z.string(),
  durationSeconds: z.number().int(),
  isAnonymousUntilEnd: z.boolean(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  createdBy: sessionCreatorSchema,
  sparkCount: z.number().int(),
  createdAt: z.string(),
})

/** Page of sessions plus the cursor for the next page (null when done). */
export const brainstormListResponseSchema = z.object({
  sessions: z.array(brainstormSessionResponseSchema),
  nextCursor: z.string().nullable(),
})

/** GET /api/brainstorm-sessions/:sessionId — the session plus its sparks. */
export const brainstormSessionDetailResponseSchema = z.object({
  session: brainstormSessionResponseSchema,
  sparks: z.array(ideaResponseSchema),
})

// ---- Types ------------------------------------------------------------------
export type BrainstormSessionResponse = z.infer<typeof brainstormSessionResponseSchema>
export type BrainstormListResponse = z.infer<typeof brainstormListResponseSchema>
export type BrainstormSessionDetailResponse = z.infer<typeof brainstormSessionDetailResponseSchema>
