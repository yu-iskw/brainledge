export interface RerankPort {
  rerank(ids: readonly string[], query: string): readonly string[];
}

export function createIdentityReranker(): RerankPort {
  return {
    rerank(ids) {
      return ids;
    },
  };
}
