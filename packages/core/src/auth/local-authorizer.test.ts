import { describe, expect, it } from 'vitest';

import { asKnowledgeSpaceId, asWorkspaceId } from '../domain/ids.js';
import { localPrincipal } from '../identity/local.js';

import { createLocalAuthorizer } from './local-authorizer.js';

describe('createLocalAuthorizer', () => {
  it('always allows with reason local-implicit', async () => {
    const decision = await createLocalAuthorizer().authorize({
      principal: localPrincipal(),
      action: 'memory.remember',
      resource: { type: 'space', id: 'ks_default' },
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    });
    expect(decision).toEqual({ allowed: true, reason: 'local-implicit' });
  });

  it('allows privileged actions and workspace resources', async () => {
    const authorizer = createLocalAuthorizer();
    const admin = await authorizer.authorize({
      principal: localPrincipal(),
      action: 'space.admin',
      resource: { type: 'workspace', id: 'ws_personal' },
      workspaceId: asWorkspaceId('ws_personal'),
    });
    const forget = await authorizer.authorize({
      principal: localPrincipal(),
      action: 'memory.forget',
      resource: { type: 'episode', id: 'ep_1' },
      workspaceId: asWorkspaceId('ws_other'),
      knowledgeSpaceId: asKnowledgeSpaceId('ks_other'),
    });
    expect(admin.allowed).toBe(true);
    expect(forget.allowed).toBe(true);
    expect(forget.reason).toBe('local-implicit');
  });
});
