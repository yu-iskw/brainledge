# Cross-region replication hook points (P2-012)

Standalone and single-region enterprise remain the default.

Hook: `ReplicationHookPort.onCommit(workspaceId, payload)` after a successful unit of work. Adapters may no-op.

Strategy:

1. SQL is the source of truth; replicate WAL or logical decoding for Postgres.
2. Do not replicate embeddings as a separate system of record.
3. Object blobs follow the blob store adapter (FS, GCS, S3).
4. Fail closed if a replica cannot apply a workspace-scoped transaction.
