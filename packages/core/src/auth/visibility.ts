export function canSeePrivateSpace(input: {
  readonly visibility: 'private' | 'workspace' | 'organization';
  readonly isOwner: boolean;
  readonly isWorkspaceAdmin: boolean;
  readonly workspaceAdminMayReadPrivate: boolean;
}): boolean {
  if (input.visibility !== 'private') {
    return true;
  }
  if (input.isOwner) {
    return true;
  }
  return input.isWorkspaceAdmin && input.workspaceAdminMayReadPrivate;
}
