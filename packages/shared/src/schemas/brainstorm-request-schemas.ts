// =============================================================================
// FILE:    packages/shared/src/schemas/brainstorm-request-schemas.ts
// PURPOSE: Zod schemas for every brainstorm-session request: create, list,
//          and add a spark. Used by the Worker routes and the web forms.
// USED BY: packages/shared/src/index.ts, worker brainstorm routes, web forms
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { ENTITY_LIMITS } from '../constants/entity-limits'
import { cursorPaginationQuerySchema } from './common-request-schemas'

// ---- Validation schemas -----------------------------------------------------

/** Session lengths, in seconds: short bursts, never marathons. */
export const BRAINSTORM_DURATION_MINIMUM = 60
export const BRAINSTORM_DURATION_MAXIMUM = 3600
export const BRAINSTORM_DURATION_DEFAULT = 600

/** Body of POST /api/workspaces/:workspaceId/brainstorm-sessions. */
export const createBrainstormSessionRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, 'Give the session a topic.')
    .max(
      ENTITY_LIMITS.brainstormTopic,
      `Topics are at most ${ENTITY_LIMITS.brainstormTopic} characters.`,
    ),
  durationSeconds: z.coerce
    .number()
    .int()
    .min(BRAINSTORM_DURATION_MINIMUM, 'Sessions last at least one minute.')
    .max(BRAINSTORM_DURATION_MAXIMUM, 'Sessions last at most one hour.')
    .default(BRAINSTORM_DURATION_DEFAULT),
  isAnonymousUntilEnd: z.boolean().default(true),
})

/** Query string of GET /api/workspaces/:workspaceId/brainstorm-sessions. */
export const brainstormListQuerySchema = cursorPaginationQuerySchema

/** Body of POST /api/brainstorm-sessions/:sessionId/sparks. */
export const addSessionSparkRequestSchema = z.object({
  sparkText: z
    .string()
    .trim()
    .min(1, 'Write the spark first.')
    .max(ENTITY_LIMITS.ideaTitle, `Sparks are at most ${ENTITY_LIMITS.ideaTitle} characters.`),
})

// ---- Types ------------------------------------------------------------------
export type CreateBrainstormSessionRequest = z.infer<typeof createBrainstormSessionRequestSchema>
export type BrainstormListQuery = z.infer<typeof brainstormListQuerySchema>
export type AddSessionSparkRequest = z.infer<typeof addSessionSparkRequestSchema>
