import type { AuditEventId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly workspaceId: WorkspaceId;
  readonly principalId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly result: 'allow' | 'deny' | 'error';
  readonly timestamp: IsoUtcTimestamp;
  readonly requestId?: string;
}

export interface AuditRepository {
  append(input: { workspaceId: WorkspaceId; event: AuditEvent }): Promise<void>;
  list(input: { workspaceId: WorkspaceId; limit: number }): Promise<readonly AuditEvent[]>;
}
