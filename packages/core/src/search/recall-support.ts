export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const [index, leftValue] of left.entries()) {
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }
  const denom = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  if (denom === 0) {
    return 0;
  }
  return dot / denom;
}

export function tokenBudgetTrim(
  texts: readonly string[],
  maxTokens: number,
): {
  readonly kept: readonly string[];
  readonly omitted: number;
} {
  const kept: string[] = [];
  let used = 0;
  let omitted = 0;
  for (const text of texts) {
    const estimate = Math.max(1, Math.ceil(text.length / 4));
    if (used + estimate > maxTokens) {
      omitted += 1;
      continue;
    }
    kept.push(text);
    used += estimate;
  }
  return { kept, omitted };
}
