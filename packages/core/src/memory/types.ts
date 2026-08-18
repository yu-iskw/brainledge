export interface MemoryHit {
  readonly episodeId: string;
  readonly content: string;
  readonly score: number;
  readonly observedAt: string;
}

export interface FactHit {
  readonly factId: string;
  readonly summary: string;
}

export interface EntityHit {
  readonly entityId: string;
  readonly canonicalName: string;
}

export interface DecisionHit {
  readonly decisionId: string;
  readonly action: string;
}

export interface PolicyHit {
  readonly id: string;
  readonly description: string;
}

export interface ProvenanceSummary {
  readonly episodeId: string;
  readonly relation: string;
}

export interface RecallResult {
  readonly memories: readonly MemoryHit[];
  readonly facts: readonly FactHit[];
  readonly entities: readonly EntityHit[];
  readonly priorDecisions: readonly DecisionHit[];
  readonly policies: readonly PolicyHit[];
  readonly provenanceSummary: readonly ProvenanceSummary[];
}

export interface RememberInput {
  readonly spaceId: string;
  readonly content: string;
  readonly kind?: 'conversation' | 'note' | 'document' | 'event' | 'tool-result' | 'observation';
  readonly referenceTime?: string;
  readonly sessionId?: string;
}

export interface RecallInput {
  readonly spaceId: string;
  readonly query: string;
  readonly limit?: number;
  readonly maxTokens?: number;
  readonly sessionId?: string;
}

export type ForgetMode = 'hide' | 'delete' | 'retract' | 'purge';

export interface ForgetInput {
  readonly spaceId: string;
  readonly memoryId: string;
  readonly mode: ForgetMode;
}
