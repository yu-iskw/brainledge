import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { asIngestionRunId, asKnowledgeSpaceId, asWorkspaceId, parseIsoUtc } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { openSqliteDatabase } from './database.js';
import { createSqliteIngestionRepository } from './sqlite-ingestion-repository.js';

const WS = asWorkspaceId('ws_ingest');
const SPACE = asKnowledgeSpaceId('ks_ingest');
const FIXED_TIME = parseIsoUtc('2026-08-18T00:00:00.000Z');

describe('sqlite ingestion repository', () => {
  it('finds runs by idempotency key and updates status', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-ingest-'));
    const database = openSqliteDatabase(path.join(dir, 'database.sqlite'));
    const ingestions = createSqliteIngestionRepository(database);

    await ingestions.insert({
      workspaceId: WS,
      run: {
        id: asIngestionRunId('ing_1'),
        workspaceId: WS,
        knowledgeSpaceId: SPACE,
        status: 'queued',
        idempotencyKey: 'idem-abc',
        createdAt: FIXED_TIME,
      },
    });

    const byKey = await ingestions.findByIdempotencyKey({
      workspaceId: WS,
      knowledgeSpaceId: SPACE,
      idempotencyKey: 'idem-abc',
    });
    expect(byKey?.id).toBe('ing_1');
    expect(byKey?.status).toBe('queued');

    const duplicate = await ingestions.findByIdempotencyKey({
      workspaceId: WS,
      knowledgeSpaceId: SPACE,
      idempotencyKey: 'idem-other',
    });
    expect(duplicate).toBeUndefined();

    await ingestions.updateStatus({
      workspaceId: WS,
      runId: asIngestionRunId('ing_1'),
      status: 'failed',
      errorCode: 'parse_error',
    });

    const updated = await ingestions.findById({
      workspaceId: WS,
      runId: asIngestionRunId('ing_1'),
    });
    expect(updated?.status).toBe('failed');
    expect(updated?.errorCode).toBe('parse_error');

    const leaked = await ingestions.findById({
      workspaceId: asWorkspaceId('ws_other'),
      runId: asIngestionRunId('ing_1'),
    });
    expect(leaked).toBeUndefined();

    await expect(
      ingestions.insert({
        workspaceId: WS,
        run: {
          id: asIngestionRunId('ing_bad'),
          workspaceId: asWorkspaceId('ws_other'),
          knowledgeSpaceId: SPACE,
          status: 'queued',
          createdAt: FIXED_TIME,
        },
      }),
    ).rejects.toThrow('workspace scope mismatch');

    database.close();
  });
});
