// =============================================================================
// FILE:    apps/worker/src/database/idea-list-cursor.ts
// PURPOSE: Encodes and decodes the opaque pagination cursors for the idea
//          list. Keyset cursors (newest sort) carry the last row's timestamp
//          and id; offset cursors (vote/ICE sorts) carry a row offset. The
//          format is server-private; clients echo the string back verbatim.
// USED BY: database/idea-queries.ts (list), routes/idea-routes.ts
// =============================================================================

// ---- Types ------------------------------------------------------------------

/** What a decoded cursor tells the list query. */
export type IdeaListCursor =
  | { kind: 'keyset'; lastCreatedAt: string; lastIdeaId: string }
  | { kind: 'offset'; rowOffset: number }

// ---- Pure functions ---------------------------------------------------------

/**
 * Encodes a keyset cursor (for the "newest" sort).
 * Returns an opaque string safe to hand to clients.
 */
export function encodeKeysetCursor(lastCreatedAt: string, lastIdeaId: string): string {
  return Buffer.from(JSON.stringify({ k: 'keyset', t: lastCreatedAt, i: lastIdeaId }), 'utf8').toString('base64url')
}

/**
 * Encodes an offset cursor (for the "most voted" and "best ICE" sorts).
 * Returns an opaque string safe to hand to clients.
 */
export function encodeOffsetCursor(rowOffset: number): string {
  return Buffer.from(JSON.stringify({ k: 'offset', o: rowOffset }), 'utf8').toString('base64url')
}

/**
 * Decodes a client-echoed cursor.
 * Returns the parsed cursor, or null when absent or malformed (malformed
 * cursors simply restart the list — never a 500).
 */
export function decodeIdeaListCursor(cursorText: string | undefined): IdeaListCursor | null {
  if (cursorText === undefined) return null

  try {
    const parsedRecord = JSON.parse(Buffer.from(cursorText, 'base64url').toString('utf8')) as Record<string, unknown>

    const isKeysetCursor =
      parsedRecord.k === 'keyset' && typeof parsedRecord.t === 'string' && typeof parsedRecord.i === 'string'
    if (isKeysetCursor) {
      return { kind: 'keyset', lastCreatedAt: parsedRecord.t as string, lastIdeaId: parsedRecord.i as string }
    }

    const isOffsetCursor =
      parsedRecord.k === 'offset' &&
      typeof parsedRecord.o === 'number' &&
      Number.isInteger(parsedRecord.o) &&
      parsedRecord.o >= 0
    if (isOffsetCursor) {
      return { kind: 'offset', rowOffset: parsedRecord.o as number }
    }

    return null
  } catch {
    return null
  }
}
