import type { EpisodeId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { Episode } from '../knowledge/episode.js';

export interface EpisodeRepository {
  insert(input: { workspaceId: WorkspaceId; episode: Episode }): Promise<void>;
  findById(input: { workspaceId: WorkspaceId; episodeId: EpisodeId }): Promise<Episode | undefined>;
  searchLexical(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
    query: string;
    limit: number;
  }): Promise<readonly Episode[]>;
  listRecent(input: {
    workspaceId: WorkspaceId;
    knowledgeSpaceId: KnowledgeSpaceId;
    limit: number;
  }): Promise<readonly Episode[]>;
  hide(input: { workspaceId: WorkspaceId; episodeId: EpisodeId }): Promise<void>;
  delete(input: { workspaceId: WorkspaceId; episodeId: EpisodeId }): Promise<void>;
  purge(input: { workspaceId: WorkspaceId; episodeId: EpisodeId }): Promise<void>;
}
