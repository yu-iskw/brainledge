import type { EpisodeId, KnowledgeSpaceId, PrincipalId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export type EpisodeKind =
  'conversation' | 'note' | 'document' | 'event' | 'tool-result' | 'observation';

export interface Episode {
  readonly id: EpisodeId;
  readonly workspaceId: WorkspaceId;
  readonly knowledgeSpaceId: KnowledgeSpaceId;
  readonly principalId?: PrincipalId;
  readonly kind: EpisodeKind;
  readonly referenceTime?: IsoUtcTimestamp;
  readonly observedAt: IsoUtcTimestamp;
  readonly contentHash: string;
  readonly content: string;
  readonly hidden: boolean;
  readonly deletedAt?: IsoUtcTimestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}
