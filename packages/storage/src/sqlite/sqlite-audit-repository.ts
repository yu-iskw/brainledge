import { asAuditEventId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { AuditEvent, AuditRepository } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface AuditEventRow {
  id: string;
  workspace_id: string;
  principal_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  result: AuditEvent['result'];
  timestamp: string;
  request_id: string | null;
}

function mapAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: asAuditEventId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    principalId: row.principal_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id === null ? undefined : row.resource_id,
    result: row.result,
    timestamp: row.timestamp as AuditEvent['timestamp'],
    requestId: row.request_id === null ? undefined : row.request_id,
  };
}

export function createSqliteAuditRepository(database: DatabaseSync): AuditRepository {
  return {
    async append({ workspaceId, event }) {
      assertWorkspaceScope(event.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO audit_events (
            id, workspace_id, principal_id, action, resource_type, resource_id,
            result, timestamp, request_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          event.id,
          event.workspaceId,
          event.principalId,
          event.action,
          event.resourceType,
          event.resourceId ?? null,
          event.result,
          event.timestamp,
          event.requestId ?? null,
        );
      return Promise.resolve();
    },

    list({ workspaceId, limit }) {
      const rows = database
        .prepare(
          `SELECT * FROM audit_events
           WHERE workspace_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all(workspaceId, limit) as unknown as AuditEventRow[];
      return Promise.resolve(rows.map(mapAuditEvent));
    },
  };
}
