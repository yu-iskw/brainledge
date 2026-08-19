import {
  LOCAL_ORGANIZATION_ID,
  LOCAL_PRINCIPAL_ID,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
} from '@brainledge/core';

import type { DatabaseSync } from 'node:sqlite';

export function seedStandaloneIdentity(database: DatabaseSync): void {
  database
    .prepare('INSERT OR IGNORE INTO organizations (id, name) VALUES (?, ?)')
    .run(LOCAL_ORGANIZATION_ID, 'local');
  database
    .prepare('INSERT OR IGNORE INTO principals (id, type, display_name) VALUES (?, ?, ?)')
    .run(LOCAL_PRINCIPAL_ID, 'local', 'Local user');
  database
    .prepare('INSERT OR IGNORE INTO workspaces (id, organization_id, name) VALUES (?, ?, ?)')
    .run(LOCAL_WORKSPACE_ID, LOCAL_ORGANIZATION_ID, 'personal');
  database
    .prepare(
      'INSERT OR IGNORE INTO memberships (workspace_id, principal_id, role) VALUES (?, ?, ?)',
    )
    .run(LOCAL_WORKSPACE_ID, LOCAL_PRINCIPAL_ID, 'admin');
  database
    .prepare(
      `INSERT OR IGNORE INTO knowledge_spaces (id, workspace_id, owner_principal_id, name, visibility)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID, LOCAL_PRINCIPAL_ID, 'default', 'private');
  database
    .prepare(
      `INSERT OR IGNORE INTO grants (workspace_id, knowledge_space_id, principal_id, level)
       VALUES (?, ?, ?, ?)`,
    )
    .run(LOCAL_WORKSPACE_ID, LOCAL_SPACE_ID, LOCAL_PRINCIPAL_ID, 'admin');
}
