import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { documentedCosineLimits, exactVectorSearch, graphNeighbors } from './graph.js';
import { retrieve } from './retrieval.js';

import type { Fact } from '../knowledge/fact.js';

describe('retrieval helpers', () => {
  it('ranks exact cosine and walks SQL-shaped neighbors', () => {
    const ranked = exactVectorSearch(
      [1, 0],
      [
        { id: 'a', vector: [1, 0] },
        { id: 'b', vector: [0, 1] },
      ],
      1,
    );
    expect(ranked[0]?.id).toBe('a');
    const facts: Fact[] = [
      {
        id: asFactId('f1'),
        workspaceId: asWorkspaceId('ws_personal'),
        knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
        subject: { entityId: asEntityId('alice') },
        predicate: { id: 'livesIn' },
        object: { kind: 'text', value: 'Tokyo' },
        assertedAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
        status: 'active',
        createdBy: { principalId: asPrincipalId('principal_local-user') },
      },
    ];
    expect(graphNeighbors(facts, 'alice')[0]?.to).toBe('Tokyo');
    expect(retrieve({ query: '', episodes: [], facts, strategy: 'recent' }).factIds).toEqual([
      'f1',
    ]);
    expect(retrieve({ query: 'Bob', episodes: [], facts }).factIds).toEqual([]);
    expect(retrieve({ query: 'Tokyo', episodes: [], facts }).factIds).toEqual(['f1']);
    const carol: Fact = {
      id: asFactId('f2'),
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
      subject: { entityId: asEntityId('carol') },
      predicate: { id: 'livesIn' },
      object: { kind: 'text', value: 'Paris' },
      assertedAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
      status: 'active',
      createdBy: { principalId: asPrincipalId('principal_local-user') },
    };
    expect(
      retrieve({
        query: 'Where does Alice live?',
        episodes: [],
        facts: [...facts, carol],
      }).factIds,
    ).toEqual(['f1']);
    expect(documentedCosineLimits().hard).toBeGreaterThan(documentedCosineLimits().soft);
  });
});
