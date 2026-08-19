# Dogfood postmortem — 2026-08-18 cycle 4

## Outcome

Compiled CLI, HTTP, MCP, and the Vite web UI were dogfooded end-to-end. Cycle-3 P1s are closed: recall facts are query-scoped (including natural-language questions), `serve` runs an embedded worker so URL ingest completes, HTML is stored as readable text, and `GET /api/v1/spaces/:spaceId/memories` lists episodes. Playwright Chromium e2e with screenshots passed (`pnpm test:e2e`).

## What went wrong or surprised you

- Mapping `retrieve().factIds` was not enough. Query `Where does Alice live?` still attached `ent_carol livesIn Paris` because token `live` is a substring of predicate `livesIn`.
- `brainledge serve` queued `ingest-url` jobs but never processed them; URL ingest stayed `queued` unless a separate `worker` process ran.
- URL fetch stored raw HTML. `GET /memories` was 404; the UI listed via timeline and painted empty lists before projections loaded.
- `pnpm build` failed twice after the first pass of fixes: `Map<FactId, Fact>.get(string)` and TypeScript narrowing `AbortSignal.aborted` across `await`.
- Playwright e2e against an older `dist` looked green while core still failed to compile — another Vitest-vs-compiled-runtime miss.

## Root cause

Retrieval treated concatenated fact fields as a haystack (`includes`), so predicate ids leaked into unrelated questions. HTTP was tested with `app.request` (no worker loop) and URL ingest was tested with markdown bodies, so `serve` never proved the job pipeline or HTML conversion.

## P0 / P1

None remaining for the standalone laptop path (CLI + `serve` + web UI + MCP).

## P2 (not blocking)

- CLI `export` / `backup` / `restore` are silent on success; `import` prints a bare count.
- `forget` requires an episode id; recall prints content only.
- `remember --help` is stored as content, not help.
- Web has no consolidate/forget controls; graph stays empty until CLI `consolidate`.
- Memory list copy still says “timeline projection” after switching to `GET /memories`.
- `node:sqlite` ExperimentalWarning on every CLI invoke.
- Playwright is local-only (`pnpm test:e2e`); not a required CI job (browsers + 7-day `minimumReleaseAge`).

## Action items

- **rule:** After `pnpm build`, dogfood `node packages/cli/dist/main.js` with a two-fact consolidate and the question `Where does Alice live?`, not only a place name like `Tokyo`. Confirm URL ingest on `serve` reaches `succeeded` without a separate worker.
- **no change:** P2 CLI silence, forget-by-id, and web consolidate wait for a later UX pass.
- **skill/test:** Playwright lives under `@brainledge/web` (`tests/e2e`); do not fold it into `pnpm test` until CI has browsers.

## Test report

- Vitest: `@brainledge/core` 38, `@brainledge/server` 28, `@brainledge/web` 5, `@brainledge/cli` 9, `@brainledge/storage` 20 — all passed after the predicate-match fix.
- Compiled CLI (`/tmp/brainledge-dogfood-c4b-D36D`): after consolidate, `recall "Where does Alice live?"` returned only `ent_alice livesIn Tokyo`.
- HTTP (prior 8792 pass): health, UI with Ingest URL, GET memories 200, URL `https://example.com/` → readable “Example Domain” (no `<html`), OpenAPI get+post memories, MCP Alice, SSRF 400.
- Playwright Chromium: 1 passed (~1.5s); screenshots under `packages/web/test-results/screenshots/` (gitignored).
