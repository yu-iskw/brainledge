import { asEpisodeId, asKnowledgeSpaceId, asPrincipalId, asWorkspaceId } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type { Episode, EpisodeRepository } from '@brainledge/core';

export type PostgresQueryFn = (
  sql: string,
  params: readonly unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

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
  hidden: boolean;
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
    hidden: row.hidden,
    deletedAt: row.deleted_at === null ? undefined : (row.deleted_at as Episode['deletedAt']),
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
  };
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  return '';
}

function mapRow(raw: Record<string, unknown>): Episode {
  const principal = raw.principal_id;
  const reference = raw.reference_time;
  const deleted = raw.deleted_at;
  return mapEpisode({
    id: asText(raw.id),
    workspace_id: asText(raw.workspace_id),
    knowledge_space_id: asText(raw.knowledge_space_id),
    principal_id: principal === null || principal === undefined ? null : asText(principal),
    kind: raw.kind as Episode['kind'],
    reference_time: reference === null || reference === undefined ? null : asText(reference),
    observed_at: asText(raw.observed_at),
    content_hash: asText(raw.content_hash),
    content: asText(raw.content),
    hidden: Boolean(raw.hidden),
    deleted_at: deleted === null || deleted === undefined ? null : asText(deleted),
    metadata_json:
      typeof raw.metadata_json === 'string'
        ? raw.metadata_json
        : JSON.stringify(raw.metadata_json ?? {}),
  });
}

export function createPostgresEpisodeRepository(query: PostgresQueryFn): EpisodeRepository {
  return {
    async insert({ workspaceId, episode }) {
      assertWorkspaceScope(episode.workspaceId, workspaceId);
      return query(
        `INSERT INTO episodes (
          id, workspace_id, knowledge_space_id, principal_id, kind, reference_time,
          observed_at, content_hash, content, hidden, deleted_at, metadata_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          episode.id,
          episode.workspaceId,
          episode.knowledgeSpaceId,
          episode.principalId ?? null,
          episode.kind,
          episode.referenceTime ?? null,
          episode.observedAt,
          episode.contentHash,
          episode.content,
          episode.hidden,
          episode.deletedAt ?? null,
          JSON.stringify(episode.metadata),
        ],
      ).then(() => undefined);
    },

    findById({ workspaceId, episodeId }) {
      return query(
        'SELECT * FROM episodes WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL',
        [episodeId, workspaceId],
      ).then(({ rows }) => {
        const first = rows.at(0);
        return first === undefined ? undefined : mapRow(first);
      });
    },

    searchLexical({ workspaceId, knowledgeSpaceId, query: searchQuery, limit }) {
      const pattern = `%${searchQuery}%`;
      return query(
        `SELECT * FROM episodes
         WHERE workspace_id = $1 AND knowledge_space_id = $2
           AND hidden = false AND deleted_at IS NULL
           AND content ILIKE $3
         ORDER BY observed_at DESC
         LIMIT $4`,
        [workspaceId, knowledgeSpaceId, pattern, limit],
      ).then(({ rows }) => rows.map(mapRow));
    },

    listRecent({ workspaceId, knowledgeSpaceId, limit }) {
      return query(
        `SELECT * FROM episodes
         WHERE workspace_id = $1 AND knowledge_space_id = $2
           AND hidden = false AND deleted_at IS NULL
         ORDER BY observed_at DESC
         LIMIT $3`,
        [workspaceId, knowledgeSpaceId, limit],
      ).then(({ rows }) => rows.map(mapRow));
    },

    hide({ workspaceId, episodeId }) {
      return query('UPDATE episodes SET hidden = true WHERE id = $1 AND workspace_id = $2', [
        episodeId,
        workspaceId,
      ]).then(() => undefined);
    },

    delete({ workspaceId, episodeId }) {
      return query('UPDATE episodes SET deleted_at = NOW() WHERE id = $1 AND workspace_id = $2', [
        episodeId,
        workspaceId,
      ]).then(() => undefined);
    },
  };
}
