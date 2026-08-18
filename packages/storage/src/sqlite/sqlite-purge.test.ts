import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  LOCAL_PRINCIPAL_ID,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  asEntityId,
  asEpisodeId,
  asEvidenceId,
  asFactId,
  parseIsoUtc,
} from '@brainledge/core';
import { describe, expect, it } from 'vitest';

import { openSqliteDatabase } from './database.js';
import { createSqliteEpisodeRepository } from './sqlite-episode-repository.js';
import { createSqliteEvidenceRepository } from './sqlite-evidence-repository.js';
import { createSqliteFactRepository } from './sqlite-fact-repository.js';

const NOW = parseIsoUtc('2026-08-18T00:00:00.000Z');
const EPISODE_ID = asEpisodeId('ep_purge');
const FACT_ID = asFactId('fact_purge');
const EVIDENCE_ID = asEvidenceId('ev_purge');

describe('sqlite physical purge', () => {
  it('removes episode, FTS, facts, and evidence rows', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-purge-'));
    const database = openSqliteDatabase(path.join(dir, 'database.sqlite'));
    const episodes = createSqliteEpisodeRepository(database);
    const facts = createSqliteFactRepository(database);
    const evidence = createSqliteEvidenceRepository(database);

    await episodes.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      episode: {
        id: EPISODE_ID,
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        kind: 'note',
        observedAt: NOW,
        contentHash: 'hash',
        content: 'Alice lives in Tokyo.',
        hidden: false,
        metadata: {},
      },
    });
    await evidence.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      evidence: {
        id: EVIDENCE_ID,
        workspaceId: LOCAL_WORKSPACE_ID,
        sourceType: 'episode',
        sourceId: EPISODE_ID,
        observedAt: NOW,
      },
    });
    await facts.insert({
      workspaceId: LOCAL_WORKSPACE_ID,
      fact: {
        id: FACT_ID,
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        subject: { entityId: asEntityId('ent_alice') },
        predicate: { id: 'livesIn' },
        object: { kind: 'text', value: 'Tokyo' },
        assertedAt: NOW,
        status: 'active',
        createdBy: { principalId: LOCAL_PRINCIPAL_ID },
        sourceEpisodeId: EPISODE_ID,
      },
    });

    const stored = await facts.findById({ workspaceId: LOCAL_WORKSPACE_ID, factId: FACT_ID });
    expect(stored).toBeDefined();
    if (stored === undefined) {
      return;
    }
    await facts.upsert({
      workspaceId: LOCAL_WORKSPACE_ID,
      fact: {
        ...stored,
        retractedAt: NOW,
        status: 'retracted',
      },
    });
    expect(
      await facts.findById({ workspaceId: LOCAL_WORKSPACE_ID, factId: FACT_ID }),
    ).toMatchObject({ status: 'retracted' });

    await facts.purgeBySourceEpisode({
      workspaceId: LOCAL_WORKSPACE_ID,
      sourceEpisodeId: EPISODE_ID,
    });
    await evidence.purgeBySource({ workspaceId: LOCAL_WORKSPACE_ID, sourceId: EPISODE_ID });
    await episodes.purge({ workspaceId: LOCAL_WORKSPACE_ID, episodeId: EPISODE_ID });

    expect(
      await episodes.findById({ workspaceId: LOCAL_WORKSPACE_ID, episodeId: EPISODE_ID }),
    ).toBeUndefined();
    expect(
      await facts.findById({ workspaceId: LOCAL_WORKSPACE_ID, factId: FACT_ID }),
    ).toBeUndefined();
    expect(
      await facts.query({
        workspaceId: LOCAL_WORKSPACE_ID,
        knowledgeSpaceId: LOCAL_SPACE_ID,
        limit: 10,
      }),
    ).toEqual([]);
    expect(
      await evidence.findById({ workspaceId: LOCAL_WORKSPACE_ID, evidenceId: EVIDENCE_ID }),
    ).toBeUndefined();
    database.close();
  });
});
