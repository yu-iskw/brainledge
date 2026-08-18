import type { AuthorizationDecision, AuthorizationRequest, Authorizer } from './authorizer.js';

export function createLocalAuthorizer(): Authorizer {
  return {
    authorize(_input: AuthorizationRequest): Promise<AuthorizationDecision> {
      return Promise.resolve({ allowed: true, reason: 'local-implicit' });
    },
  };
}
