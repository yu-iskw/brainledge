import { describe, expect, it } from 'vitest';

import { LOCAL_PRINCIPAL_ID, LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID } from '../domain/ids.js';

import { localContext, localPrincipal } from './local.js';

describe('localPrincipal', () => {
  it('returns the branded local human-facing principal', () => {
    expect(localPrincipal()).toEqual({
      id: LOCAL_PRINCIPAL_ID,
      type: 'local',
      displayName: 'Local user',
    });
    expect(localPrincipal().id).toBe('principal_local-user');
  });
});

describe('localContext', () => {
  it('binds the local principal to the default workspace and space', () => {
    expect(localContext()).toEqual({
      principal: localPrincipal(),
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
    });
    expect(localContext().workspaceId).toBe('ws_personal');
    expect(localContext().knowledgeSpaceId).toBe('ks_default');
  });
});
