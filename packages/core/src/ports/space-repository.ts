import type { KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { KnowledgeSpace } from '../spaces/knowledge-space.js';

export interface SpaceRepository {
  get(input: {
    workspaceId: WorkspaceId;
    spaceId: KnowledgeSpaceId;
  }): Promise<KnowledgeSpace | undefined>;
  list(input: { workspaceId: WorkspaceId }): Promise<readonly KnowledgeSpace[]>;
  insert(input: { workspaceId: WorkspaceId; space: KnowledgeSpace }): Promise<void>;
  update(input: { workspaceId: WorkspaceId; space: KnowledgeSpace }): Promise<void>;
  remove(input: { workspaceId: WorkspaceId; spaceId: KnowledgeSpaceId }): Promise<void>;
}
