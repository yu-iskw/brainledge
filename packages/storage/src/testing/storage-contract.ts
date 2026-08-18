import {
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  createApplication,
  createLocalAuthorizer,
  localContext,
  parseIsoUtc,
  fixedClock,
  type EpisodeRepository,
  type EvidenceRepository,
  type JobRepository,
  type SpaceRepository,
  type UnitOfWork,
} from '@brainledge/core';
import { describe, expect, it } from 'vitest';

const FIXED_NOW = parseIsoUtc('2026-08-18T00:00:00.000Z');

export function describeStorageAdapter(
  name: string,
  factory: () => {
    episodes: EpisodeRepository;
    evidence: EvidenceRepository;
    spaces: SpaceRepository;
    jobs: JobRepository;
    unitOfWork: UnitOfWork;
  },
): void {
  describe(`storage contract: ${name}`, () => {
    it('round-trips an episode in workspace scope', async () => {
      const ports = factory();
      const app = createApplication({
        clock: fixedClock(FIXED_NOW),
        authorizer: createLocalAuthorizer(),
        ...ports,
      });
      const remembered = await app.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content: 'Alice moved to Tokyo in July 2026.',
      });
      const found = await ports.episodes.findById({
        workspaceId: LOCAL_WORKSPACE_ID,
        episodeId: remembered.episodeId as never,
      });
      expect(found?.content).toMatch(/Tokyo/u);
    });

    it('isolates workspaces on findById', async () => {
      const ports = factory();
      const app = createApplication({
        clock: fixedClock(FIXED_NOW),
        authorizer: createLocalAuthorizer(),
        ...ports,
      });
      const remembered = await app.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content: 'secret-a',
      });
      const leaked = await ports.episodes.findById({
        workspaceId: 'ws_other' as never,
        episodeId: remembered.episodeId as never,
      });
      expect(leaked).toBeUndefined();
    });

    it('hides then omits from recall', async () => {
      const ports = factory();
      const app = createApplication({
        clock: fixedClock(FIXED_NOW),
        authorizer: createLocalAuthorizer(),
        ...ports,
      });
      const remembered = await app.memory.remember(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        content: 'visible then hidden',
      });
      await app.memory.forget(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        memoryId: remembered.episodeId,
        mode: 'hide',
      });
      const result = await app.memory.recall(localContext(), {
        spaceId: LOCAL_SPACE_ID,
        query: 'hidden',
      });
      expect(result.memories).toHaveLength(0);
    });
  });
}
