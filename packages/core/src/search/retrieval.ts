import { lexicalTokens } from './lexical.js';
import { cosineSimilarity, tokenBudgetTrim } from './recall-support.js';

import type { Episode } from '../knowledge/episode.js';
import type { Fact } from '../knowledge/fact.js';

type RetrievalStrategy = 'recent' | 'lexical' | 'vector' | 'graph' | 'entity' | 'prior-decision';

interface RetrievalInput {
  readonly query: string;
  readonly episodes: readonly Episode[];
  readonly facts: readonly Fact[];
  readonly vectors?: readonly { readonly targetId: string; readonly vector: readonly number[] }[];
  readonly queryVector?: readonly number[];
  readonly maxTokens?: number;
  readonly strategy?: RetrievalStrategy;
}

interface RetrievalOutput {
  readonly episodeIds: readonly string[];
  readonly factIds: readonly string[];
  readonly omitted: number;
  readonly strategy: RetrievalStrategy;
}

export function retrieve(input: RetrievalInput): RetrievalOutput {
  const strategy = input.strategy ?? inferStrategy(input.query);
  let episodes = [...input.episodes];
  if (strategy === 'lexical') {
    const tokens = lexicalTokens(input.query);
    episodes = episodes.filter((episode) =>
      tokens.some((token) => episode.content.toLowerCase().includes(token)),
    );
  }
  if (strategy === 'vector' && input.queryVector && input.vectors) {
    const ranked = input.vectors
      .map((item) => ({
        targetId: item.targetId,
        score: cosineSimilarity(input.queryVector ?? [], item.vector),
      }))
      .sort((left, right) => right.score - left.score);
    const allowed = new Set(ranked.slice(0, 20).map((item) => item.targetId));
    episodes = episodes.filter((episode) => allowed.has(episode.id));
  }
  if (strategy === 'entity') {
    const lowered = input.query.toLowerCase();
    episodes = episodes.filter((episode) => episode.content.toLowerCase().includes(lowered));
  }
  const trimmed = tokenBudgetTrim(
    episodes.map((episode) => episode.content),
    input.maxTokens ?? 2000,
  );
  const kept = new Set(trimmed.kept);
  const keptEpisodes = episodes.filter((episode) => kept.has(episode.content));
  return {
    strategy,
    omitted: trimmed.omitted,
    episodeIds: keptEpisodes.map((episode) => episode.id),
    factIds: input.facts.slice(0, 20).map((fact) => fact.id),
  };
}

function inferStrategy(query: string): RetrievalStrategy {
  if (query.includes('who is') || query.includes('entity')) {
    return 'entity';
  }
  return query.trim() === '' ? 'recent' : 'lexical';
}
