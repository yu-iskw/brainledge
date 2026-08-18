import { describe, expect, it } from 'vitest';

import {
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  asIngestionRunId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { createInMemoryIngestionRepository } from './in-memory-ingestion.js';

import type { IngestionRun } from '../ports/ingestion-repository.js';

function queuedRun(overrides: Partial<IngestionRun> = {}): IngestionRun {
  return {
    id: asIngestionRunId('ing_1'),
    workspaceId: LOCAL_WORKSPACE_ID,
    knowledgeSpaceId: LOCAL_SPACE_ID,
    status: 'queued',
    createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

describe('createInMemoryIngestionRepository', () => {
  it('inserts, finds by id and idempotency key, then updates status', async () => {
    const repo = createInMemoryIngestionRepository();
    const run = queuedRun();
    await repo.insert({ workspaceId: LOCAL_WORKSPACE_ID, run });
    expect(await repo.findById({ workspaceId: LOCAL_WORKSPACE_ID, runId: run.id })).toEqual(run);
    expect(
      await repo.findByIdempotencyKey({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        idempotencyKey: 'idem-1',
      }),
    ).toEqual(run);
    await repo.updateStatus({
      workspaceId: LOCAL_WORKSPACE_ID,
      runId: run.id,
      status: 'failed',
      errorCode: 'INGEST_FAILED',
    });
    expect(await repo.findById({ workspaceId: LOCAL_WORKSPACE_ID, runId: run.id })).toMatchObject({
      status: 'failed',
      errorCode: 'INGEST_FAILED',
    });
  });

  it('rejects insert when the run workspace does not match the scope', async () => {
    const repo = createInMemoryIngestionRepository();
    await expect(
      repo.insert({
        workspaceId: LOCAL_WORKSPACE_ID,
        run: queuedRun({ workspaceId: asWorkspaceId('ws_other') }),
      }),
    ).rejects.toThrow(/workspace scope mismatch/u);
  });
});

describe('IngestionRun', () => {
  it('brands id, scopes workspace and space, starts queued, and stores createdAt as ISO UTC', () => {
    const run = queuedRun();
    expect(run.id).toBe(asIngestionRunId('ing_1'));
    expect(run.workspaceId).toBe(LOCAL_WORKSPACE_ID);
    expect(run.knowledgeSpaceId).toBe(LOCAL_SPACE_ID);
    expect(run.status).toBe('queued');
    expect(run.createdAt).toBe(parseIsoUtc('2026-08-18T00:00:00.000Z'));
  });
});
