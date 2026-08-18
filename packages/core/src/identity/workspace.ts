import type { OrganizationId, WorkspaceId } from '../domain/ids.js';

export interface Workspace {
  readonly id: WorkspaceId;
  readonly organizationId: OrganizationId;
  readonly name: string;
}
