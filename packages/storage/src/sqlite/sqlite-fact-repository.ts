import {
  asEntityId,
  asEpisodeId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
  findContradictoryPairs,
  type Fact,
  type FactRepository,
} from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { DatabaseSync } from 'node:sqlite';

interface FactRow {
  id: string;
  workspace_id: string;
  knowledge_space_id: string;
  subject_id: string;
  predicate_id: string;
  object_json: string;
  valid_from: string | null;
  valid_until: string | null;
  asserted_at: string;
  retracted_at: string | null;
  reference_time: string | null;
  confidence: number | null;
  status: Fact['status'];
  created_by: string;
  source_episode_id: string | null;
}

function mapFact(row: FactRow): Fact {
  return {
    id: asFactId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    knowledgeSpaceId: asKnowledgeSpaceId(row.knowledge_space_id),
    subject: { entityId: asEntityId(row.subject_id) },
    predicate: { id: row.predicate_id },
    object: JSON.parse(row.object_json) as Fact['object'],
    validFrom: row.valid_from === null ? undefined : (row.valid_from as Fact['validFrom']),
    validUntil: row.valid_until === null ? undefined : (row.valid_until as Fact['validUntil']),
    assertedAt: row.asserted_at as Fact['assertedAt'],
    retractedAt: row.retracted_at === null ? undefined : (row.retracted_at as Fact['retractedAt']),
    referenceTime:
      row.reference_time === null ? undefined : (row.reference_time as Fact['referenceTime']),
    confidence: row.confidence ?? undefined,
    status: row.status,
    createdBy: { principalId: asPrincipalId(row.created_by) },
    sourceEpisodeId:
      row.source_episode_id === null ? undefined : asEpisodeId(row.source_episode_id),
  };
}

function persist(
  database: DatabaseSync,
  workspaceId: string,
  fact: Fact,
  orReplace: boolean,
): void {
  assertWorkspaceScope(fact.workspaceId, workspaceId);
  const sql = `${orReplace ? 'INSERT OR REPLACE' : 'INSERT'} INTO facts (
    id, workspace_id, knowledge_space_id, subject_id, predicate_id, object_json,
    valid_from, valid_until, asserted_at, retracted_at, reference_time, confidence, status, created_by,
    source_episode_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  database
    .prepare(sql)
    .run(
      fact.id,
      fact.workspaceId,
      fact.knowledgeSpaceId,
      fact.subject.entityId,
      fact.predicate.id,
      JSON.stringify(fact.object),
      fact.validFrom ?? null,
      fact.validUntil ?? null,
      fact.assertedAt,
      fact.retractedAt ?? null,
      fact.referenceTime ?? null,
      fact.confidence ?? null,
      fact.status,
      fact.createdBy.principalId,
      fact.sourceEpisodeId === undefined ? null : fact.sourceEpisodeId,
    );
}

export function createSqliteFactRepository(database: DatabaseSync): FactRepository {
  return {
    insert({ workspaceId, fact }) {
      try {
        persist(database, workspaceId, fact, false);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
    upsert({ workspaceId, fact }) {
      try {
        persist(database, workspaceId, fact, true);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
    findById({ workspaceId, factId }) {
      const row = database
        .prepare('SELECT * FROM facts WHERE id = ? AND workspace_id = ?')
        .get(factId, workspaceId) as FactRow | undefined;
      return Promise.resolve(row === undefined ? undefined : mapFact(row));
    },
    query({ workspaceId, knowledgeSpaceId, asOf, limit }) {
      const rows =
        asOf === undefined
          ? (database
              .prepare(
                `SELECT * FROM facts
                 WHERE workspace_id = ? AND knowledge_space_id = ? AND retracted_at IS NULL
                 ORDER BY asserted_at DESC LIMIT ?`,
              )
              .all(workspaceId, knowledgeSpaceId, limit) as unknown as FactRow[])
          : (database
              .prepare(
                `SELECT * FROM facts
                 WHERE workspace_id = ? AND knowledge_space_id = ?
                   AND COALESCE(valid_from, asserted_at) <= ?
                   AND (
                     COALESCE(valid_until, retracted_at) IS NULL
                     OR COALESCE(valid_until, retracted_at) > ?
                   )
                 ORDER BY asserted_at DESC LIMIT ?`,
              )
              .all(workspaceId, knowledgeSpaceId, asOf, asOf, limit) as unknown as FactRow[]);
      return Promise.resolve(rows.map(mapFact));
    },
    findContradictions({ workspaceId, knowledgeSpaceId }) {
      return this.query({ workspaceId, knowledgeSpaceId, limit: 500 }).then(findContradictoryPairs);
    },
    purgeBySourceEpisode({ workspaceId, sourceEpisodeId }) {
      database
        .prepare(
          `DELETE FROM fact_evidence
           WHERE fact_id IN (
             SELECT id FROM facts WHERE source_episode_id = ? AND workspace_id = ?
           )`,
        )
        .run(sourceEpisodeId, workspaceId);
      database
        .prepare('DELETE FROM facts WHERE source_episode_id = ? AND workspace_id = ?')
        .run(sourceEpisodeId, workspaceId);
      return Promise.resolve();
    },
  };
}
