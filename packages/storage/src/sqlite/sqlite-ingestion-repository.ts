import { asIngestionRunId, asKnowledgeSpaceId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { IngestionRepository, IngestionRun } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface IngestionRow {
  id: string;
  workspace_id: string;
  knowledge_space_id: string;
  status: IngestionRun['status'];
  idempotency_key: string | null;
  created_at: string;
  error_code: string | null;
}

function mapIngestionRun(row: IngestionRow): IngestionRun {
  return {
    id: asIngestionRunId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    knowledgeSpaceId: asKnowledgeSpaceId(row.knowledge_space_id),
    status: row.status,
    idempotencyKey: row.idempotency_key === null ? undefined : row.idempotency_key,
    createdAt: row.created_at as IngestionRun['createdAt'],
    errorCode: row.error_code === null ? undefined : row.error_code,
  };
}

export function createSqliteIngestionRepository(database: DatabaseSync): IngestionRepository {
  return {
    async insert({ workspaceId, run }) {
      assertWorkspaceScope(run.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO ingestions (
            id, workspace_id, knowledge_space_id, status, idempotency_key,
            created_at, error_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          run.id,
          run.workspaceId,
          run.knowledgeSpaceId,
          run.status,
          run.idempotencyKey ?? null,
          run.createdAt,
          run.errorCode ?? null,
        );
      return Promise.resolve();
    },

    findById({ workspaceId, runId }) {
      const row = database
        .prepare('SELECT * FROM ingestions WHERE id = ? AND workspace_id = ?')
        .get(runId, workspaceId) as IngestionRow | undefined;
      return Promise.resolve(row === undefined ? undefined : mapIngestionRun(row));
    },

    findByIdempotencyKey({ workspaceId, knowledgeSpaceId, idempotencyKey }) {
      const row = database
        .prepare(
          `SELECT * FROM ingestions
           WHERE workspace_id = ? AND knowledge_space_id = ? AND idempotency_key = ?`,
        )
        .get(workspaceId, knowledgeSpaceId, idempotencyKey) as IngestionRow | undefined;
      return Promise.resolve(row === undefined ? undefined : mapIngestionRun(row));
    },

    updateStatus({ workspaceId, runId, status, errorCode }) {
      database
        .prepare(
          `UPDATE ingestions
           SET status = ?, error_code = ?
           WHERE id = ? AND workspace_id = ?`,
        )
        .run(status, errorCode ?? null, runId, workspaceId);
      return Promise.resolve();
    },
  };
}
