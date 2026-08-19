import {
  asEpisodeId,
  asWorkspaceId,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  parseIsoUtc,
} from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { postgresLexicalSql } from './postgres-adapter.js';
import {
  createPostgresEpisodeRepository,
  type PostgresQueryFn,
} from './postgres-episode-repository.js';

const FIXED_TIME = parseIsoUtc('2026-08-18T00:00:00.000Z');

function visibleEpisodes(
  rows: Record<string, unknown>[],
  workspaceId: unknown,
  knowledgeSpaceId: unknown,
): Record<string, unknown>[] {
  return rows.filter(
    (item) =>
      item.workspace_id === workspaceId &&
      item.knowledge_space_id === knowledgeSpaceId &&
      item.hidden === false &&
      item.deleted_at === null,
  );
}

function newestFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows].sort((left, right) =>
    String(right.observed_at).localeCompare(String(left.observed_at)),
  );
}

function mutateEpisode(
  rows: Record<string, unknown>[],
  params: unknown[],
  mutate: (row: Record<string, unknown>) => void,
): void {
  const [id, workspaceId] = params;
  const row = rows.find((item) => item.id === id && item.workspace_id === workspaceId);
  if (row !== undefined) {
    mutate(row);
  }
}

function createEpisodeTableEmulator(): { query: PostgresQueryFn; rows: Record<string, unknown>[] } {
  const rows: Record<string, unknown>[] = [];

  const query: PostgresQueryFn = (sql, params) => {
    const normalized = sql.replace(/\s+/gu, ' ').trim().toLowerCase();

    if (normalized.startsWith('insert into episodes')) {
      rows.push({
        id: params[0],
        workspace_id: params[1],
        knowledge_space_id: params[2],
        principal_id: params[3],
        kind: params[4],
        reference_time: params[5],
        observed_at: params[6],
        content_hash: params[7],
        content: params[8],
        hidden: params[9],
        deleted_at: params[10],
        metadata_json: params[11],
      });
      return Promise.resolve({ rows: [] });
    }

    if (normalized.startsWith('select * from episodes where id =')) {
      const [id, workspaceId] = params;
      const row = rows.find(
        (item) => item.id === id && item.workspace_id === workspaceId && item.deleted_at === null,
      );
      return Promise.resolve({ rows: row === undefined ? [] : [row] });
    }

    if (normalized.includes('content ilike')) {
      const [workspaceId, knowledgeSpaceId, pattern, limit] = params;
      const needle = String(pattern).replace(/%/gu, '').toLowerCase();
      const matched = newestFirst(visibleEpisodes(rows, workspaceId, knowledgeSpaceId))
        .filter((item) => String(item.content).toLowerCase().includes(needle))
        .slice(0, Number(limit));
      return Promise.resolve({ rows: matched });
    }

    if (
      normalized.includes('order by observed_at desc') &&
      normalized.includes('limit') &&
      !normalized.includes('ilike')
    ) {
      const [workspaceId, knowledgeSpaceId, limit] = params;
      const matched = newestFirst(visibleEpisodes(rows, workspaceId, knowledgeSpaceId)).slice(
        0,
        Number(limit),
      );
      return Promise.resolve({ rows: matched });
    }

    if (normalized.startsWith('update episodes set hidden = true')) {
      mutateEpisode(rows, params, (row) => {
        row.hidden = true;
      });
      return Promise.resolve({ rows: [] });
    }

    if (normalized.startsWith('update episodes set deleted_at')) {
      mutateEpisode(rows, params, (row) => {
        row.deleted_at = new Date().toISOString();
      });
      return Promise.resolve({ rows: [] });
    }

    if (normalized.startsWith('delete from episodes')) {
      const [id, workspaceId] = params;
      const index = rows.findIndex((item) => item.id === id && item.workspace_id === workspaceId);
      if (index >= 0) {
        rows.splice(index, 1);
      }
      return Promise.resolve({ rows: [] });
    }

    throw new Error(`unhandled sql in emulator: ${sql}`);
  };

  return { query, rows };
}

describe('postgres episode repository', () => {
  it('round-trips episodes via injected query fn', async () => {
    const { query } = createEpisodeTableEmulator();
    const episodes = createPostgresEpisodeRepository(query);

    await episodes.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      episode: {
        id: asEpisodeId('ep_pg_1'),
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        kind: 'note',
        observedAt: FIXED_TIME,
        contentHash: 'hash1',
        content: 'Tokyo relocation in July 2026',
        hidden: false,
        metadata: { source: 'test' },
      },
    });

    const found = await episodes.findById({
      workspaceId: LOCAL_WORKSPACE_ID,
      episodeId: asEpisodeId('ep_pg_1'),
    });
    expect(found?.content).toMatch(/Tokyo/u);

    const hits = await episodes.searchLexical({
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
      query: 'Tokyo',
      limit: 5,
    });
    expect(hits).toHaveLength(1);

    const recent = await episodes.listRecent({
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
      limit: 5,
    });
    expect(recent).toHaveLength(1);

    await episodes.hide({
      workspaceId: LOCAL_WORKSPACE_ID,
      episodeId: asEpisodeId('ep_pg_1'),
    });
    const hiddenRecent = await episodes.listRecent({
      workspaceId: LOCAL_WORKSPACE_ID,
      knowledgeSpaceId: LOCAL_SPACE_ID,
      limit: 5,
    });
    expect(hiddenRecent).toHaveLength(0);

    await episodes.delete({
      workspaceId: LOCAL_WORKSPACE_ID,
      episodeId: asEpisodeId('ep_pg_1'),
    });
    const deleted = await episodes.findById({
      workspaceId: LOCAL_WORKSPACE_ID,
      episodeId: asEpisodeId('ep_pg_1'),
    });
    expect(deleted).toBeUndefined();

    await episodes.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      episode: {
        id: asEpisodeId('ep_pg_purge'),
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        kind: 'note',
        observedAt: FIXED_TIME,
        contentHash: 'hash2',
        content: 'purge me',
        hidden: false,
        metadata: {},
      },
    });
    await episodes.purge({
      workspaceId: LOCAL_WORKSPACE_ID,
      episodeId: asEpisodeId('ep_pg_purge'),
    });
    expect(
      await episodes.findById({
        workspaceId: LOCAL_WORKSPACE_ID,
        episodeId: asEpisodeId('ep_pg_purge'),
      }),
    ).toBeUndefined();

    const leaked = await episodes.findById({
      workspaceId: asWorkspaceId('ws_other'),
      episodeId: asEpisodeId('ep_pg_1'),
    });
    expect(leaked).toBeUndefined();
  });

  it('rejects workspace mismatch on insert', async () => {
    const { query } = createEpisodeTableEmulator();
    const episodes = createPostgresEpisodeRepository(query);

    await expect(
      episodes.insert({
        workspaceId: LOCAL_WORKSPACE_ID,
        episode: {
          id: asEpisodeId('ep_bad'),
          workspaceId: asWorkspaceId('ws_other'),
          knowledgeSpaceId: LOCAL_SPACE_ID,
          kind: 'note',
          observedAt: FIXED_TIME,
          contentHash: 'hash',
          content: 'secret',
          hidden: false,
          metadata: {},
        },
      }),
    ).rejects.toThrow('workspace scope mismatch');
  });

  it('exposes FTS SQL helper', () => {
    expect(postgresLexicalSql()).toMatch(/to_tsvector/u);
    expect(postgresLexicalSql()).toMatch(/plainto_tsquery/u);
    expect(postgresLexicalSql('body')).toBe(
      "to_tsvector('english', body) @@ plainto_tsquery('english', $1)",
    );
  });
});
