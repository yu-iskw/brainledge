import { asKnowledgeSpaceId, asPrincipalId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { KnowledgeSpace, SpaceRepository } from '@brainledge/core';
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
  };
}
