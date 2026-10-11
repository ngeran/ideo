// =============================================================================
// FILE:    apps/web/src/features/workspaces/hooks/use-workspace-room.ts
// PURPOSE: The one live connection per selected workspace: opens the room
//          WebSocket, turns server nudges into query-cache invalidations, and
//          tracks presence ("who is looking right now"). Reconnects with a
//          capped backoff and heartbeats slower than the server's stale TTL.
// USED BY: idea-board-page.tsx (and later phases' pages)
// =============================================================================

import type { WorkspaceViewer } from '@ideo/shared'
import { parseServerRealtimeMessage } from '@ideo/shared'
import { useQueryClient } from '@tanstack/react-query'
// ---- Imports ----------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react'

// ---- Types ------------------------------------------------------------------

/** What the room hook exposes to pages. */
export type WorkspaceRoomConnection = {
  /** Everyone currently in the room, including the current user. */
  viewers: WorkspaceViewer[]
  /** True while the socket is open (drives a small status hint). */
  isConnected: boolean
  /** Tells the room which idea this tab is looking at (null = the board). */
  sendViewing: (viewingIdeaId: string | null) => void
}

// ---- Constants --------------------------------------------------------------

/** Heartbeat cadence; must stay well under the room's stale-presence TTL. */
const PRESENCE_HEARTBEAT_MS = 45_000

/** Reconnect backoff: doubles per failure, capped. */
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAXIMUM_MS = 30_000

// ---- Hooks ------------------------------------------------------------------

/**
 * Opens the workspace room for the given workspace (null = not connected).
 * Returns the viewer list, connection state, and the view-state sender.
 */
export function useWorkspaceRoom(workspaceId: string | null): WorkspaceRoomConnection {
  const queryClient = useQueryClient()

  const [viewers, setViewers] = useState<WorkspaceViewer[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Refs keep the socket, timers, and the latest view state stable across
  // renders so the effect only ever re-runs when the workspace changes.
  const roomSocketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const viewingIdeaIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (workspaceId === null) return

    const queryCache = queryClient
    let isClosedByCleanup = false

    /** Sends the current view state if the socket is open. */
    function sendCurrentPresence() {
      const roomSocket = roomSocketRef.current
      if (roomSocket === null || roomSocket.readyState !== WebSocket.OPEN) return
      roomSocket.send(JSON.stringify({ type: 'presence', viewingIdeaId: viewingIdeaIdRef.current }))
    }

    function scheduleReconnect() {
      if (isClosedByCleanup) return
      const backoffDelay = Math.min(
        RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
        RECONNECT_MAXIMUM_MS,
      )
      reconnectTimeoutRef.current = window.setTimeout(openRoom, backoffDelay)
    }

    function handleRoomMessage(messageEvent: MessageEvent) {
      const serverMessage = parseServerRealtimeMessage(
        JSON.parse(typeof messageEvent.data === 'string' ? messageEvent.data : 'null'),
      )
      if (serverMessage === null) return

      if (serverMessage.type === 'workspace_event') {
        // The nudge carries no payload: refresh the board and that one idea.
        void queryCache.invalidateQueries({ queryKey: ['ideas', workspaceId] })
        void queryCache.invalidateQueries({ queryKey: ['idea', serverMessage.subjectId] })
        return
      }

      setViewers(serverMessage.viewers)
    }

    function openRoom() {
      const roomUrlProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const roomSocket = new WebSocket(
        `${roomUrlProtocol}//${window.location.host}/ws/workspaces/${workspaceId}/room`,
      )
      roomSocketRef.current = roomSocket

      roomSocket.addEventListener('open', () => {
        reconnectAttemptRef.current = 0
        setIsConnected(true)
        sendCurrentPresence()
        heartbeatIntervalRef.current = window.setInterval(
          sendCurrentPresence,
          PRESENCE_HEARTBEAT_MS,
        )
      })

      roomSocket.addEventListener('message', handleRoomMessage)

      roomSocket.addEventListener('close', () => {
        setIsConnected(false)
        if (heartbeatIntervalRef.current !== null) {
          window.clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        roomSocketRef.current = null
        scheduleReconnect()
      })
    }

    openRoom()

    return () => {
      isClosedByCleanup = true
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (heartbeatIntervalRef.current !== null) {
        window.clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      roomSocketRef.current?.close()
      roomSocketRef.current = null
      setViewers([])
      setIsConnected(false)
    }
  }, [workspaceId, queryClient])

  /** Records the view state and pushes it immediately (no round-trip wait). */
  const sendViewing = useCallback((viewingIdeaId: string | null) => {
    viewingIdeaIdRef.current = viewingIdeaId
    const roomSocket = roomSocketRef.current
    if (roomSocket === null || roomSocket.readyState !== WebSocket.OPEN) return
    roomSocket.send(JSON.stringify({ type: 'presence', viewingIdeaId }))
  }, [])

  // Viewers include the current user; pages decide how to present them.
  return { viewers, isConnected, sendViewing }
}
