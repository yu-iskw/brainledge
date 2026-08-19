# Dogfood postmortem — 2026-08-18 cycle 2

## Outcome

Compiled CLI and HTTP walking skeleton now run. `node packages/cli/dist/main.js` init/remember/recall/consolidate/forget/status/doctor work; unknown commands exit 1; `node packages/server/dist/main.js api` serves health, UI, remember/recall, and inline consolidate. Vitest 80/80, ESLint, knip, and Trunk check are green.

## What went wrong or surprised you

- Cycle 1: documented `node dist/main.js` could not start because workspace `exports` pointed at TypeScript sources.
- `serve` / `mcp` were test stubs. HTTP consolidate queued jobs the API never ran. MCP `knowledge-read` registered zero tools.
- After forget, recall still attached unrelated facts until retrieval filtered facts by query tokens.

## Root cause

Surfaces were written for in-process Vitest first. Package exports and CLI entrypoints were not dogfooded as compiled Node.

## P0 / P1

None remaining for the walking-skeleton laptop path.

## P2 (not blocking)

- Postgres in Compose is unused; API still uses SQLite on a shared volume.
- Episode hide does not retract extracted facts in storage (CLI omits facts when no memories match).
- OpenAPI paths lack request/response schemas.
- `node:sqlite` ExperimentalWarning on every CLI invocation.
- OIDC Compose profile is still a placeholder.
- Embeddings are stored but not populated (Phase 1 lexical recall).

## Action items

- **rule (done):** Dogfood compiled `dist` CLI; Vitest aliases `src`.
- **no change:** P2 items wait for the enterprise/semantic phases in the RFC.
