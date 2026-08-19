export { openSqliteDatabase, createSqliteUnitOfWork } from './sqlite/database.js';
export { openStandalone } from './sqlite/standalone.js';
export type { StandaloneHandle } from './sqlite/standalone.js';
export { seedStandaloneIdentity } from './sqlite/seed.js';
export {
  createInMemoryStores,
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryUnitOfWork,
} from './memory/in-memory-repositories.js';
export {
  createPostgresRepositoryStub,
  PostgresNotConfiguredError,
} from './postgres/postgres-repository.stub.js';
export {
  isPostgresConfigured,
  postgresClaimJobSql,
  postgresLexicalSql,
  postgresListenSql,
  tryCreatePgPool,
} from './postgres/postgres-adapter.js';
export {
  createPostgresEpisodeRepository,
  type PostgresQueryFn,
} from './postgres/postgres-episode-repository.js';
export { createSqliteAuditRepository } from './sqlite/sqlite-audit-repository.js';
export { createSqliteIngestionRepository } from './sqlite/sqlite-ingestion-repository.js';
export { createFilesystemBlobStore } from './blobs/filesystem-blob-store.js';
export type { BlobStore } from './blobs/filesystem-blob-store.js';
export { createObjectStorageAdapter } from './blobs/object-storage.js';
export {
  createInMemoryFactRepository,
  createInMemoryEntityRepository,
} from './memory/in-memory-knowledge.js';
export { createSqliteFactRepository } from './sqlite/sqlite-fact-repository.js';
export { createSqliteEntityRepository } from './sqlite/sqlite-entity-repository.js';
export { createSqliteEmbeddingStore } from './sqlite/sqlite-embedding-store.js';
export { createSqliteDecisionRepository } from './sqlite/sqlite-decision-repository.js';
export { SCHEMA_VERSION } from './sqlite/schema.js';
export { describeStorageAdapter } from './testing/storage-contract.js';
