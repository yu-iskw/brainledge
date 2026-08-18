import type { KnowledgeSpaceId, PrincipalId, WorkspaceId } from '../domain/ids.js';

export type KnowledgeSpaceVisibility = 'private' | 'workspace' | 'organization';

export interface KnowledgeSpace {
  readonly id: KnowledgeSpaceId;
  readonly workspaceId: WorkspaceId;
  readonly ownerPrincipalId: PrincipalId;
  readonly name: string;
  readonly visibility: KnowledgeSpaceVisibility;
}
