# Dogfood postmortem — 2026-08-18 cycle 6

## Outcome

Raised the bar from workbench IA to **operator-facing copy judged from Playwright screenshots**. Chrome heading follows Capture / Recall / Inspect; space and identity hide ids; episode times use `en-GB` UTC; receipts render “Alice lives in Tokyo”; markdown headings are titles, not extra episodes. HTTP practical battery is **291** tests (including two new corpora). Playwright 01–06 were read, not only asserted.

## What went wrong or surprised you

- Cycle 5 called UUID/ISO copy **P2**. Against screenshots, `Saved ep_…`, `ks_default`, `PRINCIPAL_LOCAL-USER`, ISO instants, and `ent_alice livesIn Tokyo` still read as an internal console — that is a **P1** at a commercial-grade bar.
- Playwright green was not enough: the Capture heading still said “Overview” until we looked at PNG 01.
- Markdown `# Cafe note` became its own episode because `parseMarkdownDocument` treated heading-only segments as body.
- Dossier first pass duplicated “Carol lives in Paris.” because fact sentences omit the trailing period.

## Root cause

No screenshot review in the dogfood gate. Tests asserted “Saved” as a substring (`/Saved/iu` matched `Saved ep_…`) and never forbade `ks_`, `ent_`, or ISO `T14:`.

## P0 / P1

None remaining for this bar: no ids in chrome/status/receipts, human timestamps, tab-matching heading, guided empty Capture stream, Alice/Tokyo receipts without Paris, heading-only markdown dropped.

## P2 (not blocking)

- Native `yyyy/mm/dd` date picker on Inspect.
- No graph canvas (locked: do not clone Semantica Sigma or TrustGraph 3D).
- Recall before Extract facts honestly shows memories without triples.
- “Saved” status persists until the next remember.

## Action items

- **rule:** After web UI changes, run `pnpm test:e2e` and **read** `packages/web/test-results/screenshots/*.png`. Fail the bar if chrome, status, lists, or receipts show `ks_` / `ep_` / `ent_` / `principal_` or raw ISO instants, or if the h1 does not match the active tab.
- **no change:** Graph canvas and Cognee-style chat remain later RFC work.

## Test report

- `@brainledge/core` 39 tests; `@brainledge/server` **291** tests; `@brainledge/web` 11 unit tests.
- Playwright 1 spec passed (~0.7–1.6s) with screenshots 01–06 on compiled `serve` at `127.0.0.1:8798`.
