import { asEntityId, asFactId, asKnowledgeSpaceId, asWorkspaceId } from '../domain/ids.js';

import type { IsoUtcTimestamp } from '../domain/time.js';
import type { PrincipalRef } from '../identity/principal.js';
import type { Fact } from '../knowledge/fact.js';

const LIVES_IN = /\b([A-Z][a-z]+)\s+(?:moved to|lives in)\s+([A-Z][a-zA-Z]+)/u;

export function extractTypedFacts(
  content: string,
  workspaceId: string,
  spaceId: string,
  now: IsoUtcTimestamp,
  createdBy: PrincipalRef,
): Fact[] {
  const match = LIVES_IN.exec(content);
  if (match === null) {
    return [];
  }
  const subjectName = match[1];
  const place = match[2];
  return [
    {
      id: asFactId(`fact_${subjectName.toLowerCase()}_lives_in`),
      workspaceId: asWorkspaceId(workspaceId),
      knowledgeSpaceId: asKnowledgeSpaceId(spaceId),
      subject: { entityId: asEntityId(`ent_${subjectName.toLowerCase()}`) },
      predicate: { id: 'livesIn' },
      object: { kind: 'text', value: place },
      assertedAt: now,
      status: 'active',
      createdBy,
    },
  ];
}
