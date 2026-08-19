import { describe, expect, it } from 'vitest';

import {
  createCedarCompatiblePolicyEngine,
  createClassificationMask,
  createDifferentialContext,
  createExtractionArbitration,
  createFederation,
  createInMemoryGraphProjection,
  createInMemorySparql,
  createInMemoryTaskQueue,
  createLegalHold,
  createLifecycle,
  createLocalKms,
  createQualityEval,
  createReteEngine,
  encodeA2A,
  mcpApps,
  owlSubclassOf,
  postgresRlsSql,
  soc2Pack,
} from './p2-ports.js';

describe('p2 optional adapters', () => {
  it('covers policy, rls, sparql, queues, hold, mask, federation, evals, owl, rete, a2a, apps', async () => {
    const policy = createCedarCompatiblePolicyEngine([
      { user: 'p', relation: 'read', object: 'space' },
    ]);
    expect(await policy.evaluate({ principalId: 'p', action: 'read', resource: 'space' })).toBe(
      true,
    );
    expect(postgresRlsSql()).toMatch(/ROW LEVEL SECURITY/u);
    const sparql = createInMemorySparql([{ s: 'Alice', p: 'livesIn', o: 'Tokyo' }]);
    expect(await sparql.query('SELECT ?o WHERE { <Alice> <livesIn> ?o }')).toEqual([
      { o: 'Tokyo' },
    ]);
    expect(await createInMemoryTaskQueue('sqs').enqueue('ingest', '{}')).toMatch(/^sqs:/u);
    const hold = createLegalHold();
    await hold.hold('ks_default');
    expect(await hold.isHeld('ks_default')).toBe(true);
    expect(createClassificationMask().mask('x', ['secret'])).toBe('[REDACTED]');
    expect(createDifferentialContext().filterForAgent([1, 2], (item) => item === 1)).toEqual([1]);
    expect((await createFederation().share('ks_default', 'peer')).grantId).toContain('fed_');
    expect(createQualityEval().score('recall', 'a', 'a')).toBe(1);
    expect(createExtractionArbitration().pick(['a', 'b'])).toBe('a');
    expect(
      createLifecycle().staleFactIds('2026-08-01T00:00:00.000Z', [
        { id: 'f', assertedAt: '2026-01-01T00:00:00.000Z' },
      ]),
    ).toEqual(['f']);
    expect(soc2Pack().controls.length).toBeGreaterThan(0);
    expect(
      owlSubclassOf({ id: 'Employee', parents: ['Person'] }, 'Thing', [
        { id: 'Employee', parents: ['Person'] },
        { id: 'Person', parents: ['Thing'] },
        { id: 'Thing', parents: [] },
      ]),
    ).toBe(true);
    expect(
      createReteEngine([{ ifContains: 'Alice', emit: 'person' }]).ingest('Alice lives'),
    ).toContain('person');
    expect(encodeA2A({ from: 'a', to: 'b', type: 'ping', body: '{}' })).toMatch(/a2a/u);
    expect(mcpApps().map((app) => app.id)).toContain('graph');
    expect(await policy.evaluate({ principalId: 'nope', action: 'read', resource: 'space' })).toBe(
      false,
    );
    expect(await sparql.query('ASK { }')).toEqual([]);
    expect(createClassificationMask().mask('visible', ['public'])).toBe('visible');
    expect(createExtractionArbitration().pick([])).toBe('');
    expect(
      owlSubclassOf({ id: 'Thing', parents: [] }, 'Thing', [{ id: 'Thing', parents: [] }]),
    ).toBe(true);
    const kms = createLocalKms();
    expect(await kms.unwrap(await kms.wrap('secret'))).toBe('secret');
    const graph = createInMemoryGraphProjection();
    await graph.upsertFact({ subject: 'a', predicate: 'p', object: 'b' });
    expect(await graph.neighbors('a')).toEqual(['b']);
    expect(await graph.neighbors('missing')).toEqual([]);
    expect(createQualityEval().score('recall', 'a', 'b')).toBe(0);
  });
});
