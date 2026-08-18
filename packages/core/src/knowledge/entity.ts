import type { EntityId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export interface EntityRef {
  readonly entityId: EntityId;
}

export interface Entity {
  readonly id: EntityId;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly canonicalName: string;
  readonly typeIds: readonly string[];
  readonly createdAt: IsoUtcTimestamp;
  readonly deletedAt?: IsoUtcTimestamp;
}

export interface EntityAlias {
  readonly entityId: EntityId;
  readonly value: string;
  readonly normalizedValue: string;
  readonly sourceEvidenceId?: string;
}
