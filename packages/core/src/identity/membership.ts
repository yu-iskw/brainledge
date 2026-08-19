import type { PrincipalId, WorkspaceId } from '../domain/ids.js';

export type MembershipRole = 'reader' | 'editor' | 'admin';

export interface Membership {
  readonly workspaceId: WorkspaceId;
  readonly principalId: PrincipalId;
  readonly role: MembershipRole;
}
