import type { DecisionId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

interface ContextSnapshot {
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly episodeIds: readonly string[];
  readonly factIds: readonly string[];
  readonly capturedAt: IsoUtcTimestamp;
}

interface DecisionRecord {
  readonly id: DecisionId;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly action: string;
  readonly rationale: string;
  readonly snapshot: ContextSnapshot;
  readonly createdAt: IsoUtcTimestamp;
}

export function createDecision(input: DecisionRecord): DecisionRecord {
  if (input.action.trim() === '') {
    throw new Error('decision action required');
  }
  return input;
}
