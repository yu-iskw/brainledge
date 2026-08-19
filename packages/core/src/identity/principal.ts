import type { PrincipalId } from '../domain/ids.js';

export type PrincipalType = 'human' | 'service' | 'agent' | 'local';

export interface Principal {
  readonly id: PrincipalId;
  readonly type: PrincipalType;
  readonly externalSubject?: string;
  readonly displayName?: string;
}

export interface PrincipalRef {
  readonly principalId: PrincipalId;
}
