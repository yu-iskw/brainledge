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
pnpm --filter @brainledge/cli exec node dist/main.js serve --data-dir /tmp/brainledge
```

HTTP listens on `127.0.0.1:8787` (`GET /` is a remember/recall UI). MCP stdio: `brainledge mcp --data-dir /tmp/brainledge`. Remote CLI calls accept `--token` or `BRAINLEDGE_API_TOKEN`.

Phase 1 recall is lexical + recency over episode text, plus fact hits after `brainledge consolidate` (or `POST /api/v1/spaces/ks_default/consolidate`). `remember()` still does not extract.

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

`compose.yaml` runs a shared SQLite data volume for API + worker (walking skeleton). Postgres is provisioned for later enterprise work; the API does not use `DATABASE_URL` yet. Optional `--profile auth` and `--profile object-storage`. See `docs/deploy/gcp.md` and `docs/deploy/aws.md`.
