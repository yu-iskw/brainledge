import { assertWorkspaceScope } from '../scope.js';

import type { EmbeddingStore, StoredEmbedding } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

export function createSqliteEmbeddingStore(database: DatabaseSync): EmbeddingStore {
  return {
    async upsert({ workspaceId, embedding }) {
      assertWorkspaceScope(embedding.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT OR REPLACE INTO embeddings (id, workspace_id, target_type, target_id, model, vector_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          embedding.id,
          embedding.workspaceId,
          embedding.targetType,
          embedding.targetId,
          embedding.model,
          JSON.stringify(embedding.vector),
        );
      return Promise.resolve();
    },
    list({ workspaceId, limit }) {
      const rows = database
        .prepare(`SELECT * FROM embeddings WHERE workspace_id = ? LIMIT ?`)
        .all(workspaceId, limit) as unknown as {
        id: string;
        workspace_id: string;
        target_type: string;
        target_id: string;
        model: string;
        vector_json: string;
      }[];
      return Promise.resolve(
        rows.map((row) => ({
          id: row.id,
          workspaceId: row.workspace_id as StoredEmbedding['workspaceId'],
          targetType: row.target_type,
          targetId: row.target_id,
          model: row.model,
          vector: JSON.parse(row.vector_json) as number[],
        })),
      );
    },
    deleteByTarget({ workspaceId, targetType, targetId }) {
      database
        .prepare(
          `DELETE FROM embeddings WHERE workspace_id = ? AND target_type = ? AND target_id = ?`,
        )
        .run(workspaceId, targetType, targetId);
      return Promise.resolve();
    },
  };
}
