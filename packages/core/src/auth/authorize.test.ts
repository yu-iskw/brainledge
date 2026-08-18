import { describe, expect, it } from 'vitest';

import { isAppError } from '../errors/app-error.js';
import { localContext } from '../identity/local.js';

import { authorizeOrThrow } from './authorize.js';
import { createLocalAuthorizer } from './local-authorizer.js';

import type { Authorizer } from './authorizer.js';

describe('authorizeOrThrow', () => {
  it('allows when createLocalAuthorizer grants access', async () => {
    await expect(
      authorizeOrThrow(
        createLocalAuthorizer(),
        localContext(),
        'memory.recall',
        'space',
        'ks_default',
      ),
    ).resolves.toBeUndefined();
  });

  it('throws AppError FORBIDDEN 403 when a hand-rolled authorizer denies', async () => {
    const denier: Authorizer = {
      authorize: () => Promise.resolve({ allowed: false, reason: 'nope' }),
    };
    const error = await authorizeOrThrow(
      denier,
      localContext(),
      'memory.forget',
      'episode',
      'ep_1',
    ).catch((caught: unknown) => caught);
    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ code: 'FORBIDDEN', status: 403, message: 'nope' });
  });

  it('forwards the execution context and resource to the authorizer', async () => {
    const calls: unknown[] = [];
    const recorder: Authorizer = {
      authorize: (input) => {
        calls.push(input);
        return Promise.resolve({ allowed: true, reason: 'recorded' });
      },
    };
    const context = localContext();
    await authorizeOrThrow(recorder, context, 'knowledge.read', 'fact', 'fact_1');
    expect(calls).toEqual([
      {
        principal: context.principal,
        action: 'knowledge.read',
        resource: { type: 'fact', id: 'fact_1' },
        workspaceId: context.workspaceId,
        knowledgeSpaceId: context.knowledgeSpaceId,
      },
    ]);
  });
});
