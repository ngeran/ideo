// =============================================================================
// FILE:    packages/shared/src/schemas/workspace-request-schemas.ts
// PURPOSE: Zod schemas for every workspace-related request the Worker
//          validates: creating a workspace, joining with an invite code, and
//          creating an invite. The web app reuses them for form validation.
// USED BY: packages/shared/src/index.ts, worker route files, web api client
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { ENTITY_LIMITS } from '../constants/entity-limits'

// ---- Validation schemas -----------------------------------------------------

/** Body of POST /api/workspaces. */
export const createWorkspaceRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workspace name is required.')
    .max(ENTITY_LIMITS.workspaceName, `Workspace names are at most ${ENTITY_LIMITS.workspaceName} characters.`),
})

/** Body of POST /api/workspaces/join. Codes may be pasted with separators. */
export const joinWorkspaceRequestSchema = z.object({
  inviteCode: z
    .string()
    .transform((pastedCode) => pastedCode.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().length(12, 'Invite codes are 12 characters long.')),
})

/** Body of POST /api/workspaces/:workspaceId/invites. Both fields optional. */
export const createWorkspaceInviteRequestSchema = z.object({
  /** Days until the invite stops working. Clamped to a sane window. */
  expiresInDays: z.number().int().min(1).max(90).default(14),
  /** How many people may join with this invite. */
  maximumUses: z.number().int().min(1).max(100).default(25),
})

// ---- Types ------------------------------------------------------------------
export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>
export type JoinWorkspaceRequest = z.infer<typeof joinWorkspaceRequestSchema>
export type CreateWorkspaceInviteRequest = z.infer<typeof createWorkspaceInviteRequestSchema>
