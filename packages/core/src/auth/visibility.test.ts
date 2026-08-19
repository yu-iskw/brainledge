import { describe, expect, it } from 'vitest';

import { canSeePrivateSpace } from './visibility.js';

describe('canSeePrivateSpace', () => {
  it('allows workspace and organization visibility without ownership', () => {
    expect(
      canSeePrivateSpace({
        visibility: 'workspace',
        isOwner: false,
        isWorkspaceAdmin: false,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(true);
    expect(
      canSeePrivateSpace({
        visibility: 'organization',
        isOwner: false,
        isWorkspaceAdmin: false,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(true);
  });

  it('allows the owner of a private space', () => {
    expect(
      canSeePrivateSpace({
        visibility: 'private',
        isOwner: true,
        isWorkspaceAdmin: false,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(true);
  });

  it('allows a workspace admin only when the private-read grant is on', () => {
    expect(
      canSeePrivateSpace({
        visibility: 'private',
        isOwner: false,
        isWorkspaceAdmin: true,
        workspaceAdminMayReadPrivate: true,
      }),
    ).toBe(true);
    expect(
      canSeePrivateSpace({
        visibility: 'private',
        isOwner: false,
        isWorkspaceAdmin: true,
        workspaceAdminMayReadPrivate: false,
      }),
    ).toBe(false);
  });

  it('denies a non-owner who is not a workspace admin', () => {
    expect(
      canSeePrivateSpace({
        visibility: 'private',
        isOwner: false,
        isWorkspaceAdmin: false,
        workspaceAdminMayReadPrivate: true,
      }),
    ).toBe(false);
  });
});
