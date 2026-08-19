import { AppError, fixedClock, LOCAL_WORKSPACE_ID, parseIsoUtc } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { enqueueJob, errorBody, mapError, requestId } from './http-shared.js';

import type { ErrorBody } from './http-shared.js';
import type { Application, JobRecord } from '@brainledge/core';

const REQUEST_ID = 'req_abc';
const FIXED_NOW = parseIsoUtc('2026-08-18T00:00:00.000Z');

function recordingJson(): { json: (body: ErrorBody, status?: number) => Response } {
  return {
    json(body, status) {
      return { body, status } as unknown as Response;
    },
  };
}

describe('http-shared', () => {
  it('uses the request-id header when present and prefixes req_ otherwise', () => {
    expect(requestId('client-id')).toBe('client-id');
    expect(requestId(undefined)).toMatch(/^req_[0-9a-f-]{36}$/u);
    expect(requestId('')).toMatch(/^req_[0-9a-f-]{36}$/u);
  });

  it('builds the error body shape', () => {
    expect(errorBody('NOT_FOUND', 'missing', REQUEST_ID)).toEqual({
      error: { code: 'NOT_FOUND', message: 'missing', requestId: REQUEST_ID },
    });
  });

  it('maps AppError through the recording json helper', () => {
    expect(
      mapError(recordingJson(), new AppError('NOT_FOUND', 'missing', 404), REQUEST_ID),
    ).toEqual({
      body: errorBody('NOT_FOUND', 'missing', REQUEST_ID),
      status: 404,
    });
  });

  it('maps a generic Error to INTERNAL 500 through the recording json helper', () => {
    expect(mapError(recordingJson(), new Error('boom'), REQUEST_ID)).toEqual({
      body: errorBody('INTERNAL', 'Internal error', REQUEST_ID),
      status: 500,
    });
  });

  it('enqueues a job with the recording jobs port and fixed clock', async () => {
    const captured: JobRecord[] = [];
    const application = {
      ports: {
        jobs: {
          enqueue(input: { job: JobRecord }) {
            captured.push(input.job);
            return Promise.resolve();
          },
        },
        clock: fixedClock(FIXED_NOW),
      },
    } as Application;
    const payload = { url: 'https://example.com' };
    const jobId = await enqueueJob(application, 'ingest', payload);
    expect(captured).toHaveLength(1);
    const [job] = captured;
    expect(jobId).toBe(job.id);
    expect(job.id).toMatch(/^job_/u);
    expect(job.workspaceId).toBe(LOCAL_WORKSPACE_ID);
    expect(job.type).toBe('ingest');
    expect(job.payloadJson).toBe(JSON.stringify(payload));
    expect(job.status).toBe('queued');
    expect(job.attempts).toBe(0);
    expect(job.createdAt).toBe(FIXED_NOW);
  });
});
