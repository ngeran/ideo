// =============================================================================
// FILE:    apps/web/src/features/plans/components/plan-notes.tsx
// PURPOSE: The plan's shared notes tab: a Tiptap editor bound to the Yjs
//          document (live collaboration via the plan document room, offline
//          via IndexedDB), with an "N people editing" indicator and caret
//          name tags for everyone else.
// USED BY: plan-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import Collaboration from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { mergeComponentClasses } from '../../../shared/lib/merge-component-classes'
import { useCurrentUser } from '../../workspaces/hooks/use-current-user'
import { usePlanNotes } from '../hooks/use-plan-notes'

// ---- Types ------------------------------------------------------------------
type PlanNotesProps = {
  planId: string
}

// ---- Component --------------------------------------------------------------

/** The collaborative notes editor for one plan. */
export function PlanNotes({ planId }: PlanNotesProps) {
  const { yjsDocument, websocketProvider, editorCount, isConnected } = usePlanNotes(planId)
  const currentUser = useCurrentUser().data?.user

  const notesEditor = useEditor(
    {
      // Collaboration brings its own Yjs history; the built-in undo would
      // fight it (and undo other people's writing).
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: yjsDocument }),
        CollaborationCaret.configure({ provider: websocketProvider }),
      ],
    },
    [yjsDocument, websocketProvider],
  )

  // Identity arrives asynchronously; push it into the caret extension (and
  // the shared awareness state) whenever it resolves or changes.
  useEffect(() => {
    if (notesEditor === null || currentUser === undefined) return
    notesEditor.commands.updateUser({
      name: currentUser.displayName,
      color: currentUser.avatarColor,
    })
  }, [notesEditor, currentUser])

  const editorStatusLabel =
    editorCount > 0
      ? `${editorCount} ${editorCount === 1 ? 'person' : 'people'} editing`
      : isConnected
        ? 'Live'
        : 'Offline — edits will sync when you reconnect'

  return (
    <div className="flex flex-col gap-2">
      <p
        className="flex items-center gap-1.5 font-mono text-xs text-muted"
        title={
          isConnected
            ? 'Notes sync live with everyone in this plan.'
            : 'You are offline; notes are saved locally and will merge when you reconnect.'
        }
      >
        <span
          aria-hidden
          className={
            isConnected
              ? 'size-1.5 rounded-full bg-success'
              : 'size-1.5 animate-pulse rounded-full bg-warning'
          }
        />
        {editorStatusLabel}
      </p>

      <div
        className={mergeComponentClasses(
          'rounded-control border border-subtle bg-card p-3',
          // Tiptap's editable surface and its paragraph spacing.
          '[&_.tiptap]:min-h-48 [&_.tiptap]:outline-none',
          '[&_.tiptap_p]:my-1 [&_.tiptap_h2]:mt-3 [&_.tiptap_h2]:text-base [&_.tiptap_h2]:font-semibold',
          '[&_.tiptap_h3]:mt-2 [&_.tiptap_h3]:font-semibold [&_.tiptap_ul]:my-1 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5',
          '[&_.tiptap_ol]:my-1 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5',
          '[&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:border-subtle [&_.tiptap_blockquote]:pl-3 [&_.tiptap_blockquote]:text-muted',
        )}
      >
        <EditorContent editor={notesEditor} aria-label="Plan notes" />
      </div>
    </div>
  )
}
