import { describe, expect, it } from 'vitest';

import { createApplication } from '../app/create-application.js';
import { createLocalAuthorizer } from '../auth/local-authorizer.js';
import { LOCAL_SPACE_ID } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { localContext } from '../identity/local.js';
import { fixedClock } from '../ports/clock.js';
import { passthroughUnitOfWork } from '../ports/unit-of-work.js';

import { findContradictoryPairs } from './contradictions.js';
import { factVisibleAt } from './fact.js';

import type { Entity, EntityAlias } from '../knowledge/entity.js';
import type { Episode } from '../knowledge/episode.js';
import type { Evidence } from '../knowledge/evidence.js';
import type { Fact } from '../knowledge/fact.js';
import type { TextGenerationProvider } from '../models/providers.js';
import type { EntityRepository } from '../ports/entity-repository.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { EvidenceRepository } from '../ports/evidence-repository.js';
import type { FactRepository } from '../ports/fact-repository.js';
import type { JobRepository } from '../ports/job-repository.js';
import type { SpaceRepository } from '../ports/space-repository.js';

function emptyJobs(): JobRepository {
  return {
    enqueue: () => Promise.resolve(),
    claim: () => Promise.resolve(undefined),
    succeed: () => Promise.resolve(),
    fail: () => Promise.resolve(),
    requeueStaleRunning: () => Promise.resolve(0),
  };
}

function emptySpaces(): SpaceRepository {
  return {
    get: () => Promise.resolve(undefined),
    list: () => Promise.resolve([]),
    insert: () => Promise.resolve(),
    update: () => Promise.resolve(),
    remove: () => Promise.resolve(),
  };
}

function knowledgeApp(textGenerationProvider?: TextGenerationProvider) {
  const episodes: Episode[] = [];
  const evidenceItems: Evidence[] = [];
  const facts: Fact[] = [];
  const entities: Entity[] = [];
  const aliases: EntityAlias[] = [];
  const episodeRepo: EpisodeRepository = {
    insert: ({ episode }) => {
      episodes.push(episode);
      return Promise.resolve();
    },
    findById: ({ episodeId }) => Promise.resolve(episodes.find((item) => item.id === episodeId)),
    searchLexical: ({ limit }) => Promise.resolve(episodes.slice(0, limit)),
    listRecent: ({ limit }) => Promise.resolve(episodes.slice(0, limit)),
    hide: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    purge: () => Promise.resolve(),
  };
  const evidenceRepo: EvidenceRepository = {
    insert: ({ evidence }) => {
      evidenceItems.push(evidence);
      return Promise.resolve();
    },
    findById: ({ evidenceId }) =>
      Promise.resolve(evidenceItems.find((item) => item.id === evidenceId)),
    purgeBySource: ({ sourceId }) => {
      for (let index = evidenceItems.length - 1; index >= 0; index -= 1) {
        if (evidenceItems[index]?.sourceId === sourceId) {
          evidenceItems.splice(index, 1);
        }
      }
      return Promise.resolve();
    },
  };
  const factRepo: FactRepository = {
    insert: ({ fact }) => {
      facts.push(fact);
      return Promise.resolve();
    },
    upsert: ({ fact }) => {
      const index = facts.findIndex((item) => item.id === fact.id);
      if (index >= 0) {
        facts[index] = fact;
      } else {
        facts.push(fact);
      }
      return Promise.resolve();
    },
    findById: ({ factId }) => Promise.resolve(facts.find((item) => item.id === factId)),
    query: ({ asOf, limit }) =>
      Promise.resolve(
        facts
          .filter((item) =>
            asOf === undefined ? item.retractedAt === undefined : factVisibleAt(item, asOf),
          )
          .slice(0, limit),
      ),
    findContradictions: () => Promise.resolve(findContradictoryPairs(facts)),
    purgeBySourceEpisode: ({ sourceEpisodeId }) => {
      for (let index = facts.length - 1; index >= 0; index -= 1) {
        if (facts[index]?.sourceEpisodeId === sourceEpisodeId) {
          facts.splice(index, 1);
        }
      }
      return Promise.resolve();
    },
  };
  const entityRepo: EntityRepository = {
    insert: ({ entity }) => {
      entities.push(entity);
      return Promise.resolve();
    },
    findById: ({ entityId }) => Promise.resolve(entities.find((item) => item.id === entityId)),
    findByAlias: ({ normalizedValue }) =>
      Promise.resolve(
        entities.find((item) => item.canonicalName.toLowerCase() === normalizedValue),
      ),
    addAlias: ({ alias }) => {
      aliases.push(alias);
      return Promise.resolve();
    },
    list: () => Promise.resolve(entities),
  };
  const app = createApplication({
    clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
    unitOfWork: passthroughUnitOfWork(),
    authorizer: createLocalAuthorizer(),
    episodes: episodeRepo,
    evidence: evidenceRepo,
    spaces: emptySpaces(),
    jobs: emptyJobs(),
    facts: factRepo,
    entities: entityRepo,
    textGenerationProvider,
  });
  return { app, aliases };
}

