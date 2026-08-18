import { asJobId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { JobRecord, JobRepository } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface JobRow {
  id: string;
  workspace_id: string;
  type: string;
  payload_json: string;
  status: JobRecord['status'];
  attempts: number;
  created_at: string;
  error_code: string | null;
}

function mapJob(row: JobRow): JobRecord {
  return {
    id: asJobId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    type: row.type,
    payloadJson: row.payload_json,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at as JobRecord['createdAt'],
    errorCode: row.error_code ?? undefined,
  };
}

export function createSqliteJobRepository(database: DatabaseSync): JobRepository {
  return {
    async enqueue({ workspaceId, job }) {
      assertWorkspaceScope(job.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO jobs (id, workspace_id, type, payload_json, status, attempts, created_at, error_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          job.id,
          job.workspaceId,
          job.type,
          job.payloadJson,
          job.status,
          job.attempts,
          job.createdAt,
          job.errorCode ?? null,
        );
      return Promise.resolve();
    },

    claim({ limit: _limit }) {
      const row = database
        .prepare(`SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`)
        .get() as JobRow | undefined;
      if (row === undefined) {
        return Promise.resolve(undefined);
      }
      database
        .prepare(`UPDATE jobs SET status = 'running', attempts = attempts + 1 WHERE id = ?`)
        .run(row.id);
      return Promise.resolve(mapJob({ ...row, status: 'running', attempts: row.attempts + 1 }));
    },

    succeed({ workspaceId, jobId }) {
      database
        .prepare(`UPDATE jobs SET status = 'succeeded' WHERE id = ? AND workspace_id = ?`)
        .run(jobId, workspaceId);
      return Promise.resolve();
    },

    fail({ workspaceId, jobId, errorCode }) {
      database
        .prepare(
          `UPDATE jobs SET status = 'failed', error_code = ? WHERE id = ? AND workspace_id = ?`,
        )
        .run(errorCode, jobId, workspaceId);
      return Promise.resolve();
    },
  };
}
