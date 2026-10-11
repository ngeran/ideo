// =============================================================================
// FILE:    apps/worker/src/realtime/notify-workspace-room.ts
// PURPOSE: The one way a route tells a workspace's room that something
//          changed. Fire-and-forget: a realtime hiccup must never fail the
//          mutation that caused it, so callers run this under waitUntil.
// USED BY: routes/idea-routes.ts (and later phases' mutation routes)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { WorkspaceEventMessage } from '@ideo/shared'
import type { EnvironmentBindings } from '../configuration/environment-bindings'

// ---- Factories --------------------------------------------------------------

/**
 * Posts one workspace event to the room named after the workspace.
 * Returns a promise the caller should hand to `executionCtx.waitUntil`
 * (the response is already on its way by then); failures are logged, not
 * thrown, so realtime is best-effort by construction.
 */
export async function notifyWorkspaceRoom(
  environment: EnvironmentBindings,
  workspaceId: string,
  eventMessage: WorkspaceEventMessage,
): Promise<void> {
  const roomNamespace = environment.WORKSPACE_ROOM
  const roomStub = roomNamespace.get(roomNamespace.idFromName(workspaceId))

  try {
    const roomResponse = await roomStub.fetch('https://room.internal/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(eventMessage),
    })
    if (!roomResponse.ok) {
      console.error(`Room broadcast for workspace ${workspaceId} answered ${roomResponse.status}`)
    }
  } catch (notifyError) {
    console.error(`Room broadcast for workspace ${workspaceId} failed:`, notifyError)
  }
}

// ---- Route helpers ------------------------------------------------------------

/** The slice of the Hono context this helper touches (its getter can throw). */
type RequestContextWithExecution = {
  executionCtx: { waitUntil: (backgroundPromise: Promise<void>) => void }
}

/**
 * The one call site shape for mutation routes: notify the room without ever
 * failing or delaying the response. Uses `waitUntil` when a runtime execution
 * context exists (production), and detaches the promise otherwise (direct
 * `app.request` calls in tests have none).
 */
export function notifyWorkspaceRoomAfterResponse(
  requestContext: RequestContextWithExecution,
  environment: EnvironmentBindings,
  workspaceId: string,
  eventMessage: WorkspaceEventMessage,
): void {
  try {
    requestContext.executionCtx.waitUntil(
      notifyWorkspaceRoom(environment, workspaceId, eventMessage),
    )
  } catch {
    void notifyWorkspaceRoom(environment, workspaceId, eventMessage)
  }
}
