import path from 'node:path';

import {
  createApplication,
  createLocalAuthorizer,
  systemClock,
  type Application,
  type AuditRepository,
  type IngestionRepository,
} from '@brainledge/core';

import { createSqliteUnitOfWork, openSqliteDatabase } from './database.js';
import { seedStandaloneIdentity } from './seed.js';
import { createSqliteAuditRepository } from './sqlite-audit-repository.js';
import { createSqliteEmbeddingStore } from './sqlite-embedding-store.js';
import { createSqliteEntityRepository } from './sqlite-entity-repository.js';
import { createSqliteEpisodeRepository } from './sqlite-episode-repository.js';
import { createSqliteEvidenceRepository } from './sqlite-evidence-repository.js';
import { createSqliteFactRepository } from './sqlite-fact-repository.js';
import { createSqliteIngestionRepository } from './sqlite-ingestion-repository.js';
import { createSqliteJobRepository } from './sqlite-job-repository.js';
import { createSqliteSpaceRepository } from './sqlite-space-repository.js';

import type { DatabaseSync } from 'node:sqlite';

export interface StandaloneHandle {
  readonly application: Application;
  readonly database: DatabaseSync;
  readonly dataDir: string;
  readonly audit: AuditRepository;
  readonly ingestions: IngestionRepository;
  close(): void;
}

export function openStandalone(dataDir: string): StandaloneHandle {
  const database = openSqliteDatabase(path.join(dataDir, 'database.sqlite'));
  seedStandaloneIdentity(database);
  const audit = createSqliteAuditRepository(database);
  const ingestions = createSqliteIngestionRepository(database);
  const application = createApplication({
    clock: systemClock(),
    unitOfWork: createSqliteUnitOfWork(database),
    authorizer: createLocalAuthorizer(),
    episodes: createSqliteEpisodeRepository(database),
    evidence: createSqliteEvidenceRepository(database),
    spaces: createSqliteSpaceRepository(database),
    jobs: createSqliteJobRepository(database),
    facts: createSqliteFactRepository(database),
    entities: createSqliteEntityRepository(database),
    embeddings: createSqliteEmbeddingStore(database),
    ingestions,
  });
  return {
    application,
    database,
    dataDir,
    audit,
    ingestions,
    close() {
      database.close();
    },
  };
}
