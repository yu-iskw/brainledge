import type { Action, GrantLevel } from './action.js';
import type { Authorizer, AuthorizationDecision, AuthorizationRequest } from './authorizer.js';

export interface GrantRecord {
  readonly workspaceId: string;
  readonly knowledgeSpaceId: string;
  readonly principalId: string;
  readonly level: GrantLevel;
}

export function createDatabaseAuthorizer(grants: readonly GrantRecord[]): Authorizer {
  return {
    authorize(input: AuthorizationRequest): Promise<AuthorizationDecision> {
      const grant = grants.find(
        (item) =>
          item.workspaceId === input.workspaceId &&
          item.principalId === input.principal.id &&
          (input.knowledgeSpaceId === undefined ||
            item.knowledgeSpaceId === input.knowledgeSpaceId),
      );
      if (grant === undefined) {
        return Promise.resolve({ allowed: false, reason: 'no grant' });
      }
      const writeActions: Action[] = [
        'memory.remember',
        'memory.forget',
        'space.write',
        'knowledge.write',
        'decision.write',
        'ingestion.write',
      ];
      const admin = input.action === 'space.admin';
      if (admin && grant.level !== 'admin') {
        return Promise.resolve({ allowed: false, reason: 'admin required' });
      }
      if (writeActions.includes(input.action) && grant.level === 'reader') {
        return Promise.resolve({ allowed: false, reason: 'editor required' });
      }
      return Promise.resolve({ allowed: true, reason: grant.level });
    },
  };
}
