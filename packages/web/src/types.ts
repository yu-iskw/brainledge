export interface ApiError {
  readonly code?: string;
  readonly message: string;
}

export interface Principal {
  readonly id: string;
  readonly type: string;
}

export interface Workspace {
  readonly id: string;
  readonly name?: string;
}

export interface KnowledgeSpace {
  readonly id: string;
  readonly name: string;
  readonly visibility: 'private' | 'workspace' | 'organization';
}

export interface Episode {
  readonly id: string;
  readonly content: string;
  readonly observedAt: string;
  readonly kind?: string;
}

export interface MemoryHit {
  readonly episodeId: string;
  readonly content: string;
  readonly score?: number;
  readonly observedAt?: string;
}

export interface FactHit {
  readonly factId?: string;
  readonly summary: string;
  readonly subjectId?: string;
  readonly predicateId?: string;
  readonly objectText?: string;
}

export interface ProvenanceItem {
  readonly episodeId: string;
  readonly relation: string;
}

export interface Entity {
  readonly id: string;
  readonly canonicalName: string;
}

export interface Fact {
  readonly id: string;
  readonly subject: { readonly entityId: string };
  readonly predicate: { readonly id: string };
  readonly object:
    | { readonly kind: 'entity'; readonly entity: { readonly entityId: string } }
    | { readonly kind: string; readonly value: string | number | boolean };
  readonly status?: string;
  readonly validFrom?: string;
  readonly validUntil?: string;
  readonly assertedAt?: string;
  readonly sourceEpisodeId?: string;
}

export interface RecallResult {
  readonly memories: readonly MemoryHit[];
  readonly facts: readonly FactHit[];
  readonly provenanceSummary?: readonly ProvenanceItem[];
}

export interface IngestionResult {
  readonly status: string;
  readonly runId?: string;
  readonly jobId?: string;
  readonly requestId?: string;
  readonly segments?: number;
  readonly errorCode?: string;
}
