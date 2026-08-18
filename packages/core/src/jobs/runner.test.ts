import { describe, expect, it } from 'vitest';

import { LOCAL_WORKSPACE_ID, asJobId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { runQueuedJobs } from './runner.js';

import type { JobId } from '../domain/ids.js';
import type { JobRecord, JobRepository } from '../ports/job-repository.js';

function queuedJob(id: string, type: string): JobRecord {
  return {
    id: asJobId(id),
    workspaceId: LOCAL_WORKSPACE_ID,
    type,
    payloadJson: '{}',
    status: 'queued',
    attempts: 0,
    createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
  };
}

function createQueueRepository(queue: JobRecord[]): {
  repo: JobRepository;
  succeeded: JobId[];
  failed: { readonly jobId: JobId; readonly errorCode: string }[];
} {
  const succeeded: JobId[] = [];
  const failed: { readonly jobId: JobId; readonly errorCode: string }[] = [];
  return {
    succeeded,
    failed,
    repo: {
      enqueue: ({ job }) => {
        queue.push(job);
        return Promise.resolve();
      },
      claim: () => Promise.resolve(queue.shift()),
      succeed: ({ jobId }) => {
        succeeded.push(jobId);
        return Promise.resolve();
      },
      fail: ({ jobId, errorCode }) => {
        failed.push({ jobId, errorCode });
        return Promise.resolve();
      },
    },
  };
}

describe('runQueuedJobs', () => {
  it('returns 0 when the queue is empty', async () => {
    const { repo } = createQueueRepository([]);
    expect(await runQueuedJobs(repo, {})).toBe(0);
  });

  it('runs a known handler and records succeed ids', async () => {
    const { repo, succeeded, failed } = createQueueRepository([queuedJob('job_ok', 'ping')]);
    expect(
      await runQueuedJobs(repo, {
        ping: () => Promise.resolve(),
      }),
    ).toBe(1);
    expect(succeeded).toEqual([asJobId('job_ok')]);
    expect(failed).toEqual([]);
  });

  it('fails unknown types as UNKNOWN_JOB_TYPE', async () => {
    const { repo, succeeded, failed } = createQueueRepository([
      queuedJob('job_unknown', 'mystery'),
    ]);
    expect(await runQueuedJobs(repo, {})).toBe(1);
    expect(succeeded).toEqual([]);
    expect(failed).toEqual([{ jobId: asJobId('job_unknown'), errorCode: 'UNKNOWN_JOB_TYPE' }]);
  });

  it('records JOB_FAILED: when a handler throws', async () => {
    const { repo, failed } = createQueueRepository([queuedJob('job_boom', 'ping')]);
    expect(
      await runQueuedJobs(repo, {
        ping: () => Promise.reject(new Error('boom')),
      }),
    ).toBe(1);
    expect(failed).toEqual([{ jobId: asJobId('job_boom'), errorCode: 'JOB_FAILED:boom' }]);
  });

  it('stops at the max cap even when more jobs remain', async () => {
    const queue = [
      queuedJob('job_1', 'ping'),
      queuedJob('job_2', 'ping'),
      queuedJob('job_3', 'ping'),
    ];
    const { repo, succeeded } = createQueueRepository(queue);
    expect(
      await runQueuedJobs(
        repo,
        {
          ping: () => Promise.resolve(),
        },
        2,
      ),
    ).toBe(2);
    expect(succeeded).toEqual([asJobId('job_1'), asJobId('job_2')]);
    expect(queue).toHaveLength(1);
  });
});
