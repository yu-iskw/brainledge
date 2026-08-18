import { describe, expect, it } from 'vitest';

import { asPrincipalId, asWorkspaceId } from '../domain/ids.js';

import { createDatabaseAuthorizer } from './database-authorizer.js';
import { canSeePrivateSpace } from './visibility.js';

describe('database authorizer', () => {
  it('denies missing grants and allows editors to write', async () => {
    const authorizer = createDatabaseAuthorizer([
      {
        workspaceId: 'ws_personal',
        knowledgeSpaceId: 'ks_default',
        principalId: 'principal_local-user',
        level: 'editor',
      },
    ]);
    const denied = await authorizer.authorize({
      principal: { id: asPrincipalId('other'), type: 'human' },
      action: 'memory.recall',
      resource: { type: 'space', id: 'ks_default' },
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: 'ks_default' as never,
    });
    expect(denied.allowed).toBe(false);
    const allowed = await authorizer.authorize({
      principal: { id: asPrincipalId('principal_local-user'), type: 'local' },
      action: 'memory.remember',
      resource: { type: 'space', id: 'ks_default' },
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: 'ks_default' as never,
    });
    expect(allowed.allowed).toBe(true);
    const reader = createDatabaseAuthorizer([
      {
        workspaceId: 'ws_personal',
        knowledgeSpaceId: 'ks_default',
        principalId: 'principal_local-user',
        level: 'reader',
      },
    ]);
    const writeDenied = await reader.authorize({
      principal: { id: asPrincipalId('principal_local-user'), type: 'local' },
      action: 'memory.remember',
      resource: { type: 'space', id: 'ks_default' },
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: 'ks_default' as never,
    });
    expect(writeDenied.allowed).toBe(false);
    const adminDenied = await reader.authorize({
      principal: { id: asPrincipalId('principal_local-user'), type: 'local' },
      action: 'space.admin',
      resource: { type: 'space', id: 'ks_default' },
      workspaceId: asWorkspaceId('ws_personal'),
      knowledgeSpaceId: 'ks_default' as never,
    });
    expect(adminDenied.allowed).toBe(false);
    expect(
      canSeePrivateSpace({
        visibility: 'private',
        isOwner: false,
        isWorkspaceAdmin: true,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(false);
    expect(
      canSeePrivateSpace({
        visibility: 'private',
        isOwner: true,
        isWorkspaceAdmin: false,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(true);
    expect(
      canSeePrivateSpace({
        visibility: 'workspace',
        isOwner: false,
        isWorkspaceAdmin: false,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(true);
  });
});
