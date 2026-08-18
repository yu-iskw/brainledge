import type { Action } from './action.js';
import type { KnowledgeSpaceId, PrincipalId, WorkspaceId } from '../domain/ids.js';
import type { Principal } from '../identity/principal.js';

export interface ResourceRef {
  readonly type: 'space' | 'episode' | 'fact' | 'workspace';
  readonly id: string;
}

export interface AuthorizationRequest {
  readonly principal: Principal;
  readonly action: Action;
  readonly resource: ResourceRef;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId?: KnowledgeSpaceId;
}

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export interface Authorizer {
  authorize(input: AuthorizationRequest): Promise<AuthorizationDecision>;
}

export interface ExecutionContext {
  readonly principal: Principal;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly requestId?: string;
  readonly actorPrincipalId?: PrincipalId;
}
