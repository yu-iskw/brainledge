import type { KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { DecisionRecord } from '../knowledge/decision.js';

export interface DecisionRepository {
  list(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
  }): Promise<readonly DecisionRecord[]>;
  record(input: { workspaceId: WorkspaceId; decision: DecisionRecord }): Promise<void>;
}

export function createInMemoryDecisionRepository(items: DecisionRecord[] = []): DecisionRepository {
  return {
    list({ workspaceId, knowledgeSpaceId }) {
      return Promise.resolve(
        items.filter(
          (item) => item.workspaceId === workspaceId && item.knowledgeSpaceId === knowledgeSpaceId,
        ),
      );
    },
    record({ workspaceId, decision }) {
      if (decision.workspaceId !== workspaceId) {
        return Promise.reject(new Error('workspace scope mismatch'));
      }
      items.push(decision);
      return Promise.resolve();
    },
  };
}
