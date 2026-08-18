import { describe, expect, it } from 'vitest';

import { createApplication } from '../app/create-application.js';
import { createLocalAuthorizer } from '../auth/local-authorizer.js';
import { LOCAL_SPACE_ID } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { localContext } from '../identity/local.js';
import { fixedClock } from '../ports/clock.js';
import { passthroughUnitOfWork } from '../ports/unit-of-work.js';

import { findContradictoryPairs } from './contradictions.js';

import type { Entity, EntityAlias } from '../knowledge/entity.js';
import type { Episode } from '../knowledge/episode.js';
import type { Evidence } from '../knowledge/evidence.js';
import type { Fact } from '../knowledge/fact.js';
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
  };
}

function emptySpaces(): SpaceRepository {
  return {
    get: () => Promise.resolve(undefined),
    list: () => Promise.resolve([]),
    insert: () => Promise.resolve(),
  };
}

describe('knowledge consolidate', () => {
  it('extracts a typed livesIn fact from remembered text', async () => {
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
    };
    const evidenceRepo: EvidenceRepository = {
      insert: ({ evidence }) => {
        evidenceItems.push(evidence);
        return Promise.resolve();
      },
      findById: ({ evidenceId }) =>
        Promise.resolve(evidenceItems.find((item) => item.id === evidenceId)),
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
      query: ({ limit }) =>
        Promise.resolve(facts.filter((item) => item.retractedAt === undefined).slice(0, limit)),
      findContradictions: () => Promise.resolve(findContradictoryPairs(facts)),
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
    });
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
});
