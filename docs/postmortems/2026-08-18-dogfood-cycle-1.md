# Dogfood postmortem — 2026-08-18 cycle 1

## Outcome

Documented laptop CLI (`node dist/main.js init|remember|recall`) did not run: workspace `exports` pointed at TypeScript sources, so Node resolved `.js` specifiers under `src/` that do not exist. HTTP `serve` / stdio `mcp` were stubs. Cycle 1 fixes those P0/P1 dogfood holes.

## What went wrong

- Green Vitest hid a broken compiled runtime (CI did not build before tests).
- `brainledge serve` printed `in-process:` and exited; `brainledge mcp` printed `mcp-stdio-ready` with no stdin loop.
- HTTP consolidate queued jobs the API process never ran.
- MCP `knowledge-read` alone registered zero tools.
- Compose advertised enterprise Postgres while each container used isolated SQLite.

## Root cause

Walking-skeleton surfaces were implemented as in-process functions for tests, then documented as user-facing binaries without a compiled-CLI dogfood pass.

## Action items

- **rule:** Always dogfood `node packages/*/dist/*.js` after `pnpm build`, not only Vitest.
- **product:** Point package `exports` at `dist`; alias `src` in Vitest; make serve/mcp/worker real; run consolidate inline; honest compose volume.
