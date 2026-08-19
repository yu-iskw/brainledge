import { describe, expect, it } from 'vitest';

import { assertWorkspaceScope, WORKSPACE_SCOPE_MISMATCH } from './scope.js';

describe('workspace scope', () => {
  it('allows matching workspace ids and throws on mismatch', () => {
    expect(() => {
      assertWorkspaceScope('ws_personal', 'ws_personal');
    }).not.toThrow();
    expect(() => {
      assertWorkspaceScope('ws_other', 'ws_personal');
    }).toThrow(WORKSPACE_SCOPE_MISMATCH);
  });
});
