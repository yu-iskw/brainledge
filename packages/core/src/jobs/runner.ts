import type { JobRecord, JobRepository } from '../ports/job-repository.js';

type JobHandler = (job: JobRecord) => Promise<void>;

export async function runQueuedJobs(
  jobs: JobRepository,
  handlers: Readonly<Partial<Record<string, JobHandler>>>,
  max = 16,
): Promise<number> {
  let processed = 0;
  while (processed < max) {
    const job = await jobs.claim({ limit: 1 });
    if (job === undefined) {
      return processed;
    }
    const handler = handlers[job.type];
    try {
      if (handler === undefined) {
        await jobs.fail({
          workspaceId: job.workspaceId,
          jobId: job.id,
          errorCode: 'UNKNOWN_JOB_TYPE',
        });
      } else {
        await handler(job);
        await jobs.succeed({ workspaceId: job.workspaceId, jobId: job.id });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await jobs.fail({
        workspaceId: job.workspaceId,
        jobId: job.id,
        errorCode: detail.length === 0 ? 'JOB_FAILED' : `JOB_FAILED:${detail.slice(0, 96)}`,
      });
    }
    processed += 1;
  }
  return processed;
}
