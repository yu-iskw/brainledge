import { asJobId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { IsoUtcTimestamp, JobRecord, JobRepository } from '@brainledge/core';
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
  claimed_at: string | null;
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
    claimedAt: row.claimed_at === null ? undefined : (row.claimed_at as JobRecord['claimedAt']),
  };
}

function isSqliteBusy(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('SQLITE_BUSY') || error.message.includes('database is locked'))
  );
}

function staleCutoff(now: IsoUtcTimestamp, olderThanMs: number): string {
  return new Date(Date.parse(now) - olderThanMs).toISOString();
}

const CLAIM_SQL = `UPDATE jobs
SET status = 'running', attempts = attempts + 1, claimed_at = ?
WHERE id = (
  SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1
)
RETURNING *`;

function claimNextQueued(database: DatabaseSync, claimedAt: string): JobRow | undefined {
  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare(CLAIM_SQL).get(claimedAt) as JobRow | undefined;
    database.exec('COMMIT');
    return row;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function createSqliteJobRepository(database: DatabaseSync): JobRepository {
  return {
    async enqueue({ workspaceId, job }) {
      assertWorkspaceScope(job.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO jobs (
            id, workspace_id, type, payload_json, status, attempts, created_at, error_code, claimed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          job.claimedAt ?? null,
        );
      return Promise.resolve();
    },

    claim({ limit: _limit }) {
      const claimedAt = new Date().toISOString();
      for (let attempt = 0; attempt < 32; attempt += 1) {
        try {
          const row = claimNextQueued(database, claimedAt);
          return Promise.resolve(row === undefined ? undefined : mapJob(row));
        } catch (error) {
          if (!isSqliteBusy(error) || attempt === 31) {
            return Promise.reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
      return Promise.resolve(undefined);
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

    requeueStaleRunning({ olderThanMs, now }) {
      const cutoff = staleCutoff(now, olderThanMs);
      const result = database
        .prepare(
          `UPDATE jobs
           SET status = 'queued'
           WHERE status = 'running'
             AND (claimed_at IS NULL OR claimed_at <= ?)`,
        )
        .run(cutoff);
      return Promise.resolve(Number(result.changes));
    },
  };
}
