// =============================================================================
// FILE:    packages/shared/src/index.ts
// PURPOSE: Public entry point of the shared package. Everything the web app
//          and the Worker both need (constants, validation schemas, pure
//          calculations) is exported from here, so nothing is shared by
//          copy-paste.
// USED BY: apps/web, apps/worker
//
//          Biome keeps these exports sorted by module path — leave that job
//          to `pnpm lint:fix` rather than regrouping them by hand.
// =============================================================================

// ---- Exports (sorted by module path) ----------------------------------------
export { calculateIceScore } from './calculate-ice-score'
export { ENTITY_LIMITS } from './constants/entity-limits'
export { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAXIMUM } from './constants/pagination-limits'
export type { IdeaStage } from './constants/pipeline-stages'
export { IDEA_STAGE_LABELS, IDEA_STAGE_VALUES } from './constants/pipeline-stages'
export type { PlanStatus } from './constants/plan-statuses'
export { PLAN_STATUS_LABELS, PLAN_STATUS_VALUES } from './constants/plan-statuses'
export type { TaskStatus } from './constants/task-statuses'
export { TASK_STATUS_LABELS, TASK_STATUS_VALUES } from './constants/task-statuses'
export type { CursorPaginationQuery } from './schemas/common-request-schemas'
export { cursorPaginationQuerySchema } from './schemas/common-request-schemas'
export type {
  IdeaCreatedResponse,
  IdeaVoteToggledResponse,
} from './schemas/idea-mutation-response-schemas'
export {
  ideaCommentCreatedResponseSchema,
  ideaCreatedResponseSchema,
  ideaUpdatedResponseSchema,
  ideaVoteToggledResponseSchema,
} from './schemas/idea-mutation-response-schemas'
export type {
  CreateIdeaCommentRequest,
  CreateIdeaRequest,
  IdeaListQuery,
  IdeaSortValue,
  UpdateIdeaRequest,
} from './schemas/idea-request-schemas'
export {
  createIdeaCommentRequestSchema,
  createIdeaRequestSchema,
  ideaListQuerySchema,
  updateIdeaRequestSchema,
} from './schemas/idea-request-schemas'
export type {
  IdeaAuthorResponse,
  IdeaCommentResponse,
  IdeaDetailResponse,
  IdeaListResponse,
  IdeaResponse,
} from './schemas/idea-response-schemas'
export {
  ideaCommentResponseSchema,
  ideaDetailResponseSchema,
  ideaListResponseSchema,
  ideaResponseSchema,
} from './schemas/idea-response-schemas'
export type {
  CreateWorkspaceInviteRequest,
  CreateWorkspaceRequest,
  JoinWorkspaceRequest,
} from './schemas/workspace-request-schemas'
export {
  createWorkspaceInviteRequestSchema,
  createWorkspaceRequestSchema,
  joinWorkspaceRequestSchema,
} from './schemas/workspace-request-schemas'
export type {
  MeResponse,
  UserResponse,
  WorkspaceDetailResponse,
  WorkspaceInviteCreatedResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberResponse,
  WorkspaceMutationResponse,
  WorkspaceResponse,
} from './schemas/workspace-response-schemas'
export {
  meResponseSchema,
  userResponseSchema,
  workspaceDetailResponseSchema,
  workspaceInviteCreatedResponseSchema,
  workspaceInviteResponseSchema,
  workspaceMemberResponseSchema,
  workspaceMutationResponseSchema,
  workspaceResponseSchema,
} from './schemas/workspace-response-schemas'
