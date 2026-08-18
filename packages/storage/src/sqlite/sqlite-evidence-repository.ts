import { asEvidenceId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { Evidence, EvidenceRepository } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface EvidenceRow {
  id: string;
  workspace_id: string;
  source_type: Evidence['sourceType'];
  source_id: string;
  locator: string | null;
  content_hash: string | null;
  observed_at: string;
}

export function createSqliteEvidenceRepository(database: DatabaseSync): EvidenceRepository {
  return {
    async insert({ workspaceId, evidence }) {
      assertWorkspaceScope(evidence.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO evidence (id, workspace_id, source_type, source_id, locator, content_hash, observed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          evidence.id,
          evidence.workspaceId,
          evidence.sourceType,
          evidence.sourceId,
          evidence.locator ?? null,
          evidence.contentHash ?? null,
          evidence.observedAt,
        );
      return Promise.resolve();
    },

    findById({ workspaceId, evidenceId }) {
      const row = database
        .prepare('SELECT * FROM evidence WHERE id = ? AND workspace_id = ?')
        .get(evidenceId, workspaceId) as EvidenceRow | undefined;
      if (row === undefined) {
        return Promise.resolve(undefined);
      }
      return Promise.resolve({
        id: asEvidenceId(row.id),
        workspaceId: asWorkspaceId(row.workspace_id),
        sourceType: row.source_type,
        sourceId: row.source_id,
        locator: row.locator ?? undefined,
        contentHash: row.content_hash ?? undefined,
        observedAt: row.observed_at as Evidence['observedAt'],
      });
    },
  };
}
