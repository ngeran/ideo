// =============================================================================
// FILE:    packages/shared/src/schemas/idea-request-schemas.ts
// PURPOSE: Zod schemas for every idea-related request: list query, create,
//          update, and comment. Used by the Worker routes and the web forms.
// USED BY: packages/shared/src/index.ts, worker idea routes, web idea forms
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { ENTITY_LIMITS } from '../constants/entity-limits'
import { IDEA_STAGE_VALUES } from '../constants/pipeline-stages'
import { cursorPaginationQuerySchema } from './common-request-schemas'

// ---- Validation schemas -----------------------------------------------------

/** How the board is ordered. */
export const IDEA_SORT_VALUES = ['newest', 'most_voted', 'best_ice'] as const
export type IdeaSort = (typeof IDEA_SORT_VALUES)[number]

/** One normalized tag: trimmed, lowercased, no separators overflow. */
const ideaTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(ENTITY_LIMITS.ideaTag)

/** Query string of GET /api/workspaces/:workspaceId/ideas. */
export const ideaListQuerySchema = cursorPaginationQuerySchema.extend({
  stage: z.enum(IDEA_STAGE_VALUES).optional(),
  sort: z.enum(IDEA_SORT_VALUES).default('newest'),
})

/** Body of POST /api/workspaces/:workspaceId/ideas. */
export const createIdeaRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the idea a title.')
    .max(ENTITY_LIMITS.ideaTitle, `Titles are at most ${ENTITY_LIMITS.ideaTitle} characters.`),
  description: z.string().trim().max(ENTITY_LIMITS.ideaDescription).default(''),
  tags: z.array(ideaTagSchema).max(ENTITY_LIMITS.ideaTagsPerIdea).default([]),
})

/** Body of PATCH /api/ideas/:ideaId — everything is optional, tags replace. */
export const updateIdeaRequestSchema = z
  .object({
    title: createIdeaRequestSchema.shape.title.optional(),
    description: z.string().trim().max(ENTITY_LIMITS.ideaDescription).optional(),
    stage: z.enum(IDEA_STAGE_VALUES).optional(),
    impactScore: z.number().int().min(1).max(10).nullable().optional(),
    confidenceScore: z.number().int().min(1).max(10).nullable().optional(),
    easeScore: z.number().int().min(1).max(10).nullable().optional(),
    tags: z.array(ideaTagSchema).max(ENTITY_LIMITS.ideaTagsPerIdea).optional(),
  })
  .refine((updateFields) => Object.keys(updateFields).length > 0, {
    message: 'Send at least one field to update.',
  })

/** Body of POST /api/ideas/:ideaId/comments. */
export const createIdeaCommentRequestSchema = z.object({
  commentText: z
    .string()
    .trim()
    .min(1, 'Write a comment first.')
    .max(ENTITY_LIMITS.commentText, `Comments are at most ${ENTITY_LIMITS.commentText} characters.`),
})

// ---- Types ------------------------------------------------------------------
export type IdeaSortValue = (typeof IDEA_SORT_VALUES)[number]
export type IdeaListQuery = z.infer<typeof ideaListQuerySchema>
export type CreateIdeaRequest = z.infer<typeof createIdeaRequestSchema>
export type UpdateIdeaRequest = z.infer<typeof updateIdeaRequestSchema>
export type CreateIdeaCommentRequest = z.infer<typeof createIdeaCommentRequestSchema>
