import {
  asEntityId,
  asKnowledgeSpaceId,
  asWorkspaceId,
  type Entity,
  type EntityRepository,
} from '@brainledge/core';

import { assertWorkspaceScope, WORKSPACE_SCOPE_MISMATCH } from '../scope.js';

import type { DatabaseSync } from 'node:sqlite';

interface EntityRow {
  id: string;
  workspace_id: string;
  knowledge_space_id: string;
  canonical_name: string;
  type_ids_json: string;
  created_at: string;
  deleted_at: string | null;
}

function mapEntity(row: EntityRow): Entity {
  return {
    id: asEntityId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    knowledgeSpaceId: asKnowledgeSpaceId(row.knowledge_space_id),
    canonicalName: row.canonical_name,
    typeIds: JSON.parse(row.type_ids_json) as string[],
    createdAt: row.created_at as Entity['createdAt'],
    deletedAt: row.deleted_at === null ? undefined : (row.deleted_at as Entity['deletedAt']),
  };
}

export function createSqliteEntityRepository(database: DatabaseSync): EntityRepository {
  return {
    async insert({ workspaceId, entity }) {
      assertWorkspaceScope(entity.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT OR IGNORE INTO entities (id, workspace_id, knowledge_space_id, canonical_name, type_ids_json, created_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entity.id,
          entity.workspaceId,
          entity.knowledgeSpaceId,
          entity.canonicalName,
          JSON.stringify(entity.typeIds),
          entity.createdAt,
          entity.deletedAt ?? null,
        );
      return Promise.resolve();
    },
    findById({ workspaceId, entityId }) {
      const row = database
        .prepare('SELECT * FROM entities WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL')
        .get(entityId, workspaceId) as EntityRow | undefined;
      return Promise.resolve(row === undefined ? undefined : mapEntity(row));
    },
    findByAlias({ workspaceId, knowledgeSpaceId, normalizedValue }) {
      const alias = database
        .prepare(
          `SELECT e.* FROM entities e
           JOIN entity_aliases a ON a.entity_id = e.id
           WHERE e.workspace_id = ? AND e.knowledge_space_id = ? AND a.normalized_value = ?
             AND e.deleted_at IS NULL
           LIMIT 1`,
        )
        .get(workspaceId, knowledgeSpaceId, normalizedValue) as EntityRow | undefined;
      return Promise.resolve(alias === undefined ? undefined : mapEntity(alias));
    },
    async addAlias({ workspaceId, alias }) {
      const owner = database
        .prepare('SELECT workspace_id FROM entities WHERE id = ?')
        .get(alias.entityId) as { workspace_id: string } | undefined;
      if (owner === undefined) {
        throw new Error(WORKSPACE_SCOPE_MISMATCH);
      }
      assertWorkspaceScope(owner.workspace_id, workspaceId);
      database
        .prepare(
          `INSERT INTO entity_aliases (entity_id, value, normalized_value, source_evidence_id)
           VALUES (?, ?, ?, ?)`,
        )
        .run(alias.entityId, alias.value, alias.normalizedValue, alias.sourceEvidenceId ?? null);
      return Promise.resolve();
    },
    list({ workspaceId, knowledgeSpaceId }) {
      const rows = database
        .prepare(
          `SELECT * FROM entities WHERE workspace_id = ? AND knowledge_space_id = ? AND deleted_at IS NULL`,
        )
        .all(workspaceId, knowledgeSpaceId) as unknown as EntityRow[];
      return Promise.resolve(rows.map(mapEntity));
    },
  };
}
