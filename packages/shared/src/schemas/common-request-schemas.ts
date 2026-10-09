// =============================================================================
// FILE:    packages/shared/src/schemas/common-request-schemas.ts
// PURPOSE: Zod schemas reused by several endpoints (cursor pagination today,
//          more as the API grows). Defined once so the Worker's validation and
//          the web app's request building cannot disagree.
// USED BY: packages/shared/src/index.ts, worker route files, web api client
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAXIMUM } from '../constants/pagination-limits'

// ---- Validation schemas -----------------------------------------------------

/**
 * Cursor pagination query string, e.g. `?cursor=<opaque>&limit=30`.
 * The cursor is opaque on purpose: clients echo it back verbatim and only the
 * server knows what it encodes, so the format can change without a client
 * release. `limit` is coerced because query strings are always text.
 */
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAXIMUM).default(PAGE_SIZE_DEFAULT),
})

/** Parsed cursor pagination query, ready for the query functions. */
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>
