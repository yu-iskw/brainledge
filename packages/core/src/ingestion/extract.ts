import { asEntityId, asFactId, asKnowledgeSpaceId, asWorkspaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import type { IsoUtcTimestamp } from '../domain/time.js';
import type { PrincipalRef } from '../identity/principal.js';
import type { Fact } from '../knowledge/fact.js';

const MONTHS: Readonly<Record<string, string>> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

const LIVES_IN =
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded month name alternation after a proper name
  /\b([A-Z][a-z]+)\s+(?:moved to|lives in)\s+([A-Z][a-zA-Z]+)(?:\s+in\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4}))?/gu;
const WORKS_AT = /\b([A-Z][a-z]+)\s+works at(?: the)? ([A-Za-z][A-Za-z-]*)/gu;
const TAUGHT = /\b([A-Z][a-z]+)\s+taught ([a-z]+ [a-z]+|[a-z]+)\s+in\s+([A-Z][a-zA-Z]+)/gu;

function titleCase(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '_');
}

function worldMonthStart(
  month: string | undefined,
  year: string | undefined,
): IsoUtcTimestamp | undefined {
  if (month === undefined || year === undefined) {
    return undefined;
  }
  const mm = MONTHS[month.toLowerCase()];
  return parseIsoUtc(`${year}-${mm}-01T00:00:00.000Z`);
}

function fact(input: {
  subjectName: string;
  predicate: string;
  objectValue: string;
  workspaceId: string;
  spaceId: string;
  now: IsoUtcTimestamp;
  createdBy: PrincipalRef;
  validFrom?: IsoUtcTimestamp;
}): Fact {
  const subject = input.subjectName.toLowerCase();
  return {
    id: asFactId(`fact_${subject}_${slug(input.predicate)}_${slug(input.objectValue)}`),
    workspaceId: asWorkspaceId(input.workspaceId),
    knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
    subject: { entityId: asEntityId(`ent_${subject}`) },
    predicate: { id: input.predicate },
    object: { kind: 'text', value: input.objectValue },
    assertedAt: input.now,
    validFrom: input.validFrom,
    status: 'active',
    createdBy: input.createdBy,
  };
}

export function extractTypedFacts(
  content: string,
  workspaceId: string,
  spaceId: string,
  now: IsoUtcTimestamp,
  createdBy: PrincipalRef,
): Fact[] {
  const facts: Fact[] = [];
  const emit = (
    subjectName: string,
    predicate: string,
    objectValue: string,
    validFrom?: IsoUtcTimestamp,
  ): void => {
    facts.push(
      fact({
        subjectName,
        predicate,
        objectValue,
        workspaceId,
        spaceId,
        now,
        createdBy,
        validFrom,
      }),
    );
  };
  for (const match of content.matchAll(LIVES_IN)) {
    emit(match[1], 'livesIn', match[2], worldMonthStart(match[3], match[4]));
  }
  for (const match of content.matchAll(WORKS_AT)) {
    emit(match[1], 'worksAt', titleCase(match[2]));
  }
  for (const match of content.matchAll(TAUGHT)) {
    emit(match[1], 'taught', titleCase(match[2]));
    emit(match[1], 'taughtIn', match[3]);
  }
  return facts;
}
