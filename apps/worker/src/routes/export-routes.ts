// =============================================================================
// FILE:    apps/worker/src/routes/export-routes.ts
// PURPOSE: The workspace export endpoint: one GET answers with the whole
//          workspace as Markdown or JSON, as a download. No lock-in.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import {
  buildWorkspaceExportBundle,
  renderBundleAsJson,
  renderBundleAsMarkdown,
} from '../services/export-service'
import { validationFailedError } from './api-errors'

// ---- Validation helpers -----------------------------------------------------

/** Query string of GET /api/workspaces/:workspaceId/export. */
const exportQuerySchema = z.object({
  format: z.enum(['markdown', 'json']).default('markdown'),
})

/** Turns a failed validation into our standard error body. */
function reportZodFailure(validationResult: {
  success: boolean
  error?: { issues: Array<{ message: string }> }
}) {
  const failedValidation = !validationResult.success && validationResult.error !== undefined
  if (failedValidation) {
    const failureMessages = (validationResult.error?.issues ?? [])
      .map((issue) => issue.message)
      .join('; ')
    throw validationFailedError(failureMessages)
  }
}

// ---- Route factories --------------------------------------------------------

/**
 * Creates the export route group.
 * Returns a Hono instance mounted under /api with:
 *   GET /workspaces/:workspaceId/export?format=markdown|json    download
 */
export function createExportRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const exportRoutes = new Hono<AuthenticatedContext>()

  exportRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  exportRoutes.get(
    '/workspaces/:workspaceId/export',
    zValidator('query', exportQuerySchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const { format } = requestContext.req.valid('query')
      const database = createDatabase(requestContext.env.DATABASE)

      const exportBundle = await buildWorkspaceExportBundle(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
      )

      // A date-stamped download name; the extension follows the format.
      const exportDate = exportBundle.exportedAt.slice(0, 10)
      const exportBody =
        format === 'json' ? renderBundleAsJson(exportBundle) : renderBundleAsMarkdown(exportBundle)

      return new Response(exportBody, {
        headers: {
          'content-type': format === 'json' ? 'application/json' : 'text/markdown; charset=utf-8',
          'content-disposition': `attachment; filename="ideo-${requestContext.req.param('workspaceId').slice(0, 8)}-${exportDate}.${format === 'json' ? 'json' : 'md'}"`,
        },
      })
    },
  )

  return exportRoutes
}
