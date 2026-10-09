// =============================================================================
// FILE:    apps/web/src/shared/lib/api-client.ts
// PURPOSE: The one fetch wrapper for the Ideo API: sends JSON, parses the
//          response with the shared Zod schemas, and turns every failure into
//          an ApiRequestError the UI can show.
// USED BY: features/*/api/*.ts (the only place raw fetch is allowed)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ZodType } from 'zod'

// ---- Types ------------------------------------------------------------------

/** The error shape the Worker sends for every failure. */
type ApiErrorBody = {
  error: {
    code: string
    message: string
  }
}

/** A failed API call, ready for toasts and inline messages. */
export class ApiRequestError extends Error {
  readonly statusCode: number
  readonly errorCode: string

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

// ---- Types ------------------------------------------------------------------

export type ApiRequestOptions<ResponseBody> = {
  method: 'GET' | 'POST'
  /** JSON body; omitted for GET requests. */
  requestBody?: unknown
  /** The shared Zod schema the response must satisfy. */
  responseSchema: ZodType<ResponseBody>
}

// ---- Requests ---------------------------------------------------------------

/**
 * Sends a JSON request to the API and validates the response.
 * Returns the parsed response body. Throws ApiRequestError with the server's
 * code and message for any non-2xx answer, and for responses that fail their
 * schema (which would mean client and server disagree about the world).
 */
export async function requestFromApi<ResponseBody>(
  apiPath: string,
  requestOptions: ApiRequestOptions<ResponseBody>,
): Promise<ResponseBody> {
  const { method, requestBody, responseSchema } = requestOptions

  let httpResponse: Response
  try {
    httpResponse = await fetch(apiPath, {
      method,
      headers: requestBody === undefined ? undefined : { 'content-type': 'application/json' },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    })
  } catch {
    throw new ApiRequestError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection.',
    )
  }

  const rawBody: unknown = await httpResponse.json().catch(() => undefined)

  const isSuccessfulResponse = httpResponse.ok
  if (!isSuccessfulResponse) {
    const errorBody = rawBody as ApiErrorBody | undefined
    throw new ApiRequestError(
      httpResponse.status,
      errorBody?.error.code ?? 'UNKNOWN_ERROR',
      errorBody?.error.message ?? 'Something went wrong. Try again.',
    )
  }

  const parsedResponse = responseSchema.safeParse(rawBody)
  if (!parsedResponse.success) {
    throw new ApiRequestError(
      httpResponse.status,
      'INVALID_RESPONSE',
      'The server sent an unexpected answer.',
    )
  }

  return parsedResponse.data
}
