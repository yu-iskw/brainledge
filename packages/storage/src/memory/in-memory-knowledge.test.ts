import {
  asEntityId,
  asEpisodeId,
  asFactId,
  asKnowledgeSpaceId,
  asWorkspaceId,
  LOCAL_PRINCIPAL_ID,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  parseIsoUtc,
} from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { WORKSPACE_SCOPE_MISMATCH } from '../scope.js';

import {
  createInMemoryEntityRepository,
  createInMemoryFactRepository,
} from './in-memory-knowledge.js';

import type { Entity, Fact } from '@brainledge/core';

const ASSERTED = parseIsoUtc('2026-07-01T00:00:00.000Z');
const MID = parseIsoUtc('2026-07-15T00:00:00.000Z');
const RETRACTED = parseIsoUtc('2026-08-01T00:00:00.000Z');
const LATER = parseIsoUtc('2026-08-15T00:00:00.000Z');

function sampleFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: asFactId('fact_tokyo'),
    workspaceId: LOCAL_WORKSPACE_ID,
    knowledgeSpaceId: LOCAL_SPACE_ID,
    subject: { entityId: asEntityId('ent_alice') },
    predicate: { id: 'livesIn' },
    object: { kind: 'text', value: 'Tokyo' },
    assertedAt: ASSERTED,
    status: 'active',
    createdBy: { principalId: LOCAL_PRINCIPAL_ID },
    ...overrides,
  };
}

function sampleEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: asEntityId('ent_alice'),
    workspaceId: LOCAL_WORKSPACE_ID,
    knowledgeSpaceId: LOCAL_SPACE_ID,
    canonicalName: 'Alice',
    typeIds: ['Person'],
    createdAt: ASSERTED,
    ...overrides,
  };
}

describe('in-memory knowledge', () => {
  it('inserts, upserts, and queries facts including asOf retraction', async () => {
    const facts = createInMemoryFactRepository();
    const tokyo = sampleFact();
    await facts.insert({ workspaceId: LOCAL_WORKSPACE_ID, fact: tokyo });
    await facts.upsert({
      workspaceId: LOCAL_WORKSPACE_ID,
      fact: {
        ...tokyo,
        status: 'retracted',
        retractedAt: RETRACTED,
      },
    });
    await facts.upsert({
      workspaceId: LOCAL_WORKSPACE_ID,
      fact: sampleFact({ id: asFactId('fact_osaka'), object: { kind: 'text', value: 'Osaka' } }),
    });
    await facts.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      fact: sampleFact({
        id: asFactId('fact_other_space'),
        knowledgeSpaceId: asKnowledgeSpaceId('ks_other'),
        object: { kind: 'text', value: 'Kyoto' },
      }),
    });
    expect(
      await facts.findById({ workspaceId: LOCAL_WORKSPACE_ID, factId: asFactId('fact_tokyo') }),
    ).toMatchObject({ status: 'retracted', retractedAt: RETRACTED });
    expect(
      await facts.query({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        limit: 10,
      }),
    ).toHaveLength(1);
    expect(
      await facts.query({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        asOf: MID,
        limit: 10,
      }),
    ).toHaveLength(2);
    expect(
      await facts.query({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        asOf: LATER,
        limit: 10,
      }),
    ).toHaveLength(1);
    expect(
      await facts.query({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        limit: 1,
      }),
    ).toHaveLength(1);
    await expect(
      facts.insert({
        workspaceId: LOCAL_WORKSPACE_ID,
        fact: sampleFact({ id: asFactId('fact_bad'), workspaceId: asWorkspaceId('ws_other') }),
      }),
    ).rejects.toThrow(WORKSPACE_SCOPE_MISMATCH);
    await facts.purgeBySourceEpisode({
      workspaceId: LOCAL_WORKSPACE_ID,
      sourceEpisodeId: asEpisodeId('ep_missing'),
    });
  });

  it('finds contradictory overlapping claims in the same space', async () => {
    const facts = createInMemoryFactRepository([
      sampleFact(),
      sampleFact({ id: asFactId('fact_osaka'), object: { kind: 'text', value: 'Osaka' } }),
    ]);
    const pairs = await facts.findContradictions({
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
    });
    expect(pairs).toHaveLength(1);
    const [pair] = pairs;
    expect(pair[0].object).toEqual({ kind: 'text', value: 'Tokyo' });
    expect(pair[1].object).toEqual({ kind: 'text', value: 'Osaka' });
  });

  it('finds entities by alias and canonical name', async () => {
    const alice = sampleEntity();
    const entities = createInMemoryEntityRepository([alice]);
    expect(
      await entities.findByAlias({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        normalizedValue: 'alice',
      }),
    ).toEqual(alice);
    await entities.addAlias({
      workspaceId: LOCAL_WORKSPACE_ID,
      alias: { entityId: alice.id, value: 'Ali', normalizedValue: 'ali' },
    });
    expect(
      await entities.findByAlias({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        normalizedValue: 'ali',
      }),
    ).toEqual(alice);
    expect(
      await entities.findByAlias({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        normalizedValue: 'nobody',
      }),
    ).toBeUndefined();
  });
});
