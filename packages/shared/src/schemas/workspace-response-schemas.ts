// =============================================================================
// FILE:    packages/shared/src/schemas/workspace-response-schemas.ts
// PURPOSE: Zod schemas describing every workspace-related response body the
//          Worker sends. The web api client parses responses with these, so
//          the client and server can never disagree about the shape.
// USED BY: packages/shared/src/index.ts, worker routes, web api client
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'

// ---- Validation schemas -----------------------------------------------------

/** One user, as the API returns them. */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
})

/** One membership row: who is in the workspace and with which role. */
export const workspaceMemberResponseSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
  memberRole: z.enum(['owner', 'member']),
  joinedAt: z.string(),
})

/** A workspace without its members. */
export const workspaceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  /** The requesting user's role in this workspace ("owner" or "member"). */
  currentUserRole: z.enum(['owner', 'member']),
})

/** GET /api/workspaces/:workspaceId — workspace plus its members. */
export const workspaceDetailResponseSchema = z.object({
  workspace: workspaceResponseSchema,
  members: z.array(workspaceMemberResponseSchema),
})

/** GET /api/me — the signed-in user and their workspace memberships. */
export const meResponseSchema = z.object({
  user: userResponseSchema,
  workspaces: z.array(workspaceResponseSchema),
})

/** One invite, as returned after creation. */
export const workspaceInviteResponseSchema = z.object({
  inviteCode: z.string(),
  expiresAt: z.string(),
  maximumUses: z.number().int(),
})

/** Body of POST /api/workspaces and POST /api/workspaces/join. */
export const workspaceMutationResponseSchema = z.object({ workspace: workspaceResponseSchema })

/** Body of POST /api/workspaces/:workspaceId/invites. */
export const workspaceInviteCreatedResponseSchema = z.object({
  invite: workspaceInviteResponseSchema,
})

// ---- Types ------------------------------------------------------------------
export type UserResponse = z.infer<typeof userResponseSchema>
export type WorkspaceMemberResponse = z.infer<typeof workspaceMemberResponseSchema>
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>
export type WorkspaceDetailResponse = z.infer<typeof workspaceDetailResponseSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
export type WorkspaceInviteResponse = z.infer<typeof workspaceInviteResponseSchema>
export type WorkspaceMutationResponse = z.infer<typeof workspaceMutationResponseSchema>
export type WorkspaceInviteCreatedResponse = z.infer<typeof workspaceInviteCreatedResponseSchema>
