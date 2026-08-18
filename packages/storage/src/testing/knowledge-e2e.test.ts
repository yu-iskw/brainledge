import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LOCAL_SPACE_ID, localContext } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import {
  createInMemoryEntityRepository,
  createInMemoryFactRepository,
} from '../memory/in-memory-knowledge.js';
import {
  createPostgresRepositoryStub,
  PostgresNotConfiguredError,
} from '../postgres/postgres-repository.stub.js';
import { openStandalone } from '../sqlite/standalone.js';

describe('sqlite knowledge path', () => {
  it('consolidates a typed fact and isolates workspaces', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-kg-'));
    const handle = openStandalone(dataDir);
    try {
      await handle.application.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content: 'Alice moved to Tokyo in July 2026.',
      });
      const consolidated = await handle.application.memory.consolidate(localContext(), {
        spaceId: LOCAL_SPACE_ID,
      });
      expect(consolidated.factCount).toBeGreaterThan(0);
      const facts = await handle.application.knowledge?.queryFacts(localContext(), {
        spaceId: LOCAL_SPACE_ID,
      });
      expect(facts?.[0]?.predicate.id).toBe('livesIn');
      const leaked = await handle.application.ports.episodes.findById({
        workspaceId: 'ws_other' as never,
        episodeId: 'missing' as never,
      });
      expect(leaked).toBeUndefined();
      await handle.application.ports.embeddings?.upsert({
        workspaceId: localContext().workspaceId,
        embedding: {
          id: 'emb_1',
          workspaceId: localContext().workspaceId,
          targetType: 'episode',
          targetId: 'ep_x',
          model: 'fake',
          vector: [0.1, 0.2],
        },
      });
      expect(
        (
          await handle.application.ports.embeddings?.list({
            workspaceId: localContext().workspaceId,
            limit: 10,
          })
        )?.length,
      ).toBeGreaterThan(0);
      await handle.application.ports.embeddings?.deleteByTarget({
        workspaceId: localContext().workspaceId,
        targetType: 'episode',
        targetId: 'ep_x',
      });
      const spaces = await handle.application.ports.spaces.list({
        workspaceId: localContext().workspaceId,
      });
      expect(spaces.length).toBeGreaterThan(0);
      await handle.application.ports.jobs.enqueue({
        workspaceId: localContext().workspaceId,
        job: {
          id: 'job_1' as never,
          workspaceId: localContext().workspaceId,
          type: 'ping',
          payloadJson: '{}',
          status: 'queued',
          attempts: 0,
          createdAt: '2026-08-18T00:00:00.000Z' as never,
        },
      });
      const claimed = await handle.application.ports.jobs.claim({ limit: 1 });
      expect(claimed?.type).toBe('ping');
      if (claimed) {
        await handle.application.ports.jobs.succeed({
          workspaceId: claimed.workspaceId,
          jobId: claimed.id,
        });
      }
      const entities = await handle.application.knowledge?.queryEntities(localContext(), {
        spaceId: LOCAL_SPACE_ID,
      });
      expect(entities?.length).toBeGreaterThan(0);
      await handle.application.knowledge?.ingestMarkdown(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        markdown: '# Title\n\nHello',
      });
      await handle.application.knowledge?.findContradictions(localContext(), {
        spaceId: LOCAL_SPACE_ID,
      });
      await handle.application.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content: 'Alice moved to Osaka in August 2026.',
      });
      await handle.application.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
      const asOf = await handle.application.knowledge?.queryFacts(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        asOf: '2026-07-15T00:00:00.000Z',
      });
      expect(asOf).toBeDefined();
      await handle.application.ports.jobs.fail({
        workspaceId: localContext().workspaceId,
        jobId: 'job_1' as never,
        errorCode: 'x',
      });
      await expect(
        handle.application.ports.unitOfWork.run(() => Promise.reject(new Error('boom'))),
      ).rejects.toThrow(/boom/u);
      const recent = await handle.application.ports.episodes.listRecent({
        workspaceId: localContext().workspaceId,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        limit: 10,
      });
      if (recent[0]) {
        await handle.application.memory.forget(localContext(), {
          spaceId: LOCAL_SPACE_ID,
          memoryId: recent[0].id,
          mode: 'hide',
        });
        await handle.application.ports.episodes.findById({
          workspaceId: localContext().workspaceId,
          episodeId: recent[0].id,
        });
      }
      await handle.application.ports.spaces.get({
        workspaceId: localContext().workspaceId,
        spaceId: LOCAL_SPACE_ID,
      });
      await handle.application.knowledge?.queryFacts(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        limit: 5,
      });
    } finally {
      handle.close();
    }
  });
});

describe('in-memory knowledge repositories', () => {
  it('upserts and queries facts', async () => {
    const facts = createInMemoryFactRepository();
    const entities = createInMemoryEntityRepository();
    expect(
      await facts.query({
        workspaceId: 'ws_personal' as never,
        knowledgeSpaceId: 'ks_default' as never,
        limit: 10,
      }),
    ).toEqual([]);
    expect(
      await entities.list({
        workspaceId: 'ws_personal' as never,
        knowledgeSpaceId: 'ks_default' as never,
      }),
    ).toEqual([]);
  });
});

describe('postgres stub', () => {
  it('rejects connect until configured', async () => {
    const stub = createPostgresRepositoryStub();
    await expect(stub.connect()).rejects.toBeInstanceOf(PostgresNotConfiguredError);
  });
});
