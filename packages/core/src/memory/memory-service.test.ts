import { describe, expect, it } from 'vitest';

import { createLocalAuthorizer } from '../auth/local-authorizer.js';
import { LOCAL_SPACE_ID } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { localContext } from '../identity/local.js';
import { fixedClock } from '../ports/clock.js';
import { passthroughUnitOfWork } from '../ports/unit-of-work.js';

import { createMemoryService } from './memory-service.js';

import type { Episode } from '../knowledge/episode.js';
import type { Evidence } from '../knowledge/evidence.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { EvidenceRepository } from '../ports/evidence-repository.js';

function inArrayRepos(): { episodes: EpisodeRepository; evidence: EvidenceRepository } {
  const episodes: Episode[] = [];
  const evidenceItems: Evidence[] = [];
  return {
    episodes: {
      insert: ({ episode }) => {
        episodes.push(episode);
        return Promise.resolve();
      },
      findById: ({ episodeId }) => Promise.resolve(episodes.find((item) => item.id === episodeId)),
      searchLexical: ({ knowledgeSpaceId, query, limit }) => {
        const tokens = query
          .toLowerCase()
          .split(/\W+/u)
          .filter((token) => token.length > 2);
        return Promise.resolve(
          episodes
            .filter(
              (item) =>
                item.knowledgeSpaceId === knowledgeSpaceId &&
                !item.hidden &&
                item.deletedAt === undefined,
            )
            .filter(
              (item) =>
                tokens.length === 0 ||
                tokens.some((token) => item.content.toLowerCase().includes(token)),
            )
            .slice(0, limit),
        );
      },
      listRecent: ({ knowledgeSpaceId, limit }) =>
        Promise.resolve(
          episodes
            .filter(
              (item) =>
                item.knowledgeSpaceId === knowledgeSpaceId &&
                !item.hidden &&
                item.deletedAt === undefined,
            )
            .slice(0, limit),
        ),
      hide: ({ episodeId }) => {
        const index = episodes.findIndex((item) => item.id === episodeId);
        const found = index >= 0 ? episodes[index] : undefined;
        if (found !== undefined) {
          episodes[index] = { ...found, hidden: true };
        }
        return Promise.resolve();
      },
      delete: ({ episodeId }) => {
        const index = episodes.findIndex((item) => item.id === episodeId);
        if (index >= 0) {
          episodes.splice(index, 1);
        }
        return Promise.resolve();
      },
    },
    evidence: {
      insert: ({ evidence }) => {
        evidenceItems.push(evidence);
        return Promise.resolve();
      },
      findById: ({ evidenceId }) =>
        Promise.resolve(evidenceItems.find((item) => item.id === evidenceId)),
    },
  };
}

describe('createMemoryService', () => {
  it('recalls a remembered Alice Tokyo note and consolidates 0 facts without knowledge', async () => {
    const repos = inArrayRepos();
    const memory = createMemoryService({
      authorizer: createLocalAuthorizer(),
      clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
      unitOfWork: passthroughUnitOfWork(),
      episodes: repos.episodes,
      evidence: repos.evidence,
    });
    await memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice lives in Tokyo.',
    });
    const recalled = await memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Alice Tokyo',
    });
    expect(recalled.memories[0]?.content).toBe('Alice lives in Tokyo.');
    expect(await memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID })).toEqual({
      factCount: 0,
    });
  });
});
