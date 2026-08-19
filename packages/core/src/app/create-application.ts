import { createInMemoryIngestionRepository } from '../ingestion/in-memory-ingestion.js';
import { createKnowledgeService } from '../knowledge/knowledge-service.js';
import { createMemoryService } from '../memory/memory-service.js';
import { createInMemoryDecisionRepository } from '../ports/decision-repository.js';

import type { Authorizer } from '../auth/authorizer.js';
import type { KnowledgeService } from '../knowledge/knowledge-service.js';
import type { MemoryService } from '../memory/memory-service.js';
import type { EmbeddingProvider, TextGenerationProvider } from '../models/providers.js';
import type { PluginManifest } from '../plugins/manifest.js';
import type { Clock } from '../ports/clock.js';
import type { DecisionRepository } from '../ports/decision-repository.js';
import type { EmbeddingStore } from '../ports/embedding-store.js';
import type { EntityRepository } from '../ports/entity-repository.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { EvidenceRepository } from '../ports/evidence-repository.js';
import type { FactRepository } from '../ports/fact-repository.js';
import type { IngestionRepository } from '../ports/ingestion-repository.js';
import type { JobRepository } from '../ports/job-repository.js';
import type { SpaceRepository } from '../ports/space-repository.js';
import type { UnitOfWork } from '../ports/unit-of-work.js';

export interface ApplicationPorts {
  readonly clock: Clock;
  readonly unitOfWork: UnitOfWork;
  readonly authorizer: Authorizer;
  readonly episodes: EpisodeRepository;
  readonly evidence: EvidenceRepository;
  readonly spaces: SpaceRepository;
  readonly jobs: JobRepository;
  readonly facts?: FactRepository;
  readonly entities?: EntityRepository;
  readonly embeddings?: EmbeddingStore;
  readonly embeddingProvider?: EmbeddingProvider;
  readonly textGenerationProvider?: TextGenerationProvider;
  readonly ingestions?: IngestionRepository;
  readonly decisions?: DecisionRepository;
  readonly plugins?: readonly PluginManifest[];
}

export interface Application {
  readonly memory: MemoryService;
  readonly knowledge?: KnowledgeService;
  readonly ports: ResolvedApplicationPorts;
}

export interface ResolvedApplicationPorts extends ApplicationPorts {
  readonly ingestions: IngestionRepository;
  readonly decisions: DecisionRepository;
}

export function createApplication(ports: ApplicationPorts): Application {
  const pluginApiVersion = '1';
  for (const plugin of ports.plugins ?? []) {
    if (plugin.apiVersion !== pluginApiVersion) {
      throw new Error(`Incompatible plugin API: ${plugin.id} ${plugin.apiVersion}`);
    }
  }
  const knowledge =
    ports.facts === undefined || ports.entities === undefined
      ? undefined
      : createKnowledgeService({
          authorizer: ports.authorizer,
          clock: ports.clock,
          unitOfWork: ports.unitOfWork,
          episodes: ports.episodes,
          facts: ports.facts,
          entities: ports.entities,
          textGenerationProvider: ports.textGenerationProvider,
        });
  const resolved: ResolvedApplicationPorts = {
    ...ports,
    ingestions: ports.ingestions ?? createInMemoryIngestionRepository(),
    decisions: ports.decisions ?? createInMemoryDecisionRepository(),
  };
  return {
    ports: resolved,
    knowledge,
    memory: createMemoryService({
      authorizer: ports.authorizer,
      clock: ports.clock,
      unitOfWork: ports.unitOfWork,
      episodes: ports.episodes,
      evidence: ports.evidence,
      facts: ports.facts,
      knowledge,
      embeddings: ports.embeddings,
      embeddingProvider: ports.embeddingProvider,
    }),
  };
}
