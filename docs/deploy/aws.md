# AWS reference (P1-039)

Contract parity with the Google Cloud mapping; not required on day-one release hardware.

- API / MCP: ECS/Fargate or EKS
- SQL: RDS/Aurora PostgreSQL
- Blobs: S3
- Jobs: SQS/EventBridge when PostgreSQL workers are insufficient
- Secrets: Secrets Manager
- Identity: OIDC-compatible IdP
- Telemetry: OpenTelemetry
