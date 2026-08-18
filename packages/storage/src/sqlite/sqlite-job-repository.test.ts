import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LOCAL_WORKSPACE_ID, asJobId, parseIsoUtc } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { openSqliteDatabase } from './database.js';
import { createSqliteJobRepository } from './sqlite-job-repository.js';

const NOW = parseIsoUtc('2026-08-18T00:00:00.000Z');

describe('sqlite job repository', () => {
  it('lets only one connection claim a queued job', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-jobs-'));
    const file = path.join(dir, 'database.sqlite');
    const firstDb = openSqliteDatabase(file);
    const secondDb = openSqliteDatabase(file);
    const first = createSqliteJobRepository(firstDb);
    const second = createSqliteJobRepository(secondDb);
    await first.enqueue({
      workspaceId: LOCAL_WORKSPACE_ID,
      job: {
        id: asJobId('job_one'),
        workspaceId: LOCAL_WORKSPACE_ID,
        type: 'ping',
        payloadJson: '{}',
        status: 'queued',
        attempts: 0,
        createdAt: NOW,
      },
    });
    const claimed = await Promise.all([first.claim({ limit: 1 }), second.claim({ limit: 1 })]);
    expect(claimed.filter((job) => job !== undefined)).toHaveLength(1);
    firstDb.close();
    secondDb.close();
  });

  it('requeues a stale running job so it can be claimed again', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-jobs-stale-'));
    const database = openSqliteDatabase(path.join(dir, 'database.sqlite'));
    const jobs = createSqliteJobRepository(database);
    await jobs.enqueue({
      workspaceId: LOCAL_WORKSPACE_ID,
      job: {
        id: asJobId('job_stale'),
        workspaceId: LOCAL_WORKSPACE_ID,
        type: 'ping',
        payloadJson: '{}',
        status: 'queued',
        attempts: 0,
        createdAt: NOW,
      },
    });
    const claimed = await jobs.claim({ limit: 1 });
    expect(claimed?.status).toBe('running');
    expect(await jobs.claim({ limit: 1 })).toBeUndefined();
    const requeued = await jobs.requeueStaleRunning({ olderThanMs: 0, now: jobsNow() });
    expect(requeued).toBe(1);
    const again = await jobs.claim({ limit: 1 });
    expect(again?.id).toBe('job_stale');
    expect(again?.attempts).toBe(2);
    database.close();
  });
});

function jobsNow(): ReturnType<typeof parseIsoUtc> {
  return parseIsoUtc(new Date().toISOString());
}
