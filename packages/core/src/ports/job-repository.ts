import type { JobId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface JobRecord {
  readonly id: JobId;
  readonly workspaceId: WorkspaceId;
  readonly type: string;
  readonly payloadJson: string;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly createdAt: IsoUtcTimestamp;
  readonly errorCode?: string;
  readonly claimedAt?: IsoUtcTimestamp;
}

export interface JobRepository {
  enqueue(input: { workspaceId: WorkspaceId; job: JobRecord }): Promise<void>;
  claim(input: { limit: number }): Promise<JobRecord | undefined>;
  succeed(input: { workspaceId: WorkspaceId; jobId: JobId }): Promise<void>;
  fail(input: { workspaceId: WorkspaceId; jobId: JobId; errorCode: string }): Promise<void>;
  requeueStaleRunning(input: { olderThanMs: number; now: IsoUtcTimestamp }): Promise<number>;
}
