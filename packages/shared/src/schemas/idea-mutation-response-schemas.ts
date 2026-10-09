// =============================================================================
// FILE:    packages/shared/src/schemas/idea-mutation-response-schemas.ts
// PURPOSE: Small response bodies for idea mutations (create, update ack,
//          vote toggle, comment). Kept with the other idea schemas so the
//          client and server agree on every shape.
// USED BY: packages/shared/src/index.ts, worker idea routes, web idea api
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'

// ---- Validation schemas -----------------------------------------------------

/** Body of POST /api/workspaces/:workspaceId/ideas. */
export const ideaCreatedResponseSchema = z.object({
  idea: z.object({ ideaId: z.string(), title: z.string(), stage: z.string() }),
})

/** Body of PATCH /api/ideas/:ideaId. */
export const ideaUpdatedResponseSchema = z.object({ ok: z.boolean() })

/** Body of POST /api/ideas/:ideaId/vote. */
export const ideaVoteToggledResponseSchema = z.object({ isVotedByCurrentUser: z.boolean() })

/** Body of POST /api/ideas/:ideaId/comments. */
export const ideaCommentCreatedResponseSchema = z.object({ commentId: z.string() })

// ---- Types ------------------------------------------------------------------
export type IdeaCreatedResponse = z.infer<typeof ideaCreatedResponseSchema>
export type IdeaVoteToggledResponse = z.infer<typeof ideaVoteToggledResponseSchema>
