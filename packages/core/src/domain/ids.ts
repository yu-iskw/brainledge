const EMPTY_ID = 'must not be empty';

export type PrincipalId = string & { readonly __brand: 'PrincipalId' };
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };
export type KnowledgeSpaceId = string & { readonly __brand: 'KnowledgeSpaceId' };
export type EpisodeId = string & { readonly __brand: 'EpisodeId' };
export type EntityId = string & { readonly __brand: 'EntityId' };
export type FactId = string & { readonly __brand: 'FactId' };
export type EvidenceId = string & { readonly __brand: 'EvidenceId' };
export type JobId = string & { readonly __brand: 'JobId' };
export type IngestionRunId = string & { readonly __brand: 'IngestionRunId' };
export type DecisionId = string & { readonly __brand: 'DecisionId' };
export type AuditEventId = string & { readonly __brand: 'AuditEventId' };

function brand<T extends string>(value: string, label: string): T {
  if (value.trim() === '') {
    throw new Error(`${label} ${EMPTY_ID}`);
  }
  return value as T;
}

export function asPrincipalId(value: string): PrincipalId {
  return brand(value, 'PrincipalId');
}

export function asOrganizationId(value: string): OrganizationId {
  return brand(value, 'OrganizationId');
}

export function asWorkspaceId(value: string): WorkspaceId {
  return brand(value, 'WorkspaceId');
}

export function asKnowledgeSpaceId(value: string): KnowledgeSpaceId {
  return brand(value, 'KnowledgeSpaceId');
}

export function asEpisodeId(value: string): EpisodeId {
  return brand(value, 'EpisodeId');
}

export function asEntityId(value: string): EntityId {
  return brand(value, 'EntityId');
}

export function asFactId(value: string): FactId {
  return brand(value, 'FactId');
}

export function asEvidenceId(value: string): EvidenceId {
  return brand(value, 'EvidenceId');
}

export function asJobId(value: string): JobId {
  return brand(value, 'JobId');
}

export function asIngestionRunId(value: string): IngestionRunId {
  return brand(value, 'IngestionRunId');
}

export function asDecisionId(value: string): DecisionId {
  return brand(value, 'DecisionId');
}

export function asAuditEventId(value: string): AuditEventId {
  return brand(value, 'AuditEventId');
}

export const LOCAL_PRINCIPAL_ID = asPrincipalId('principal_local-user');
export const LOCAL_ORGANIZATION_ID = asOrganizationId('org_local');
export const LOCAL_WORKSPACE_ID = asWorkspaceId('ws_personal');
export const LOCAL_SPACE_ID = asKnowledgeSpaceId('ks_default');
