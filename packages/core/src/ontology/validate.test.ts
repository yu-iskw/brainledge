import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { createInMemoryOntologyRegistry } from './registry.js';
import { validateFactsAgainstOntology } from './validate.js';

import type { Fact } from '../knowledge/fact.js';

describe('ontology validation', () => {
  it('fails a bad predicate against the registry', () => {
    const fact: Fact = {
      id: asFactId('f1'),
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
      subject: { entityId: asEntityId('alice') },
      predicate: { id: 'explodes' },
      object: { kind: 'text', value: 'x' },
      assertedAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
      status: 'active',
      createdBy: { principalId: asPrincipalId('principal_local-user') },
    };
    const result = validateFactsAgainstOntology(
      [fact],
      [{ id: 'livesIn', allowedPredicates: ['livesIn'] }],
    );
    expect(result.valid).toBe(false);
    const registry = createInMemoryOntologyRegistry();
    registry.register('ks_default' as never, [{ id: 'Person', allowedPredicates: ['livesIn'] }]);
    expect(registry.getEntityType('ks_default' as never, 'Person')?.id).toBe('Person');
    expect(registry.getPredicate('ks_default' as never, 'livesIn')).toBe('livesIn');
    expect(registry.validateFacts('ks_default' as never, [fact]).valid).toBe(false);
  });
});
