// =============================================================================
// FILE:    packages/shared/src/schemas/brainstorm-mutation-response-schemas.ts
// PURPOSE: Small response bodies for brainstorm mutations (create, start,
//          end, spark). Kept with the other session schemas so the client and
//          server agree on every shape.
// USED BY: packages/shared/src/index.ts, worker routes, web api client
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'

// ---- Validation schemas -----------------------------------------------------

/** Body of POST /api/workspaces/:workspaceId/brainstorm-sessions. */
export const sessionCreatedResponseSchema = z.object({
  session: z.object({ sessionId: z.string(), topic: z.string() }),
})

/** Body of POST /api/brainstorm-sessions/:sessionId/start. */
export const sessionStartedResponseSchema = z.object({ ok: z.boolean() })

/** Body of POST /api/brainstorm-sessions/:sessionId/end. */
export const sessionEndedResponseSchema = z.object({ ok: z.boolean() })

/** Body of POST /api/brainstorm-sessions/:sessionId/sparks. */
export const sparkAddedResponseSchema = z.object({
  spark: z.object({ ideaId: z.string() }),
})

// ---- Types ------------------------------------------------------------------
export type SessionCreatedResponse = z.infer<typeof sessionCreatedResponseSchema>
export type SparkAddedResponse = z.infer<typeof sparkAddedResponseSchema>
