import type { DecisionId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export interface ContextSnapshot {
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly episodeIds: readonly string[];
  readonly factIds: readonly string[];
  readonly capturedAt: IsoUtcTimestamp;
}

export interface DecisionRecord {
  readonly id: DecisionId;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly action: string;
  readonly rationale: string;
  readonly snapshot: ContextSnapshot;
  readonly createdAt: IsoUtcTimestamp;
  readonly status: 'proposed' | 'approved' | 'executed' | 'rejected';
}

export function createDecision(input: DecisionRecord): DecisionRecord {
  if (input.action.trim() === '') {
    throw new Error('decision action required');
  }
  return input;
}
