import type { EvidenceId, WorkspaceId } from '../domain/ids.js';
import type { Evidence } from '../knowledge/evidence.js';

export interface EvidenceRepository {
  insert(input: { workspaceId: WorkspaceId; evidence: Evidence }): Promise<void>;
  findById(input: {
    workspaceId: WorkspaceId;
    evidenceId: EvidenceId;
  }): Promise<Evidence | undefined>;
  purgeBySource(input: { workspaceId: WorkspaceId; sourceId: string }): Promise<void>;
}
