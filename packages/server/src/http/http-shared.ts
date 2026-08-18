import { randomUUID } from 'node:crypto';

import { asJobId, isAppError, localContext, newId, type Application } from '@brainledge/core';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface ErrorBody {
  error: { code: string; message: string; requestId: string };
}

export function requestId(header?: string): string {
  return header && header.length > 0 ? header : `req_${randomUUID()}`;
}

export function errorBody(code: string, message: string, id: string): ErrorBody {
  return { error: { code, message, requestId: id } };
}

export function mapError(
  context: { json: (body: ErrorBody, status?: number) => Response },
  error: unknown,
  id: string,
): Response {
  if (isAppError(error)) {
    return context.json(errorBody(error.code, error.message, id), error.status);
  }
  return context.json(errorBody('INTERNAL', 'Internal error', id), 500);
}

export function enqueueJob(
  application: Application,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const ctx = localContext();
  const jobId = asJobId(newId('job'));
  return application.ports.jobs
    .enqueue({
      workspaceId: ctx.workspaceId,
      job: {
        id: jobId,
        workspaceId: ctx.workspaceId,
        type,
        payloadJson: JSON.stringify(payload),
        status: 'queued',
        attempts: 0,
        createdAt: application.ports.clock.now(),
      },
    })
    .then(() => jobId);
}
