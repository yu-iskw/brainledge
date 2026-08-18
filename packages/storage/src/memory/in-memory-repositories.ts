import { lexicalTokens, passthroughUnitOfWork } from '@brainledge/core';

import { assertWorkspaceScope } from '../scope.js';

import type {
  Episode,
  EpisodeRepository,
  Evidence,
  EvidenceRepository,
  JobRecord,
  JobRepository,
  KnowledgeSpace,
  SpaceRepository,
  UnitOfWork,
} from '@brainledge/core';

interface InMemoryStores {
  readonly episodes: Episode[];
  readonly evidence: Evidence[];
  readonly spaces: KnowledgeSpace[];
  readonly jobs: JobRecord[];
}

export function createInMemoryStores(): InMemoryStores {
  return { episodes: [], evidence: [], spaces: [], jobs: [] };
}

export function createInMemoryUnitOfWork(): UnitOfWork {
  return passthroughUnitOfWork();
}

export function createInMemoryEpisodeRepository(store: InMemoryStores): EpisodeRepository {
  return {
    async insert({ workspaceId, episode }) {
      assertWorkspaceScope(episode.workspaceId, workspaceId);
      store.episodes.push({ ...episode });
      return Promise.resolve();
    },
    findById({ workspaceId, episodeId }) {
      return Promise.resolve(
        store.episodes.find(
          (item) =>
            item.workspaceId === workspaceId &&
            item.id === episodeId &&
            item.deletedAt === undefined,
        ),
      );
    },
    searchLexical({ workspaceId, knowledgeSpaceId, query, limit }) {
      const tokens = lexicalTokens(query);
      return Promise.resolve(
        store.episodes
          .filter(
            (item) =>
              item.workspaceId === workspaceId &&
              item.knowledgeSpaceId === knowledgeSpaceId &&
              !item.hidden &&
              item.deletedAt === undefined &&
              (tokens.length === 0 ||
                tokens.some((token) => item.content.toLowerCase().includes(token))),
          )
          .slice(0, limit),
      );
    },
    listRecent({ workspaceId, knowledgeSpaceId, limit }) {
      return Promise.resolve(
        store.episodes
          .filter(
            (item) =>
              item.workspaceId === workspaceId &&
              item.knowledgeSpaceId === knowledgeSpaceId &&
              !item.hidden &&
              item.deletedAt === undefined,
          )
          .slice()
          .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
          .slice(0, limit),
      );
    },
    hide({ workspaceId, episodeId }) {
      const index = store.episodes.findIndex(
        (item) => item.workspaceId === workspaceId && item.id === episodeId,
      );
      if (index >= 0) {
        store.episodes[index] = { ...store.episodes[index], hidden: true };
      }
      return Promise.resolve();
    },
    delete({ workspaceId, episodeId }) {
      const index = store.episodes.findIndex(
        (item) => item.workspaceId === workspaceId && item.id === episodeId,
      );
      if (index >= 0) {
        store.episodes[index] = {
          ...store.episodes[index],
          deletedAt: new Date().toISOString() as Episode['deletedAt'],
        };
      }
      return Promise.resolve();
    },
  };
}

export function createInMemoryEvidenceRepository(store: InMemoryStores): EvidenceRepository {
  return {
    async insert({ workspaceId, evidence }) {
      assertWorkspaceScope(evidence.workspaceId, workspaceId);
      store.evidence.push(evidence);
      return Promise.resolve();
    },
    findById({ workspaceId, evidenceId }) {
      return Promise.resolve(
        store.evidence.find((item) => item.workspaceId === workspaceId && item.id === evidenceId),
      );
    },
  };
}

export function createInMemorySpaceRepository(store: InMemoryStores): SpaceRepository {
  return {
    get({ workspaceId, spaceId }) {
      return Promise.resolve(
        store.spaces.find((item) => item.workspaceId === workspaceId && item.id === spaceId),
      );
    },
    list({ workspaceId }) {
      return Promise.resolve(store.spaces.filter((item) => item.workspaceId === workspaceId));
    },
    async insert({ workspaceId, space }) {
      assertWorkspaceScope(space.workspaceId, workspaceId);
      store.spaces.push(space);
      return Promise.resolve();
    },
  };
}

export function createInMemoryJobRepository(store: InMemoryStores): JobRepository {
  return {
    async enqueue({ workspaceId, job }) {
      assertWorkspaceScope(job.workspaceId, workspaceId);
      store.jobs.push({ ...job });
      return Promise.resolve();
    },
    claim() {
      const index = store.jobs.findIndex((item) => item.status === 'queued');
      if (index === -1) {
        return Promise.resolve(undefined);
      }
      const current = store.jobs[index];
      const next: JobRecord = {
        ...current,
        status: 'running',
        attempts: current.attempts + 1,
      };
      store.jobs[index] = next;
      return Promise.resolve(next);
    },
    succeed({ workspaceId, jobId }) {
      const index = store.jobs.findIndex(
        (item) => item.workspaceId === workspaceId && item.id === jobId,
      );
      if (index >= 0) {
        store.jobs[index] = { ...store.jobs[index], status: 'succeeded' };
      }
      return Promise.resolve();
    },
    fail({ workspaceId, jobId, errorCode }) {
      const index = store.jobs.findIndex(
        (item) => item.workspaceId === workspaceId && item.id === jobId,
      );
      if (index >= 0) {
        store.jobs[index] = { ...store.jobs[index], status: 'failed', errorCode };
      }
      return Promise.resolve();
    },
  };
}
