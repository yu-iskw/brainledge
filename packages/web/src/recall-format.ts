import { formatFactSentence } from './display.js';

import type { FactHit } from './types.js';

export function formatFactHit(
  hit: Pick<FactHit, 'summary' | 'objectText' | 'subjectId' | 'predicateId'>,
): string {
  return formatFactSentence({
    subjectId: hit.subjectId,
    predicateId: hit.predicateId,
    objectText: hit.objectText,
    summary: hit.summary,
  });
}

export function formatRecallFacts(
  facts: readonly Pick<FactHit, 'summary' | 'objectText' | 'subjectId' | 'predicateId'>[],
): string {
  return facts.map((hit) => formatFactHit(hit)).join('\n');
}
