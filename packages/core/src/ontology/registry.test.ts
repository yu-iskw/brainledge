import { describe, expect, it } from 'vitest';

import { LOCAL_SPACE_ID } from '../domain/ids.js';

import { createInMemoryOntologyRegistry } from './registry.js';

describe('createInMemoryOntologyRegistry', () => {
  it('seeds Person with livesIn by default', () => {
    const registry = createInMemoryOntologyRegistry();
    expect(registry.getEntityType(LOCAL_SPACE_ID, 'Person')).toEqual({
      id: 'Person',
      allowedPredicates: ['livesIn', 'knows', 'worksAt', 'taught', 'taughtIn'],
    });
    expect(registry.getPredicate(LOCAL_SPACE_ID, 'livesIn')).toBe('livesIn');
  });

  it('uses register to override types for a space', () => {
    const registry = createInMemoryOntologyRegistry();
    registry.register(LOCAL_SPACE_ID, [{ id: 'Org', allowedPredicates: ['locatedIn'] }]);
    expect(registry.getEntityType(LOCAL_SPACE_ID, 'Person')).toBeUndefined();
    expect(registry.getEntityType(LOCAL_SPACE_ID, 'Org')?.id).toBe('Org');
    expect(registry.getPredicate(LOCAL_SPACE_ID, 'locatedIn')).toBe('locatedIn');
    expect(registry.getPredicate(LOCAL_SPACE_ID, 'livesIn')).toBeUndefined();
  });

  it('returns undefined for an unknown predicate', () => {
    const registry = createInMemoryOntologyRegistry();
    expect(registry.getPredicate(LOCAL_SPACE_ID, 'explodes')).toBeUndefined();
  });
});
