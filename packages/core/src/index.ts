export {
  asAuditEventId,
  asDecisionId,
  asEntityId,
  asEpisodeId,
  asEvidenceId,
  asFactId,
  asIngestionRunId,
  asJobId,
  asKnowledgeSpaceId,
  asOrganizationId,
  asPrincipalId,
  asWorkspaceId,
  LOCAL_ORGANIZATION_ID,
  LOCAL_PRINCIPAL_ID,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
} from './domain/ids.js';
export type {
  AuditEventId,
  DecisionId,
  EntityId,
  EpisodeId,
  EvidenceId,
  FactId,
  IngestionRunId,
  JobId,
  KnowledgeSpaceId,
  OrganizationId,
  PrincipalId,
  WorkspaceId,
} from './domain/ids.js';
export { parseIsoUtc, toIsoUtc } from './domain/time.js';
export type { IsoUtcTimestamp } from './domain/time.js';
export { newId, sha256 } from './domain/hash.js';
export { AppError, isAppError } from './errors/app-error.js';
export type { Principal, PrincipalRef, PrincipalType } from './identity/principal.js';
export type { Organization } from './identity/organization.js';
export type { Workspace } from './identity/workspace.js';
export type { Membership, MembershipRole } from './identity/membership.js';
export type { KnowledgeSpace, KnowledgeSpaceVisibility } from './spaces/knowledge-space.js';
export type { Action, GrantLevel } from './auth/action.js';
export type {
  AuthorizationDecision,
  AuthorizationRequest,
  Authorizer,
  ExecutionContext,
  ResourceRef,
} from './auth/authorizer.js';
export { createLocalAuthorizer } from './auth/local-authorizer.js';
export { createDatabaseAuthorizer } from './auth/database-authorizer.js';
export type { GrantRecord } from './auth/database-authorizer.js';
export { authorizeOrThrow } from './auth/authorize.js';
export { localContext, localPrincipal } from './identity/local.js';
export type { Entity, EntityAlias, EntityRef } from './knowledge/entity.js';
export type { Episode, EpisodeKind } from './knowledge/episode.js';
export type { Evidence, EvidenceSourceType, FactEvidence } from './knowledge/evidence.js';
export {
  assertFactInvariant,
  deriveFactStatus,
  factObjectKey,
  subjectPredicateKey,
} from './knowledge/fact.js';
export type { Fact, FactObject, FactStatus, LiteralValue, PredicateRef } from './knowledge/fact.js';
export type { ProvenanceEdge, ProvenanceRef, ProvenanceRelation } from './knowledge/provenance.js';
export type { Clock } from './ports/clock.js';
export { fixedClock, systemClock } from './ports/clock.js';
export type { UnitOfWork } from './ports/unit-of-work.js';
export { passthroughUnitOfWork } from './ports/unit-of-work.js';
export type { EpisodeRepository } from './ports/episode-repository.js';
export type { EvidenceRepository } from './ports/evidence-repository.js';
export type { SpaceRepository } from './ports/space-repository.js';
export type { JobRecord, JobRepository, JobStatus } from './ports/job-repository.js';
export type { FactRepository } from './ports/fact-repository.js';
export type { EntityRepository } from './ports/entity-repository.js';
export type { EmbeddingStore, StoredEmbedding } from './ports/embedding-store.js';
export type {
  IngestionRepository,
  IngestionRun,
  IngestionStatus,
} from './ports/ingestion-repository.js';
export type { AuditEvent, AuditRepository } from './ports/audit-repository.js';
export { createMemoryService } from './memory/memory-service.js';
export type { MemoryService } from './memory/memory-service.js';
export type {
  ForgetInput,
  ForgetMode,
  MemoryHit,
  RecallInput,
  RecallResult,
  RememberInput,
} from './memory/types.js';
export { createApplication } from './app/create-application.js';
export type { Application, ApplicationPorts } from './app/create-application.js';
export {
  createFakeEmbeddingProvider,
  createFakeTextGenerationProvider,
} from './models/providers.js';
export type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  GenerationRequest,
  GenerationResponse,
  TextGenerationProvider,
} from './models/providers.js';
export {
  createAnthropicCompatibleProvider,
  createOpenAiCompatibleProvider,
  createVertexCompatibleProvider,
} from './models/openai-compatible.js';
export type { PluginCapability, PluginManifest } from './plugins/manifest.js';
export { cosineSimilarity, tokenBudgetTrim } from './search/recall-support.js';
export { lexicalTokens } from './search/lexical.js';
export { retrieve } from './search/retrieval.js';
export {
  EXACT_COSINE_SOFT_LIMIT,
  documentedCosineLimits,
  exactVectorSearch,
  graphNeighbors,
  graphPath,
} from './search/graph.js';
export {
  createAllowAllPolicyEngine,
  createCedarCompatiblePolicyEngine,
  createClassificationMask,
  createDifferentialContext,
  createExtractionArbitration,
  createFederation,
  createInMemoryGraphProjection,
  createInMemorySparql,
  createInMemoryTaskQueue,
  createLegalHold,
  createLifecycle,
  createLocalKms,
  createQualityEval,
  createReplicationHook,
  createReteEngine,
  createSignedWebhookPort,
  encodeA2A,
  mcpApps,
  owlSubclassOf,
  postgresRlsSql,
  soc2Pack,
} from './plugins/p2-ports.js';
export type {
  GraphProjectionPort,
  KmsPort,
  PolicyEnginePort,
  SparqlPort,
  TaskQueuePort,
  WebhookPort,
} from './plugins/p2-ports.js';
export { extractTypedFacts } from './ingestion/extract.js';
export { assertSafeIngestionUrl, assertSafeRelativePath } from './ingestion/ssrf.js';
export { parseMarkdownDocument } from './ingestion/markdown.js';
export { evaluateDatalog } from './reasoning/datalog.js';
export type { DatalogRule, DatalogTuple } from './reasoning/datalog.js';
export { parseRuleDsl } from './reasoning/rule-dsl.js';
export { validateFactsAgainstOntology } from './ontology/validate.js';
export type { OntologyType } from './ontology/validate.js';
export { createInMemoryOntologyRegistry } from './ontology/registry.js';
export type { OntologyPort } from './ontology/registry.js';
export { exportFactsJsonLd } from './knowledge/rdf-export.js';
export { buildContext } from './search/context-builder.js';
export { createIdentityReranker } from './search/rerank.js';
export type { RerankPort } from './search/rerank.js';
export { createKnowledgeService } from './knowledge/knowledge-service.js';
export type { KnowledgeService } from './knowledge/knowledge-service.js';
export { findContradictoryPairs } from './knowledge/contradictions.js';
export { supersedeFact } from './knowledge/supersede.js';
export { normalizeAlias, resolveEntityByAlias } from './knowledge/resolution.js';
export { createDecision } from './knowledge/decision.js';
export { runQueuedJobs } from './jobs/runner.js';
export { hashLocalApiToken, verifyLocalApiToken } from './auth/local-token.js';
export { isDelegationActive } from './auth/delegation.js';
export type { Delegation } from './auth/delegation.js';
export { canSeePrivateSpace } from './auth/visibility.js';
export { sessionEpisodes } from './session/session-memory.js';
export { createNoopTracer } from './observability/tracer.js';
export { isExpired } from './retention/policy.js';
