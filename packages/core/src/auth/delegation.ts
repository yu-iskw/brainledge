import type { Action } from '../auth/action.js';
import type { PrincipalId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export interface Delegation {
  readonly from: PrincipalId;
  readonly to: PrincipalId;
  readonly actions: readonly Action[];
  readonly expiresAt: IsoUtcTimestamp;
}

export function isDelegationActive(
  delegation: Delegation,
  now: IsoUtcTimestamp,
  action: Action,
): boolean {
  return now < delegation.expiresAt && delegation.actions.includes(action);
}
