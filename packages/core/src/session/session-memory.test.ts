import { describe, expect, it } from 'vitest';

import { sha256 } from '../domain/hash.js';
import { asEpisodeId, asKnowledgeSpaceId, asPrincipalId, asWorkspaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { sessionEpisodes } from './session-memory.js';

import type { Episode } from '../knowledge/episode.js';

function asEpisode(overrides: Partial<Episode> = {}): Episode {
  const content = 'session note';
  return {
    id: asEpisodeId('ep_1'),
    workspaceId: asWorkspaceId('ws_personal'),
    knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    principalId: asPrincipalId('principal_local-user'),
    kind: 'note',
    observedAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
    contentHash: sha256(content),
    content,
    hidden: false,
    metadata: { sessionId: 's1' },
    ...overrides,
  };
}

describe('sessionEpisodes', () => {
  it('keeps notes whose metadata.sessionId matches', () => {
    const matching = asEpisode();
    const otherSession = asEpisode({
      id: asEpisodeId('ep_2'),
      metadata: { sessionId: 's2' },
    });
    expect(sessionEpisodes([matching, otherSession], 's1')).toEqual([matching]);
  });

  it('excludes notes without a sessionId', () => {
    const unscoped = asEpisode({
      id: asEpisodeId('ep_3'),
      metadata: { source: 'cli' },
    });
    expect(sessionEpisodes([unscoped], 's1')).toEqual([]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(sessionEpisodes([], 's1')).toEqual([]);
    expect(sessionEpisodes([asEpisode()], 'missing')).toEqual([]);
  });
});
