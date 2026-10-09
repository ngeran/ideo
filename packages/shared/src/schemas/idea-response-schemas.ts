// =============================================================================
// FILE:    packages/shared/src/schemas/idea-response-schemas.ts
// PURPOSE: Zod schemas describing every idea-related response body: list,
//          detail (with comments), and the author-anonymity rules — anonymous
//          ideas expose no author to anyone but their author.
// USED BY: packages/shared/src/index.ts, worker routes, web api client
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { IDEA_STAGE_VALUES } from '../constants/pipeline-stages'

// ---- Validation schemas -----------------------------------------------------

/**
 * The author fields on an idea. Null when the idea is anonymous and the
 * reader is not its author (the server decides; the schema only documents it).
 */
const ideaAuthorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
})

/** One idea as it appears on the board. */
export const ideaResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  description: z.string(),
  stage: z.enum(IDEA_STAGE_VALUES),
  impactScore: z.number().int().min(1).max(10).nullable(),
  confidenceScore: z.number().int().min(1).max(10).nullable(),
  easeScore: z.number().int().min(1).max(10).nullable(),
  /** Mean of the three scores, one decimal; null until all three are set. */
  iceScore: z.number().nullable(),
  tags: z.array(z.string()),
  voteCount: z.number().int(),
  hasVotedByCurrentUser: z.boolean(),
  isAnonymous: z.boolean(),
  author: ideaAuthorSchema.nullable(),
  commentCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Page of ideas plus the cursor for the next page (null when done). */
export const ideaListResponseSchema = z.object({
  ideas: z.array(ideaResponseSchema),
  nextCursor: z.string().nullable(),
})

/** One comment on an idea. */
export const ideaCommentResponseSchema = z.object({
  id: z.string(),
  commentText: z.string(),
  author: ideaAuthorSchema,
  createdAt: z.string(),
})

/** GET /api/ideas/:ideaId — the idea plus its comments, oldest first. */
export const ideaDetailResponseSchema = z.object({
  idea: ideaResponseSchema,
  comments: z.array(ideaCommentResponseSchema),
})

// ---- Types ------------------------------------------------------------------
export type IdeaAuthorResponse = z.infer<typeof ideaAuthorSchema>
export type IdeaResponse = z.infer<typeof ideaResponseSchema>
export type IdeaListResponse = z.infer<typeof ideaListResponseSchema>
export type IdeaCommentResponse = z.infer<typeof ideaCommentResponseSchema>
export type IdeaDetailResponse = z.infer<typeof ideaDetailResponseSchema>
