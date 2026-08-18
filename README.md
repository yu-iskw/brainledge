# Brainledge

Standalone-first TypeScript context, memory, and knowledge platform. The same contracts serve a laptop install (`brainledge` CLI + SQLite + loopback) and enterprise deployments (PostgreSQL, OIDC, workers).

- **CLI:** `brainledge`
- **npm scope:** `@brainledge/*`
- **License:** Apache-2.0
- **Design:** [docs/rfc/0001-standalone-first-context-platform.md](docs/rfc/0001-standalone-first-context-platform.md)

## Getting started

### Prerequisites

- [pnpm](https://pnpm.io/) **11.x** (see `packageManager` in `package.json`; use [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)
- Node.js **24.x** preferred (see `.node-version`; `node:sqlite` is experimental)

```bash
pnpm install
pnpm build
pnpm test
```

### Laptop demo

```bash
pnpm --filter @brainledge/cli exec node dist/main.js init --data-dir /tmp/brainledge
pnpm --filter @brainledge/cli exec node dist/main.js remember --data-dir /tmp/brainledge "Alice moved to Tokyo in July 2026."
pnpm --filter @brainledge/cli exec node dist/main.js recall --data-dir /tmp/brainledge "Where does Alice live?"
```

Phase 1 recall is lexical + recency over episode text (not extracted facts). Extraction runs via `memory.consolidate`.

### Packages

| Package               | Role                                           |
| --------------------- | ---------------------------------------------- |
| `@brainledge/core`    | Domain, ports, `createApplication`             |
| `@brainledge/storage` | SQLite, in-memory Nullables, Postgres adapters |
| `@brainledge/server`  | Hono REST + MCP JSON-RPC                       |
| `@brainledge/cli`     | `brainledge` CLI                               |
| `@brainledge/web`     | Vite UI (remember / recall / spaces)           |

CLI and server only construct adapters. `@brainledge/core` does not import Hono, `node:sqlite`, or `pg`.

## Quality gates

```bash
pnpm lint:eslint
pnpm knip
pnpm test
pnpm coverage
pnpm build
```

## Enterprise path

`compose.yaml` runs Postgres + API + worker (`APP_PROFILE=enterprise`). Optional `--profile auth` and `--profile object-storage`. See `docs/deploy/gcp.md` and `docs/deploy/aws.md`.
