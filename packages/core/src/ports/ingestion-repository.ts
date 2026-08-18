import type { IngestionRunId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export type IngestionStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface IngestionRun {
  readonly id: IngestionRunId;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly status: IngestionStatus;
  readonly idempotencyKey?: string;
  readonly createdAt: IsoUtcTimestamp;
  readonly errorCode?: string;
}

export interface IngestionRepository {
  insert(input: { workspaceId: WorkspaceId; run: IngestionRun }): Promise<void>;
  findById(input: {
    workspaceId: WorkspaceId;
    runId: IngestionRunId;
  }): Promise<IngestionRun | undefined>;
  findByIdempotencyKey(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
    idempotencyKey: string;
  }): Promise<IngestionRun | undefined>;
  updateStatus(input: {
    workspaceId: WorkspaceId;
    runId: IngestionRunId;
    status: IngestionStatus;
    errorCode?: string;
  }): Promise<void>;
}
