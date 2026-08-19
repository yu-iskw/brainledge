import { asDecisionId, asKnowledgeSpaceId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { ContextSnapshot, DecisionRecord, DecisionRepository } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface DecisionRow {
  id: string;
  workspace_id: string;
  knowledge_space_id: string;
  action: string;
  rationale: string;
  snapshot_json: string;
  created_at: string;
  status: DecisionRecord['status'];
}

function mapDecision(row: DecisionRow): DecisionRecord {
  return {
    id: asDecisionId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    knowledgeSpaceId: asKnowledgeSpaceId(row.knowledge_space_id),
    action: row.action,
    rationale: row.rationale,
    snapshot: JSON.parse(row.snapshot_json) as ContextSnapshot,
    createdAt: row.created_at as DecisionRecord['createdAt'],
    status: row.status,
  };
}

export function createSqliteDecisionRepository(database: DatabaseSync): DecisionRepository {
  return {
    list({ workspaceId, knowledgeSpaceId }) {
      const rows = database
        .prepare(
          `SELECT * FROM decisions
           WHERE workspace_id = ? AND knowledge_space_id = ?
           ORDER BY created_at ASC`,
        )
        .all(workspaceId, knowledgeSpaceId) as unknown as DecisionRow[];
      return Promise.resolve(rows.map(mapDecision));
    },
    record({ workspaceId, decision }) {
      assertWorkspaceScope(decision.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO decisions (
            id, workspace_id, knowledge_space_id, action, rationale, snapshot_json, created_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          decision.id,
          decision.workspaceId,
          decision.knowledgeSpaceId,
          decision.action,
          decision.rationale,
          JSON.stringify(decision.snapshot),
          decision.createdAt,
          decision.status,
        );
      return Promise.resolve();
    },
  };
}
