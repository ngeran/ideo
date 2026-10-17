// =============================================================================
// FILE:    apps/web/src/features/plans/hooks/use-plan-notes.ts
// PURPOSE: The collaborative notes plumbing for one plan: a Yjs document
//          synced over the plan document room WebSocket, mirrored to
//          IndexedDB so offline edits survive and merge on return, plus the
//          awareness-derived "N people editing" count.
// USED BY: plan-notes.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { useCurrentUser } from '../../workspaces/hooks/use-current-user'

// ---- Types ------------------------------------------------------------------

/** What the notes editor needs to collaborate. */
export type PlanNotesConnection = {
  yjsDocument: Y.Doc
  websocketProvider: WebsocketProvider
  /** Other people currently editing (self excluded). */
  editorCount: number
  /** True while the room socket is connected. */
  isConnected: boolean
}

// ---- Constants --------------------------------------------------------------

/** IndexedDB keeps per-plan offline copies; the name must be stable per plan. */
function offlineDatabaseName(planId: string): string {
  return `ideo-plan-notes-${planId}`
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Opens the notes document for a plan: IndexedDB first (instant, offline),
 * then the room socket for live sync. Returns the document, provider, live
 * editor count, and connection state. Tears everything down on unmount.
 */
export function usePlanNotes(planId: string): PlanNotesConnection {
  const currentUserQuery = useCurrentUser()
  const currentUser = currentUserQuery.data?.user

  // One document per plan for the page's lifetime.
  const yjsDocument = useMemo(() => new Y.Doc(), [])
  const websocketProvider = useMemo(() => {
    const roomUrlProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const roomUrl = `${roomUrlProtocol}//${window.location.host}/ws/plans`
    return new WebsocketProvider(roomUrl, `${planId}/document`, yjsDocument, {
      connect: true,
    })
  }, [planId, yjsDocument])

  // Offline copies in IndexedDB: edits made while disconnected merge on return.
  const offlinePersistence = useMemo(
    () => new IndexeddbPersistence(offlineDatabaseName(planId), yjsDocument),
    [planId, yjsDocument],
  )

  const [editorCount, setEditorCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  // Announce who is editing (drives the CollaborationCaret name tags).
  useEffect(() => {
    if (currentUser === undefined) return
    websocketProvider.awareness.setLocalStateField('user', {
      name: currentUser.displayName,
      color: currentUser.avatarColor,
    })
    return () => {
      websocketProvider.awareness.setLocalStateField('user', null)
    }
  }, [websocketProvider, currentUser])

  // Count the other editors whenever awareness changes.
  useEffect(() => {
    function recountEditors() {
      const ownClientId = websocketProvider.awareness.clientID
      const remoteStates = [...websocketProvider.awareness.getStates().entries()].filter(
        ([clientId, awarenessState]) =>
          clientId !== ownClientId && awarenessState !== null && 'user' in awarenessState,
      )
      setEditorCount(remoteStates.length)
    }

    recountEditors()
    websocketProvider.awareness.on('change', recountEditors)
    return () => {
      websocketProvider.awareness.off('change', recountEditors)
    }
  }, [websocketProvider])

  // Track the socket status for the "N people editing" hint's reliability.
  useEffect(() => {
    function handleStatusChange(statusEvent: { status: string }) {
      setIsConnected(statusEvent.status === 'connected')
    }
    websocketProvider.on('status', handleStatusChange)
    return () => {
      websocketProvider.off('status', handleStatusChange)
    }
  }, [websocketProvider])

  // Tear the providers and document down with the page.
  useEffect(() => {
    return () => {
      websocketProvider.destroy()
      offlinePersistence.destroy()
      yjsDocument.destroy()
    }
  }, [websocketProvider, offlinePersistence, yjsDocument])

  return { yjsDocument, websocketProvider, editorCount, isConnected }
}
