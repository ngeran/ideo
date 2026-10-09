// =============================================================================
// FILE:    packages/shared/src/constants/pagination-limits.ts
// PURPOSE: Page sizes for every list endpoint. Pagination is mandatory on the
//          D1 free tier: unbounded lists would burn row-read limits and slow
//          responses as a workspace grows.
// USED BY: packages/shared/src/index.ts, cursorPaginationQuerySchema, list routes
// =============================================================================

// ---- Constants --------------------------------------------------------------

/** Page size used when a request does not ask for one. */
export const PAGE_SIZE_DEFAULT = 30

/** Largest page size a client may request; bigger values are clamped. */
export const PAGE_SIZE_MAXIMUM = 100
