import { LOCAL_PRINCIPAL_ID, LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID } from '../domain/ids.js';

import type { Principal } from './principal.js';
import type { ExecutionContext } from '../auth/authorizer.js';

export function localPrincipal(): Principal {
  return { id: LOCAL_PRINCIPAL_ID, type: 'local', displayName: 'Local user' };
}

export function localContext(): ExecutionContext {
  return {
    principal: localPrincipal(),
    workspaceId: LOCAL_WORKSPACE_ID,
    knowledgeSpaceId: LOCAL_SPACE_ID,
  };
}
