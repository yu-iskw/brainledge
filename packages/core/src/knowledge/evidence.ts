import type { EvidenceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export type EvidenceSourceType = 'episode' | 'document' | 'tool-result' | 'manual' | 'inference';

export interface Evidence {
  readonly id: EvidenceId;
  readonly workspaceId: WorkspaceId;
  readonly sourceType: EvidenceSourceType;
  readonly sourceId: string;
  readonly locator?: string;
  readonly contentHash?: string;
  readonly observedAt: IsoUtcTimestamp;
}

type FactEvidenceRelation = 'supports' | 'contradicts' | 'derived-from';

export interface FactEvidence {
  readonly factId: string;
  readonly evidenceId: EvidenceId;
  readonly relation: FactEvidenceRelation;
}
