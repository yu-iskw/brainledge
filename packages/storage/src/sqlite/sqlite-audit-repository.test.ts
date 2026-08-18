import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { asAuditEventId, asWorkspaceId, parseIsoUtc } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { openSqliteDatabase } from '../sqlite/database.js';
import { createSqliteAuditRepository } from '../sqlite/sqlite-audit-repository.js';

const WS_A = asWorkspaceId('ws_a');
const WS_B = asWorkspaceId('ws_b');
const FIXED_TIME = parseIsoUtc('2026-08-18T00:00:00.000Z');

describe('sqlite audit repository', () => {
  it('lists events scoped to workspace and rejects cross-workspace append', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-audit-'));
    const database = openSqliteDatabase(path.join(dir, 'database.sqlite'));
    const audit = createSqliteAuditRepository(database);

    await audit.append({
      workspaceId: WS_A,
      event: {
        id: asAuditEventId('aud_a1'),
        workspaceId: WS_A,
        principalId: 'principal_a',
        action: 'memory.remember',
        resourceType: 'episode',
        resourceId: 'ep_1',
        result: 'allow',
        timestamp: FIXED_TIME,
      },
    });
    await audit.append({
      workspaceId: WS_B,
      event: {
        id: asAuditEventId('aud_b1'),
        workspaceId: WS_B,
        principalId: 'principal_b',
        action: 'memory.recall',
        resourceType: 'episode',
        result: 'deny',
        timestamp: FIXED_TIME,
      },
    });

    const listA = await audit.list({ workspaceId: WS_A, limit: 10 });
    const listB = await audit.list({ workspaceId: WS_B, limit: 10 });

    expect(listA).toHaveLength(1);
    expect(listA[0]?.id).toBe('aud_a1');
    expect(listA[0]?.action).toBe('memory.remember');
    expect(listA[0]?.result).toBe('allow');

    expect(listB).toHaveLength(1);
    expect(listB[0]?.id).toBe('aud_b1');
    expect(listB[0]?.result).toBe('deny');

    await expect(
      audit.append({
        workspaceId: WS_A,
        event: {
          id: asAuditEventId('aud_mismatch'),
          workspaceId: WS_B,
          principalId: 'principal_b',
          action: 'memory.forget',
          resourceType: 'episode',
          result: 'error',
          timestamp: FIXED_TIME,
        },
      }),
    ).rejects.toThrow('workspace scope mismatch');

    database.close();
  });
});
