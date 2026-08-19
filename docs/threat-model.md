# Threat model (P1-040)

Scope: Brainledge standalone and enterprise profiles.

## Cross-tenant leakage

Mitigation: every repository method requires `workspaceId` from authorized context. Contract tests prove findById does not cross workspaces. PostgreSQL RLS (P2-002) is defense in depth, not the only control.

## Prompt injection and malicious documents

Ingested text is untrusted. It cannot change authorization, install plugins, or execute shell commands. MCP responses separate trusted metadata from untrusted content.

## SSRF

URL ingestion must allow only http/https and deny link-local, metadata, and private ranges unless explicitly configured.

## Model-provider leakage

Do not log prompts, embeddings, or API keys. Provider adapters send only the extraction/recall payload.

## Plugin supply chain

Compile-time registration only. Incompatible `apiVersion` is rejected. Plugins receive capability-scoped ports, never raw database handles.

## Authorization bypass

HTTP authenticates; use cases authorize. Local implicit auth is loopback-only.

## Audit tampering

Audit events are append-only and must not store deleted body content.

## Data remanence

`purge` must delete derived embeddings and projections. Backup archives include schema version for restore validation.
