import type { EntityId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { Entity, EntityAlias } from '../knowledge/entity.js';

export interface EntityRepository {
  insert(input: { workspaceId: WorkspaceId; entity: Entity }): Promise<void>;
  findById(input: { workspaceId: WorkspaceId; entityId: EntityId }): Promise<Entity | undefined>;
  findByAlias(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
    normalizedValue: string;
  }): Promise<Entity | undefined>;
  addAlias(input: { workspaceId: WorkspaceId; alias: EntityAlias }): Promise<void>;
  list(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
  }): Promise<readonly Entity[]>;
}