describe('knowledge consolidate', () => {
  it('extracts a typed livesIn fact from remembered text', async () => {
    const { app, aliases } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const result = await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(result.factCount).toBeGreaterThan(0);
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(queried?.[0]?.predicate.id).toBe('livesIn');
    expect(aliases.length).toBeGreaterThan(0);
  });

  it('keeps two taught facts for the same person instead of superseding by predicate only', async () => {
    const { app } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Thales taught geometry in Miletus. Thales taught astronomy in Miletus.',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    const taught = queried?.filter((item) => item.predicate.id === 'taught') ?? [];
    expect(taught.map((item) => (item.object.kind === 'text' ? item.object.value : ''))).toEqual(
      expect.arrayContaining(['Geometry', 'Astronomy']),
    );
    expect(taught).toHaveLength(2);
  });

  it('supersedes a functional livesIn when the object changes', async () => {
    const { app } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Paris in August 2026.',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    const active = queried?.filter((item) => item.retractedAt === undefined) ?? [];
    expect(active).toHaveLength(1);
    expect(active[0]?.object).toEqual({ kind: 'text', value: 'Paris' });
    const july = await app.knowledge?.queryFacts(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      asOf: '2026-07-15T23:59:59.000Z',
    });
    expect(july?.map((item) => (item.object.kind === 'text' ? item.object.value : ''))).toEqual([
      'Tokyo',
    ]);
    const julyRecall = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Where does Alice live?',
      asOf: '2026-07-15T23:59:59.000Z',
    });
    expect(julyRecall.facts.map((fact) => fact.objectText)).toEqual(['Tokyo']);
  });

  it('does not insert a duplicate livesIn when consolidating twice', async () => {
    const { app } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    const second = await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(second.factCount).toBe(0);
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(queried?.filter((item) => item.retractedAt === undefined)).toHaveLength(1);
  });

  it('previews livesIn supersession without persisting', async () => {
    const { app } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Paris in August 2026.',
    });
    const preview = await app.knowledge?.previewExtract(localContext(), {
      spaceId: LOCAL_SPACE_ID,
    });
    expect(preview?.factCount).toBe(1);
    expect(preview?.proposed[0]?.objectText).toBe('Paris');
    expect(preview?.proposed[0]?.closes).toBe('Alice lives in Tokyo');
    const stillTokyo = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(stillTokyo?.filter((item) => item.retractedAt === undefined)).toHaveLength(1);
    expect(stillTokyo?.[0]?.object).toEqual({ kind: 'text', value: 'Tokyo' });
  });

  it('persists only accepted proposed facts', async () => {
    const { app } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026. Dana works at the cafe.',
    });
    const preview = await app.knowledge?.previewExtract(localContext(), {
      spaceId: LOCAL_SPACE_ID,
    });
    expect(preview?.factCount).toBe(2);
    const alice = preview?.proposed.find((item) => item.predicateId === 'livesIn');
    expect(alice).toBeDefined();
    const result = await app.memory.consolidate(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      accept: alice === undefined ? [] : [alice],
    });
    expect(result.factCount).toBe(1);
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    const active = queried?.filter((item) => item.retractedAt === undefined) ?? [];
    expect(active).toHaveLength(1);
    expect(active[0]?.predicate.id).toBe('livesIn');
    expect(alice?.validFrom).toBe('2026-07-01T00:00:00.000Z');
    expect(active[0]?.validFrom).toBe('2026-07-01T00:00:00.000Z');
  });

  it('keeps world-time as-of when accepting a livesIn supersession', async () => {
    const { app } = knowledgeApp();
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const tokyoPreview = await app.knowledge?.previewExtract(localContext(), {
      spaceId: LOCAL_SPACE_ID,
    });
    await app.memory.consolidate(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      accept: tokyoPreview?.proposed ?? [],
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Paris in August 2026.',
    });
    const parisPreview = await app.knowledge?.previewExtract(localContext(), {
      spaceId: LOCAL_SPACE_ID,
    });
    expect(parisPreview?.proposed[0]?.validFrom).toBe('2026-08-01T00:00:00.000Z');
    await app.memory.consolidate(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      accept: parisPreview?.proposed ?? [],
    });
    const july = await app.knowledge?.queryFacts(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      asOf: '2026-07-15T23:59:59.000Z',
    });
    expect(july?.map((item) => (item.object.kind === 'text' ? item.object.value : ''))).toEqual([
      'Tokyo',
    ]);
  });

  it('keeps regex livesIn when the LLM proposes a different city', async () => {
    const { app } = knowledgeApp({
      generate: () =>
        Promise.resolve({
          text: JSON.stringify({
            facts: [{ subject: 'Alice', predicate: 'livesIn', object: 'Paris' }],
          }),
          model: 'fake',
        }),
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    const active = queried?.filter((item) => item.retractedAt === undefined) ?? [];
    expect(active).toHaveLength(1);
    expect(active[0]?.object).toEqual({ kind: 'text', value: 'Tokyo' });
  });

  it('merges LLM facts behind regex extract', async () => {
    const { app } = knowledgeApp({
      generate: () =>
        Promise.resolve({
          text: JSON.stringify({
            facts: [{ subject: 'Alice', predicate: 'knows', object: 'Carol' }],
          }),
          model: 'fake',
        }),
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    const queried = await app.knowledge?.queryFacts(localContext(), { spaceId: LOCAL_SPACE_ID });
    const predicates = queried?.map((item) => item.predicate.id).sort();
    expect(predicates).toEqual(['knows', 'livesIn']);
  });

  it('does not call text generation during remember', async () => {
    let generateCalls = 0;
    const { app } = knowledgeApp({
      generate: () => {
        generateCalls += 1;
        return Promise.reject(new Error('LLM should not run on remember'));
      },
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    expect(generateCalls).toBe(0);
    const recalled = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Alice',
    });
    expect(recalled.memories[0]?.content).toMatch(/Tokyo/u);
  });

  it('keeps regex facts when the LLM provider throws', async () => {
    const { app } = knowledgeApp({
      generate: () => Promise.reject(new Error('provider down')),
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const result = await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(result.factCount).toBe(1);
  });

  it('does not call the LLM when persisting an accept list', async () => {
    let generateCalls = 0;
    const { app } = knowledgeApp({
      generate: () => {
        generateCalls += 1;
        return Promise.resolve({
          text: JSON.stringify({
            facts: [{ subject: 'Alice', predicate: 'knows', object: 'Carol' }],
          }),
          model: 'fake',
        });
      },
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const preview = await app.knowledge?.previewExtract(localContext(), {
      spaceId: LOCAL_SPACE_ID,
    });
    expect(generateCalls).toBe(1);
    const accepted = preview?.proposed ?? [];
    expect(accepted.some((item) => item.predicateId === 'knows')).toBe(true);
    generateCalls = 0;
    const result = await app.memory.consolidate(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      accept: accepted,
    });
    expect(generateCalls).toBe(0);
    expect(result.factCount).toBe(2);
  });
});
