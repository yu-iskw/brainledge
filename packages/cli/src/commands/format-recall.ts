import { formatFactSentence } from '@brainledge/core';

export function formatRecall(result: {
  readonly memories: readonly { readonly content: string }[];
  readonly facts?: readonly {
    readonly summary: string;
    readonly subjectId?: string;
    readonly predicateId?: string;
    readonly objectText?: string;
  }[];
}): string {
  const facts = result.facts ?? [];
  const factLines = facts.map((hit) =>
    formatFactSentence({
      subjectId: hit.subjectId,
      predicateId: hit.predicateId,
      objectText: hit.objectText,
      summary: hit.summary,
    }),
  );
  const memories = result.memories.map((hit) => hit.content).join('\n---\n');
  if (factLines.length > 0) {
    const head = factLines.join('\n');
    if (memories.length === 0) {
      return head;
    }
    return `${head}\n\nNotes:\n${memories}`;
  }
  if (result.memories.length === 0) {
    return 'No memories found.';
  }
  return memories;
}
