import type { FactId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';
import type { Fact } from '../knowledge/fact.js';

export interface FactRepository {
  insert(input: { workspaceId: WorkspaceId; fact: Fact }): Promise<void>;
  upsert(input: { workspaceId: WorkspaceId; fact: Fact }): Promise<void>;
  findById(input: { workspaceId: WorkspaceId; factId: FactId }): Promise<Fact | undefined>;
  query(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
    asOf?: IsoUtcTimestamp;
    limit: number;
  }): Promise<readonly Fact[]>;
  findContradictions(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
  }): Promise<readonly [Fact, Fact][]>;
}
