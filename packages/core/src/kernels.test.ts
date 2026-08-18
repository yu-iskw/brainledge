import { describe, expect, it } from 'vitest';

import {
  asDecisionId,
  asEntityId,
  asFactId,
  asIngestionRunId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from './domain/ids.js';
import { parseIsoUtc } from './domain/time.js';
import { AppError, isAppError } from './errors/app-error.js';
import { assertSafeRelativePath } from './ingestion/ssrf.js';
import { createDecision } from './knowledge/decision.js';
import { exportFactsJsonLd } from './knowledge/rdf-export.js';
import {
  createAnthropicCompatibleProvider,
  createVertexCompatibleProvider,
} from './models/openai-compatible.js';
import {
  createFakeEmbeddingProvider,
  createFakeTextGenerationProvider,
} from './models/providers.js';
import { buildContext } from './search/context-builder.js';
import { graphPath } from './search/graph.js';
import { createIdentityReranker } from './search/rerank.js';
import { sessionEpisodes } from './session/session-memory.js';

import type { Episode } from './knowledge/episode.js';
import type { Fact } from './knowledge/fact.js';

const fact: Fact = {
  id: asFactId('f1'),
  workspaceId: asWorkspaceId('ws_personal'),
  knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
  subject: { entityId: asEntityId('alice') },
  predicate: { id: 'livesIn' },
  object: { kind: 'text', value: 'Tokyo' },
  assertedAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
  status: 'active',
  createdBy: { principalId: asPrincipalId('principal_local-user') },
};

describe('remaining kernels', () => {
  it('covers errors, rdf, context, session, decisions, providers, ssrf, graph path', async () => {
    const error = new AppError('X', 'no', 400);
    expect(isAppError(error)).toBe(true);
    expect(exportFactsJsonLd([fact])['@graph']).toHaveLength(1);
    const context = buildContext(
      {
        memories: [
          { episodeId: 'e', content: 'hello world', score: 1, observedAt: fact.assertedAt },
        ],
        facts: [],
        entities: [],
        priorDecisions: [],
        policies: [],
        provenanceSummary: [],
      },
      10,
    );
    expect(context.text).toMatch(/hello/u);
    const episode = {
      id: 'e1',
      metadata: { sessionId: 's1' },
    } as unknown as Episode;
    expect(sessionEpisodes([episode], 's1')).toHaveLength(1);
    expect(
      createDecision({
        id: 'd1' as never,
        workspaceId: fact.workspaceId,
        knowledgeSpaceId: fact.knowledgeSpaceId,
        action: 'keep',
        rationale: 'ok',
        snapshot: {
          workspaceId: fact.workspaceId,
          knowledgeSpaceId: fact.knowledgeSpaceId,
          episodeIds: [],
          factIds: [],
          capturedAt: fact.assertedAt,
        },
        createdAt: fact.assertedAt,
      }).action,
    ).toBe('keep');
    expect((await createFakeTextGenerationProvider().generate({ prompt: 'hi' })).text).toMatch(
      /echo/u,
    );
    expect((await createFakeEmbeddingProvider(4).embed({ texts: ['hi'] })).vectors[0]).toHaveLength(
      4,
    );
    expect(() => assertSafeRelativePath('/etc/passwd')).toThrow();
    expect(graphPath([fact], 'alice', 'Tokyo')).toEqual(['alice', 'Tokyo']);
    expect(createVertexCompatibleProvider).toBeTypeOf('function');
    expect(createAnthropicCompatibleProvider).toBeTypeOf('function');
    expect(asIngestionRunId('ing_1')).toBe('ing_1');
    expect(asDecisionId('dec_1')).toBe('dec_1');
    expect(createIdentityReranker().rerank(['a', 'b'], 'q')).toEqual(['a', 'b']);
  });
});
