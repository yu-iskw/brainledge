# Google Cloud reference (P1-038)

Keep provider mapping out of `@brainledge/core`.

- API / MCP: Cloud Run
- Worker: Cloud Run service or jobs
- SQL: AlloyDB or Cloud SQL PostgreSQL
- Blobs: Cloud Storage
- Secrets: Secret Manager
- Identity: existing OIDC IdP
- Telemetry: OpenTelemetry exporters

Terraform for this mapping belongs in a deploy repository or `deploy/gcp`, not in domain packages.
