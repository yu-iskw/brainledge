import { tokenBudgetTrim } from './recall-support.js';

import type { MemoryHit, RecallResult } from '../memory/types.js';

export function buildContext(
  result: RecallResult,
  maxTokens: number,
): {
  readonly text: string;
  readonly omitted: number;
} {
  const { kept, omitted } = tokenBudgetTrim(
    result.memories.map((hit: MemoryHit) => hit.content),
    maxTokens,
  );
  return { text: kept.join('\n---\n'), omitted };
}
