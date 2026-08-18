# Dogfood postmortem — 2026-08-19 simplify / thermos / verifier

## Outcome

Closed the simplify → thermos → address → verifier loop with **no remaining P0/P1**. Verifier: build, lint, Vitest (90 files / 721 tests), `pnpm lint:security`, Grype, and local CodeQL all PASS. Playwright was out of this gate.

## What went wrong or surprised you

- Keying facts by subject+predicate+object (needed for multi `taught` / `worksAt`) **stopped** `livesIn` Tokyo→Paris supersession and duplicated identical triples on re-extract.
- RFC §39 still treated Graphiti as standalone-strong and Semantica as library-only; Cognee is the embedded-store peer, Graphiti needs a graph DB, Semantica ships Vite/React/Sigma + API, TrustGraph’s featured broker is Pulsar/RabbitMQ (Kafka optional).
- Node’s URL parser rewrites `[::ffff:127.0.0.1]` to `[::ffff:7f00:1]`, so a naive `::ffff:` + dotted-quad check misses mapped loopback.
- `ingest-url` `response.text()` then `MAX_INGEST_BYTES` still buffers the whole body.

## Root cause

Fact identity mixed two cardinalities. Docs compared peers from an older snapshot. SSRF and ingest size were hostname-only and post-download.

## Action items

- **no change:** Do not split `packages/web/src/main.ts` or the five `practical-cases*.test.ts` harness copies in this pass (larger than the diff).
- **no change:** DNS rebinding and awaiting in-flight ingest on `close()` remain P2.
- **rule (already in RFC §39):** Peer comparisons must name Graphiti’s graph-DB requirement and Semantica’s current explorer, not the historic serving-gap slogan alone.
