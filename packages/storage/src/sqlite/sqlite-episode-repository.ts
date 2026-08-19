import {
  asEpisodeId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
  lexicalTokens,
} from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { Episode, EpisodeRepository } from '@brainledge/core';
import type { DatabaseSync } from 'node:sqlite';

interface EpisodeRow {
  id: string;
  workspace_id: string;
  knowledge_space_id: string;
  principal_id: string | null;
  kind: Episode['kind'];
  reference_time: string | null;
  observed_at: string;
  content_hash: string;
  content: string;
  hidden: number;
  deleted_at: string | null;
  metadata_json: string;
}

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: asEpisodeId(row.id),
    workspaceId: asWorkspaceId(row.workspace_id),
    knowledgeSpaceId: asKnowledgeSpaceId(row.knowledge_space_id),
    principalId: row.principal_id === null ? undefined : asPrincipalId(row.principal_id),
    kind: row.kind,
    referenceTime:
      row.reference_time === null ? undefined : (row.reference_time as Episode['referenceTime']),
    observedAt: row.observed_at as Episode['observedAt'],
    contentHash: row.content_hash,
    content: row.content,
    hidden: row.hidden === 1,
    deletedAt: row.deleted_at === null ? undefined : (row.deleted_at as Episode['deletedAt']),
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
  };
}

export function createSqliteEpisodeRepository(database: DatabaseSync): EpisodeRepository {
  return {
    async insert({ workspaceId, episode }) {
      assertWorkspaceScope(episode.workspaceId, workspaceId);
      database
        .prepare(
          `INSERT INTO episodes (
            id, workspace_id, knowledge_space_id, principal_id, kind, reference_time,
            observed_at, content_hash, content, hidden, deleted_at, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          episode.id,
          episode.workspaceId,
          episode.knowledgeSpaceId,
          episode.principalId ?? null,
          episode.kind,
          episode.referenceTime ?? null,
          episode.observedAt,
          episode.contentHash,
          episode.content,
          episode.hidden ? 1 : 0,
          episode.deletedAt ?? null,
          JSON.stringify(episode.metadata),
        );
      database
        .prepare('INSERT INTO episode_fts (content, episode_id, workspace_id) VALUES (?, ?, ?)')
        .run(episode.content, episode.id, episode.workspaceId);
      return Promise.resolve();
    },

    findById({ workspaceId, episodeId }) {
      const row = database
        .prepare('SELECT * FROM episodes WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL')
        .get(episodeId, workspaceId) as EpisodeRow | undefined;
      return Promise.resolve(row === undefined ? undefined : mapEpisode(row));
    },

    searchLexical({ workspaceId, knowledgeSpaceId, query, limit }) {
      const tokens = lexicalTokens(query);
      let rows: EpisodeRow[] = [];
      const ftsQuery = tokens.map((token) => `"${token.replaceAll('"', '')}"`).join(' OR ');
      if (ftsQuery.length > 0) {
        try {
          rows = database
            .prepare(
              `SELECT e.* FROM episodes e
               WHERE e.workspace_id = ? AND e.knowledge_space_id = ?
                 AND e.hidden = 0 AND e.deleted_at IS NULL
                 AND e.id IN (SELECT episode_id FROM episode_fts WHERE episode_fts MATCH ?)
               ORDER BY e.observed_at DESC
               LIMIT ?`,
            )
            .all(workspaceId, knowledgeSpaceId, ftsQuery, limit) as unknown as EpisodeRow[];
        } catch {
          rows = [];
        }
      }
      if (rows.length === 0) {
        const likes = tokens.length === 0 ? ['%'] : tokens.map((token) => `%${token}%`);
        const likeSql =
          tokens.length === 0 ? '1 = 1' : tokens.map(() => 'lower(content) LIKE ?').join(' OR ');
        rows = database
          .prepare(
            `SELECT * FROM episodes
             WHERE workspace_id = ? AND knowledge_space_id = ?
               AND hidden = 0 AND deleted_at IS NULL
               AND (${likeSql})
             ORDER BY observed_at DESC
             LIMIT ?`,
          )
          .all(workspaceId, knowledgeSpaceId, ...likes, limit) as unknown as EpisodeRow[];
      }
      return Promise.resolve(rows.map(mapEpisode));
    },

    listRecent({ workspaceId, knowledgeSpaceId, limit }) {
      const rows = database
        .prepare(
          `SELECT * FROM episodes
           WHERE workspace_id = ? AND knowledge_space_id = ?
             AND hidden = 0 AND deleted_at IS NULL
           ORDER BY observed_at DESC
           LIMIT ?`,
        )
        .all(workspaceId, knowledgeSpaceId, limit) as unknown as EpisodeRow[];
      return Promise.resolve(rows.map(mapEpisode));
    },

    hide({ workspaceId, episodeId }) {
      database
        .prepare('UPDATE episodes SET hidden = 1 WHERE id = ? AND workspace_id = ?')
        .run(episodeId, workspaceId);
      return Promise.resolve();
    },

    delete({ workspaceId, episodeId }) {
      database
        .prepare(
          "UPDATE episodes SET deleted_at = datetime('now') WHERE id = ? AND workspace_id = ?",
        )
        .run(episodeId, workspaceId);
      return Promise.resolve();
    },

    purge({ workspaceId, episodeId }) {
      database.prepare('DELETE FROM episode_fts WHERE episode_id = ?').run(episodeId);
      database
        .prepare('DELETE FROM episodes WHERE id = ? AND workspace_id = ?')
        .run(episodeId, workspaceId);
      return Promise.resolve();
    },
  };
}
