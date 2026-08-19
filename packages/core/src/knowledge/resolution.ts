import type { Entity, EntityAlias } from './entity.js';

export function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveEntityByAlias(
  entities: readonly Entity[],
  aliases: readonly EntityAlias[],
  rawValue: string,
): Entity | undefined {
  const normalized = normalizeAlias(rawValue);
  const alias = aliases.find((item) => item.normalizedValue === normalized);
  if (alias === undefined) {
    return entities.find((entity) => normalizeAlias(entity.canonicalName) === normalized);
  }
  return entities.find((entity) => entity.id === alias.entityId);
}
