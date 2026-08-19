export const WORKSPACE_SCOPE_MISMATCH = 'workspace scope mismatch';

export function assertWorkspaceScope(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(WORKSPACE_SCOPE_MISMATCH);
  }
}
