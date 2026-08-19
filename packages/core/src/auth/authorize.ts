import { AppError } from '../errors/app-error.js';

import type { Action } from './action.js';
import type { Authorizer, ExecutionContext } from './authorizer.js';

export async function authorizeOrThrow(
  authorizer: Authorizer,
  context: ExecutionContext,
  action: Action,
  resourceType: 'space' | 'episode' | 'fact' | 'workspace',
  resourceId: string,
): Promise<void> {
  const decision = await authorizer.authorize({
    principal: context.principal,
    action,
    resource: { type: resourceType, id: resourceId },
    workspaceId: context.workspaceId,
    knowledgeSpaceId: context.knowledgeSpaceId,
  });
  if (!decision.allowed) {
    throw new AppError('FORBIDDEN', decision.reason, 403);
  }
}
