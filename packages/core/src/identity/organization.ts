import type { OrganizationId } from '../domain/ids.js';

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
}
