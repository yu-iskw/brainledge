import type { EntityRef } from './entity.js';
import type { EntityId, EpisodeId, FactId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';
import type { PrincipalRef } from '../identity/principal.js';

export interface PredicateRef {
  readonly id: string;
}

export type LiteralValue =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'timestamp'; readonly value: IsoUtcTimestamp };

export type FactObject = { readonly kind: 'entity'; readonly entity: EntityRef } | LiteralValue;

export type FactStatus = 'active' | 'inferred' | 'retracted' | 'disputed';

export interface Fact {
  readonly id: FactId;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly subject: EntityRef;
  readonly predicate: PredicateRef;
  readonly object: FactObject;
  readonly validFrom?: IsoUtcTimestamp;
  readonly validUntil?: IsoUtcTimestamp;
  readonly assertedAt: IsoUtcTimestamp;
  readonly retractedAt?: IsoUtcTimestamp;
  readonly referenceTime?: IsoUtcTimestamp;
  readonly confidence?: number;
  readonly status: FactStatus;
  readonly createdBy: PrincipalRef;
  readonly sourceEpisodeId?: EpisodeId;
}

export function deriveFactStatus(fact: Fact): FactStatus {
  if (fact.retractedAt !== undefined) {
    return 'retracted';
  }
  return fact.status === 'disputed' || fact.status === 'inferred' ? fact.status : 'active';
}

export function assertFactInvariant(fact: Fact): void {
  if (fact.retractedAt !== undefined && fact.status !== 'retracted') {
    throw new Error('retractedAt requires status retracted');
  }
  if (fact.status === 'retracted' && fact.retractedAt === undefined) {
    throw new Error('status retracted requires retractedAt');
  }
}

export function factObjectKey(object: FactObject): string {
  if (object.kind === 'entity') {
    return `entity:${object.entity.entityId}`;
  }
  if (object.kind === 'timestamp') {
    return `timestamp:${object.value}`;
  }
  if (object.kind === 'boolean') {
    return `boolean:${object.value}`;
  }
  if (object.kind === 'number') {
    return `number:${object.value}`;
  }
  return `text:${object.value}`;
}

export function subjectPredicateKey(subject: EntityId, predicateId: string): string {
  return `${subject}|${predicateId}`;
}

export function factIdentityKey(
  subject: EntityId,
  predicateId: string,
  object: FactObject,
): string {
  return `${subjectPredicateKey(subject, predicateId)}|${factObjectKey(object)}`;
}

export function factVisibleAt(fact: Fact, asOf: IsoUtcTimestamp): boolean {
  const from = fact.validFrom ?? fact.assertedAt;
  const until = fact.validUntil ?? fact.retractedAt;
  return from <= asOf && (until === undefined || until > asOf);
}
