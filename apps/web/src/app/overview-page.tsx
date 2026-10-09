// =============================================================================
// FILE:    apps/web/src/app/overview-page.tsx
// PURPOSE: The '/' landing page: greets the team and shows the idea-to-reality
//          pipeline (the product's spine) so the model is obvious from day one.
// USED BY: app/application-router.tsx (overview route)
// =============================================================================

import type { IdeaStage } from '@ideo/shared'
import { IDEA_STAGE_VALUES } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { ArrowRight } from 'lucide-react'
import { StageBadge } from '../shared/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../shared/components/ui/card'

// ---- Component helpers ------------------------------------------------------

/** One pipeline stage chip with an arrow to the next stage. */
function PipelineStep({ stage, isLastStage }: { stage: IdeaStage; isLastStage: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <StageBadge stage={stage} />
      {!isLastStage ? <ArrowRight className="size-3.5 text-muted" aria-hidden /> : null}
    </li>
  )
}

// ---- Component --------------------------------------------------------------

/** Overview landing page. */
export function OverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Ideo</CardTitle>
          <CardDescription>
            A private space for your team's ideas — from first spark to launched. The design system,
            themes, and app shell are live; features arrive phase by phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2 font-mono text-xs text-muted">THE PIPELINE</p>
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {IDEA_STAGE_VALUES.map((stage, stageIndex) => (
              <PipelineStep
                key={stage}
                stage={stage}
                isLastStage={stageIndex === IDEA_STAGE_VALUES.length - 1}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Try it now</CardTitle>
            <CardDescription>
              Press{' '}
              <kbd className="rounded-control bg-sunken px-1.5 py-0.5 font-mono text-xs">
                Ctrl/⌘ + K
              </kbd>{' '}
              for the command palette, or toggle Light / Dark / System from the sidebar (top bar on
              mobile). Your choice is remembered per device, with no flash on reload.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
            <CardDescription>
              Auth and workspaces (Phase 3), the idea board with voting and ICE scores (Phase 4),
              live realtime updates (Phase 5), plans and tasks (Phase 6), collaborative notes (Phase
              7), brainstorm sessions (Phase 8), and PWA, export, and activity (Phase 9).
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
