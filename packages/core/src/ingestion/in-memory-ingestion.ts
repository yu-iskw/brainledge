import type { IngestionRepository, IngestionRun } from '../ports/ingestion-repository.js';

export function createInMemoryIngestionRepository(runs: IngestionRun[] = []): IngestionRepository {
  return {
    insert({ workspaceId, run }) {
      if (run.workspaceId !== workspaceId) {
        return Promise.reject(new Error('workspace scope mismatch'));
      }
      runs.push(run);
      return Promise.resolve();
    },
    findById({ workspaceId, runId }) {
      return Promise.resolve(
        runs.find((item) => item.workspaceId === workspaceId && item.id === runId),
      );
    },
    findByIdempotencyKey({ workspaceId, knowledgeSpaceId, idempotencyKey }) {
      return Promise.resolve(
        runs.find(
          (item) =>
            item.workspaceId === workspaceId &&
            item.knowledgeSpaceId === knowledgeSpaceId &&
            item.idempotencyKey === idempotencyKey,
        ),
      );
    },
    updateStatus({ workspaceId, runId, status, errorCode }) {
      const index = runs.findIndex((item) => item.workspaceId === workspaceId && item.id === runId);
      if (index >= 0) {
        const current = runs[index];
        runs[index] = { ...current, status, errorCode };
      }
      return Promise.resolve();
    },
  };
}
