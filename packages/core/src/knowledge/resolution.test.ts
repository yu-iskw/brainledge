import { describe, expect, it } from 'vitest';

import { asEntityId, asKnowledgeSpaceId, asWorkspaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { normalizeAlias, resolveEntityByAlias } from './resolution.js';

import type { Entity, EntityAlias } from './entity.js';

function asEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: asEntityId('ent_alice'),
    workspaceId: asWorkspaceId('ws_personal'),
    knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    canonicalName: 'Alice',
    typeIds: ['Person'],
    createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
    ...overrides,
  };
}

describe('normalizeAlias', () => {
  it('trims and lowercases', () => {
    expect(normalizeAlias('  Alice  ')).toBe('alice');
  });
});

describe('resolveEntityByAlias', () => {
  it('resolves via a matching alias', () => {
    const alice = asEntity();
    const aliases: readonly EntityAlias[] = [
      { entityId: alice.id, value: 'Ali', normalizedValue: 'ali' },
    ];
    expect(resolveEntityByAlias([alice], aliases, 'ALI')?.id).toBe(alice.id);
  });

  it('falls back to canonicalName when no alias matches', () => {
    const alice = asEntity({ canonicalName: ' Alice ' });
    expect(resolveEntityByAlias([alice], [], 'alice')?.canonicalName).toBe(' Alice ');
  });

  it('returns undefined when neither alias nor canonical name matches', () => {
    expect(resolveEntityByAlias([asEntity()], [], 'Bob')).toBeUndefined();
  });
});
