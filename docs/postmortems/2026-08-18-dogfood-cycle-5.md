# Dogfood postmortem — 2026-08-18 cycle 5

## Outcome

Raised the bar from walking-skeleton honesty to a **commercial space workbench**. The nine-section dump is replaced by a sticky space shelf and Capture / Recall / Inspect (vanilla Vite, not a Cognee Next.js or Semantica Sigma clone). HTTP practical battery: 102 tests. Playwright covers remember → recall receipts → extract facts → Alice/Tokyo without Paris.

## What went wrong or surprised you

- Cycle 4 closed API P1s, then this loop’s peer audit still graded the UI as an integration-test page (P0: no shell, no sticky space, recall as `<pre>`, graph as a peer section).
- Graphiti has **no** first-party web app; TrustGraph’s UI is **not** in the cloned repo. Cloning those shells was not an option.
- Sonar duplicate-string and a deleted `LOADING_MEMORIES_STATUS` constant blocked lint after the IA rewrite.

## Root cause

The previous “no P0/P1” postmortem used the walking-skeleton bar. Against Cognee/Semantica, equal-weight page sections are not a product. The recommended IA (space workbench) had been planned and then cancelled as out of cycle-4 scope.

## P0 / P1

None remaining for this bar: app shell, sticky space, two-column receipts, inspect dossier with extract/hide, Alice/Paris regression covered in HTTP + Playwright.

## P2 (not blocking)

- Triple list instead of a graph canvas (locked: no Sigma/3D in this phase).
- Episode ids still appear in status and receipts.
- Ingest is a polled status line, not a run history.
- Recall is question + receipts, not Cognee chat history.
- CLI export/backup silence and `--help` as remember content (carried from cycle 4).

## Action items

- **rule:** After UI work, dogfood Playwright tabs (Capture/Recall/Inspect) and a two-fact Alice/Carol extract, not only a single remember/recall on one long page.
- **no change:** Graph canvas and chat recall wait for a later RFC; do not clone Cognee/Semantica shells.

## Test report

- `@brainledge/server` 102 tests (includes `practical-cases.test.ts`, ~190 expects, 45-row corpus).
- `@brainledge/web` 7 unit tests; Playwright 1 spec passed (~1.6s) with screenshots 01–06.
- Compiled `serve` via Playwright webServer on `127.0.0.1:8798`.
