# P2 optional adapters

Each item has a port plus an in-process adapter. Standalone boots with them absent.

| ID     | Adapter                                                       |
| ------ | ------------------------------------------------------------- |
| P2-001 | `createCedarCompatiblePolicyEngine`                           |
| P2-002 | `postgresRlsSql`                                              |
| P2-003 | `createInMemorySparql`                                        |
| P2-004 | `createInMemoryGraphProjection`                               |
| P2-005 | `createReteEngine`                                            |
| P2-006 | `owlSubclassOf`                                               |
| P2-007 | `createInMemoryTaskQueue('cloud-tasks' \| 'pubsub' \| 'sqs')` |
| P2-008 | `createSignedWebhookPort`                                     |
| P2-009 | `encodeA2A`                                                   |
| P2-010 | `mcpApps`                                                     |
| P2-011 | `createFederation`                                            |
| P2-012 | `createReplicationHook` + `docs/replication.md`               |
| P2-013 | `createLocalKms`                                              |
| P2-014 | `createLegalHold`                                             |
| P2-015 | `createClassificationMask`                                    |
| P2-016 | `createDifferentialContext`                                   |
| P2-017 | `createQualityEval`                                           |
| P2-018 | `createExtractionArbitration`                                 |
| P2-019 | `createLifecycle`                                             |
| P2-020 | `soc2Pack`                                                    |
