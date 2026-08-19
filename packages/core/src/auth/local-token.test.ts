import { describe, expect, it } from 'vitest';

import { asJobId, asWorkspaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { runQueuedJobs } from '../jobs/runner.js';
import { parseRuleDsl } from '../reasoning/rule-dsl.js';

import { hashLocalApiToken, verifyLocalApiToken } from './local-token.js';

import type { JobRecord, JobRepository } from '../ports/job-repository.js';

describe('local api token', () => {
  it('verifies a presented token against its hash', () => {
    const hash = hashLocalApiToken('secret-token');
    expect(verifyLocalApiToken('secret-token', hash)).toBe(true);
    expect(verifyLocalApiToken('other', hash)).toBe(false);
  });
});

describe('rule dsl', () => {
  it('parses a safe rule and rejects eval', () => {
    const rule = parseRuleDsl('rule lives: person(Alice) and city(Tokyo) => livesIn(Alice)');
    expect(rule.name).toBe('lives');
    expect(() => parseRuleDsl('rule x: eval(1) => boom(x)')).toThrow();
  });
});

describe('job runner', () => {
  it('claims and succeeds queued work', async () => {
    const jobs: JobRecord[] = [
      {
        id: asJobId('job_1'),
        workspaceId: asWorkspaceId('ws_personal'),
        type: 'ping',
        payloadJson: '{}',
        status: 'queued',
        attempts: 0,
        createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
      },
    ];
    const repo: JobRepository = {
      enqueue: () => Promise.resolve(),
      claim: () => {
        const job = jobs.find((item) => item.status === 'queued');
        if (job === undefined) {
          return Promise.resolve(undefined);
        }
        (job as { status: string }).status = 'running';
        return Promise.resolve(job);
      },
      succeed: ({ jobId }) => {
        const job = jobs.find((item) => item.id === jobId);
        if (job) {
          (job as { status: string }).status = 'succeeded';
        }
        return Promise.resolve();
      },
      fail: () => Promise.resolve(),
      requeueStaleRunning: () => Promise.resolve(0),
    };
    const processed = await runQueuedJobs(repo, {
      ping: () => Promise.resolve(),
    });
    expect(processed).toBe(1);
    expect(jobs[0]?.status).toBe('succeeded');
  });
});
