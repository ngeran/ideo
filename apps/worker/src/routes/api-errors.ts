// =============================================================================
// FILE:    apps/worker/src/routes/api-errors.ts
// PURPOSE: The one error type routes and services throw, and the handler that
//          turns it into a consistent JSON body: { error: { code, message } }.
//          Unexpected errors log server-side and answer 500 without leaking
//          internals.
// USED BY: create-application.ts (onError), all routes and services
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// ---- Types ------------------------------------------------------------------

/** Machine-readable error codes the web client can branch on. */
export type ApiErrorCode =
  | 'AUTHENTICATION_REQUIRED' // 401 — no or invalid identity
  | 'WORKSPACE_ACCESS_DENIED' // 403/404 — not a member, or no such workspace
  | 'INVITE_NOT_FOUND' // 404 — unknown invite code
  | 'INVITE_EXPIRED' // 410 — invite existed but is past expiry
  | 'INVITE_EXHAUSTED' // 409 — invite used up
  | 'VALIDATION_FAILED' // 422 — body/query/params failed their schema

// ---- Classes ----------------------------------------------------------------

/**
 * An error with an HTTP status and machine-readable code.
 * Throw it anywhere in a route or service; the error handler renders it.
 */
export class ApiError extends Error {
  readonly statusCode: ContentfulStatusCode
  readonly errorCode: ApiErrorCode

  constructor(statusCode: ContentfulStatusCode, errorCode: ApiErrorCode, message: string) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

// ---- Factories --------------------------------------------------------------

/** 401 — the request has no usable identity. */
export function authenticationRequiredError(): ApiError {
  return new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.')
}

/**
 * 404 — the workspace does not exist or the caller is not a member.
 * One answer for both cases so outsiders cannot probe workspace ids.
 */
export function workspaceAccessDeniedError(): ApiError {
  return new ApiError(404, 'WORKSPACE_ACCESS_DENIED', 'Workspace not found.')
}

/** 404 — nobody issued this invite code. */
export function inviteNotFoundError(): ApiError {
  return new ApiError(404, 'INVITE_NOT_FOUND', 'That invite code does not exist.')
}

/** 410 — the invite was real but has expired. */
export function inviteExpiredError(): ApiError {
  return new ApiError(410, 'INVITE_EXPIRED', 'That invite has expired. Ask for a new one.')
}

/** 409 — the invite was real but has no uses left. */
export function inviteExhaustedError(): ApiError {
  return new ApiError(409, 'INVITE_EXHAUSTED', 'That invite has no uses left. Ask for a new one.')
}

/** 422 — a body, query string, or parameter failed validation. */
export function validationFailedError(details: string): ApiError {
  return new ApiError(422, 'VALIDATION_FAILED', details)
}
