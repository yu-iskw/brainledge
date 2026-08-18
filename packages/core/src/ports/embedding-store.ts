import type { WorkspaceId } from '../domain/ids.js';

export interface StoredEmbedding {
  readonly id: string;
  readonly workspaceId: WorkspaceId;
  readonly targetType: string;
  readonly targetId: string;
  readonly model: string;
  readonly vector: readonly number[];
}

export interface EmbeddingStore {
  upsert(input: { workspaceId: WorkspaceId; embedding: StoredEmbedding }): Promise<void>;
  list(input: { workspaceId: WorkspaceId; limit: number }): Promise<readonly StoredEmbedding[]>;
  deleteByTarget(input: {
    workspaceId: WorkspaceId;
    targetType: string;
    targetId: string;
  }): Promise<void>;
}
