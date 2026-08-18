export const SQLITE_SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_metadata (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS principals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  external_subject TEXT,
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS memberships (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES principals(id),
  role TEXT NOT NULL,
  PRIMARY KEY (workspace_id, principal_id)
);

CREATE TABLE IF NOT EXISTS knowledge_spaces (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner_principal_id TEXT NOT NULL REFERENCES principals(id),
  name TEXT NOT NULL,
  visibility TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grants (
  workspace_id TEXT NOT NULL,
  knowledge_space_id TEXT NOT NULL REFERENCES knowledge_spaces(id),
  principal_id TEXT NOT NULL,
  level TEXT NOT NULL,
  PRIMARY KEY (knowledge_space_id, principal_id)
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  knowledge_space_id TEXT NOT NULL,
  principal_id TEXT,
  kind TEXT NOT NULL,
  reference_time TEXT,
  observed_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE VIRTUAL TABLE IF NOT EXISTS episode_fts USING fts5(
  content,
  episode_id UNINDEXED,
  workspace_id UNINDEXED
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  locator TEXT,
  content_hash TEXT,
  observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  error_code TEXT
);

CREATE TABLE IF NOT EXISTS job_attempts (
  job_id TEXT NOT NULL REFERENCES jobs(id),
  attempt INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  PRIMARY KEY (job_id, attempt)
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  knowledge_space_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  type_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS entity_aliases (
  entity_id TEXT NOT NULL REFERENCES entities(id),
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  source_evidence_id TEXT
);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  knowledge_space_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  predicate_id TEXT NOT NULL,
  object_json TEXT NOT NULL,
  valid_from TEXT,
  valid_until TEXT,
  asserted_at TEXT NOT NULL,
  retracted_at TEXT,
  reference_time TEXT,
  confidence REAL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  source_episode_id TEXT
);

CREATE TABLE IF NOT EXISTS fact_evidence (
  fact_id TEXT NOT NULL REFERENCES facts(id),
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  relation TEXT NOT NULL,
  PRIMARY KEY (fact_id, evidence_id, relation)
);

CREATE TABLE IF NOT EXISTS provenance_edges (
  from_type TEXT NOT NULL,
  from_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  to_type TEXT NOT NULL,
  to_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  model TEXT NOT NULL,
  vector_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  result TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  request_id TEXT
);

CREATE TABLE IF NOT EXISTS ingestions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  knowledge_space_id TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  error_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_episodes_workspace_space
  ON episodes (workspace_id, knowledge_space_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_facts_workspace_space
  ON facts (workspace_id, knowledge_space_id, asserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_entities_workspace_space
  ON entities (workspace_id, knowledge_space_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON jobs (status, created_at);
`;

export const SCHEMA_VERSION = 1;
