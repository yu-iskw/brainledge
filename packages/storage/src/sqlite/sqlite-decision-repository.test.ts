import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID, asDecisionId, parseIsoUtc } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { openSqliteDatabase } from './database.js';
import { createSqliteDecisionRepository } from './sqlite-decision-repository.js';

const NOW = parseIsoUtc('2026-08-18T00:00:00.000Z');

describe('sqlite decision repository', () => {
  it('records a decision that survives reopen', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-decisions-'));
    const file = path.join(dir, 'database.sqlite');
    const first = openSqliteDatabase(file);
    const repo = createSqliteDecisionRepository(first);
    await repo.record({
      workspaceId: LOCAL_WORKSPACE_ID,
      decision: {
        id: asDecisionId('dec_1'),
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        action: 'promote',
        rationale: 'operator confirmed',
        snapshot: {
          workspaceId: LOCAL_WORKSPACE_ID,
          knowledgeSpaceId: LOCAL_SPACE_ID,
          episodeIds: [],
          factIds: [],
          capturedAt: NOW,
        },
        createdAt: NOW,
        status: 'proposed',
      },
    });
    first.close();

    const second = openSqliteDatabase(file);
    const listed = await createSqliteDecisionRepository(second).list({
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('dec_1');
    expect(listed[0]?.action).toBe('promote');
    second.close();
  });
});
