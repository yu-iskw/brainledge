import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryStores,
  createInMemoryUnitOfWork,
} from '../memory/in-memory-repositories.js';
import { openSqliteDatabase, createSqliteUnitOfWork } from '../sqlite/database.js';
import { seedStandaloneIdentity } from '../sqlite/seed.js';
import { createSqliteEpisodeRepository } from '../sqlite/sqlite-episode-repository.js';
import { createSqliteEvidenceRepository } from '../sqlite/sqlite-evidence-repository.js';
import { createSqliteJobRepository } from '../sqlite/sqlite-job-repository.js';
import { createSqliteSpaceRepository } from '../sqlite/sqlite-space-repository.js';
import { describeStorageAdapter } from '../testing/storage-contract.js';

describeStorageAdapter('in-memory', () => {
  const store = createInMemoryStores();
  return {
    episodes: createInMemoryEpisodeRepository(store),
    evidence: createInMemoryEvidenceRepository(store),
    spaces: createInMemorySpaceRepository(store),
    jobs: createInMemoryJobRepository(store),
    unitOfWork: createInMemoryUnitOfWork(),
  };
});

describeStorageAdapter('sqlite', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-sqlite-'));
  const database = openSqliteDatabase(path.join(dir, 'database.sqlite'));
  seedStandaloneIdentity(database);
  return {
    episodes: createSqliteEpisodeRepository(database),
    evidence: createSqliteEvidenceRepository(database),
    spaces: createSqliteSpaceRepository(database),
    jobs: createSqliteJobRepository(database),
    unitOfWork: createSqliteUnitOfWork(database),
  };
});
