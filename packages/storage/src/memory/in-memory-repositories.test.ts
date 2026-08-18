import { LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID, localContext, parseIsoUtc } from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import {
  createInMemoryEntityRepository,
  createInMemoryFactRepository,
} from './in-memory-knowledge.js';
import {
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryStores,
} from './in-memory-repositories.js';

describe('in-memory repositories', () => {
  it('covers episode, evidence, space, job, fact, and entity methods', async () => {
    const store = createInMemoryStores();
    const episodes = createInMemoryEpisodeRepository(store);
    const evidence = createInMemoryEvidenceRepository(store);
    const spaces = createInMemorySpaceRepository(store);
    const jobs = createInMemoryJobRepository(store);
    const facts = createInMemoryFactRepository();
    const entities = createInMemoryEntityRepository();
    const now = parseIsoUtc('2026-08-18T00:00:00.000Z');
    await spaces.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      space: {
        id: LOCAL_SPACE_ID,
        workspaceId: LOCAL_WORKSPACE_ID,
        ownerPrincipalId: 'principal_local-user' as never,
        name: 'default',
        visibility: 'private',
      },
    });
    expect(
      await spaces.get({ workspaceId: LOCAL_WORKSPACE_ID, spaceId: LOCAL_SPACE_ID }),
    ).toBeDefined();
    expect((await spaces.list({ workspaceId: LOCAL_WORKSPACE_ID })).length).toBe(1);
    const episode = {
      id: 'ep_1' as never,
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
      kind: 'note' as const,
      observedAt: now,
      contentHash: 'h',
      content: 'Alice lives in Tokyo',
      hidden: false,
      metadata: {},
    };
    await episodes.insert({ workspaceId: LOCAL_WORKSPACE_ID, episode });
    expect(
      (
        await episodes.searchLexical({
          workspaceId: LOCAL_WORKSPACE_ID,
          knowledgeSpaceId: LOCAL_SPACE_ID,
          query: 'Alice',
          limit: 5,
        })
      ).length,
    ).toBe(1);
    expect(
      (
        await episodes.listRecent({
          workspaceId: LOCAL_WORKSPACE_ID,
          knowledgeSpaceId: LOCAL_SPACE_ID,
          limit: 5,
        })
      ).length,
    ).toBe(1);
    await episodes.hide({ workspaceId: LOCAL_WORKSPACE_ID, episodeId: episode.id });
    await episodes.delete({ workspaceId: LOCAL_WORKSPACE_ID, episodeId: episode.id });
    await evidence.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      evidence: {
        id: 'ev_1' as never,
        workspaceId: LOCAL_WORKSPACE_ID,
        sourceType: 'episode',
        sourceId: episode.id,
        observedAt: now,
      },
    });
    expect(
      await evidence.findById({ workspaceId: LOCAL_WORKSPACE_ID, evidenceId: 'ev_1' as never }),
    ).toBeDefined();
    await jobs.enqueue({
      workspaceId: LOCAL_WORKSPACE_ID,
      job: {
        id: 'job_1' as never,
        workspaceId: LOCAL_WORKSPACE_ID,
        type: 'ping',
        payloadJson: '{}',
        status: 'queued',
        attempts: 0,
        createdAt: now,
      },
    });
    const claimed = await jobs.claim({ limit: 1 });
    expect(claimed).toBeDefined();
    await jobs.succeed({ workspaceId: LOCAL_WORKSPACE_ID, jobId: 'job_1' as never });
    await jobs.fail({ workspaceId: LOCAL_WORKSPACE_ID, jobId: 'job_1' as never, errorCode: 'x' });
    const fact = {
      id: 'fact_1' as never,
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
      subject: { entityId: 'ent_alice' as never },
      predicate: { id: 'livesIn' },
      object: { kind: 'text' as const, value: 'Tokyo' },
      assertedAt: now,
      status: 'active' as const,
      createdBy: { principalId: 'principal_local-user' as never },
    };
    await facts.insert({ workspaceId: LOCAL_WORKSPACE_ID, fact });
    await facts.upsert({ workspaceId: LOCAL_WORKSPACE_ID, fact: { ...fact, status: 'disputed' } });
    expect(
      await facts.findById({ workspaceId: LOCAL_WORKSPACE_ID, factId: fact.id }),
    ).toBeDefined();
    await facts.findContradictions({
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
    });
    await entities.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      entity: {
        id: 'ent_alice' as never,
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        canonicalName: 'Alice',
        typeIds: ['Person'],
        createdAt: now,
      },
    });
    await entities.addAlias({
      workspaceId: LOCAL_WORKSPACE_ID,
      alias: { entityId: 'ent_alice' as never, value: 'Alice', normalizedValue: 'alice' },
    });
    expect(
      await entities.findByAlias({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        normalizedValue: 'alice',
      }),
    ).toBeDefined();
    expect(localContext().workspaceId).toBe(LOCAL_WORKSPACE_ID);
    await expect(
      episodes.insert({
        workspaceId: LOCAL_WORKSPACE_ID,
        episode: { ...episode, workspaceId: 'ws_other' as never },
      }),
    ).rejects.toThrow(/mismatch/u);
    await expect(
      evidence.insert({
        workspaceId: LOCAL_WORKSPACE_ID,
        evidence: {
          id: 'ev_bad' as never,
          workspaceId: 'ws_other' as never,
          sourceType: 'episode',
          sourceId: 'x',
          observedAt: now,
        },
      }),
    ).rejects.toThrow(/mismatch/u);
    await expect(
      spaces.insert({
        workspaceId: LOCAL_WORKSPACE_ID,
        space: {
          id: 'ks_bad' as never,
          workspaceId: 'ws_other' as never,
          ownerPrincipalId: 'principal_local-user' as never,
          name: 'bad',
          visibility: 'private',
        },
      }),
    ).rejects.toThrow(/mismatch/u);
    await expect(
      jobs.enqueue({
        workspaceId: LOCAL_WORKSPACE_ID,
        job: {
          id: 'job_bad' as never,
          workspaceId: 'ws_other' as never,
          type: 'ping',
          payloadJson: '{}',
          status: 'queued',
          attempts: 0,
          createdAt: now,
        },
      }),
    ).rejects.toThrow(/mismatch/u);
    expect(await jobs.claim({ limit: 1 })).toBeUndefined();
    expect(
      await episodes.searchLexical({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        query: 'ab',
        limit: 5,
      }),
    ).toEqual([]);
    expect(
      await facts.query({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        asOf: now,
        limit: 10,
      }),
    ).toHaveLength(1);
    expect(
      await entities.findById({ workspaceId: LOCAL_WORKSPACE_ID, entityId: 'ent_alice' as never }),
    ).toBeDefined();
    expect(
      await entities.findByAlias({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        normalizedValue: 'nobody',
      }),
    ).toBeUndefined();
    expect(
      (await entities.list({ workspaceId: LOCAL_WORKSPACE_ID, knowledgeSpaceId: LOCAL_SPACE_ID }))
        .length,
    ).toBe(1);
  });
});
