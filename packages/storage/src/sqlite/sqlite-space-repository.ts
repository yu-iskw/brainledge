import { asKnowledgeSpaceId, asPrincipalId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type {
  KnowledgeSpace,
  KnowledgeSpaceId,
  SpaceRepository,
  WorkspaceId,
} from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface SpaceRow {
  id: string;
  workspace_id: string;
  owner_principal_id: string;
  name: string;
  visibility: KnowledgeSpace['visibility'];
}

function mapSpace(row: SpaceRow): KnowledgeSpace {
  return {
    id: asKnowledgeSpaceId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    ownerPrincipalId: asPrincipalId(row.owner_principal_id),
    name: row.name,
    visibility: row.visibility,
  };
}

export function createSqliteSpaceRepository(database: DatabaseSync): SpaceRepository {
  return {
    get({ workspaceId, spaceId }) {
      const row = database
        .prepare('SELECT * FROM knowledge_spaces WHERE id = ? AND workspace_id = ?')
        .get(spaceId, workspaceId) as SpaceRow | undefined;
      return Promise.resolve(row === undefined ? undefined : mapSpace(row));
    },

    list({ workspaceId }) {
      const rows = database
        .prepare('SELECT * FROM knowledge_spaces WHERE workspace_id = ?')
        .all(workspaceId) as unknown as SpaceRow[];
      return Promise.resolve(rows.map(mapSpace));
    },

    async insert({ workspaceId, space }) {
      assertWorkspaceScope(space.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO knowledge_spaces (id, workspace_id, owner_principal_id, name, visibility)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(space.id, space.workspaceId, space.ownerPrincipalId, space.name, space.visibility);
      return Promise.resolve();
    },

    async update(input: { workspaceId: WorkspaceId; space: KnowledgeSpace }) {
      const { workspaceId, space } = input;
      assertWorkspaceScope(space.workspaceId, workspaceId);
      database
        .prepare(
          `UPDATE knowledge_spaces
           SET owner_principal_id = ?, name = ?, visibility = ?
           WHERE id = ? AND workspace_id = ?`,
        )
        .run(space.ownerPrincipalId, space.name, space.visibility, space.id, workspaceId);
      return Promise.resolve();
    },

    remove(input: { workspaceId: WorkspaceId; spaceId: KnowledgeSpaceId }) {
      const { workspaceId, spaceId } = input;
      database
        .prepare('DELETE FROM knowledge_spaces WHERE id = ? AND workspace_id = ?')
        .run(spaceId, workspaceId);
      return Promise.resolve();
    },
  };
}
