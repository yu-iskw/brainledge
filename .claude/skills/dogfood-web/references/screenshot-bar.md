# Screenshot bar

Shots land in `packages/web/test-results/screenshots/` (Playwright `outputDir` is `packages/web/test-results`). Paths below are relative to that screenshots directory.

## Required reads

After a full `pnpm test:e2e`, **read** at least:

| File                                                           | What it must show                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `01-empty-or-loaded.png`                                       | Capture chrome; workspace name; no technical IDs                                           |
| `02-after-remember.png`                                        | Saved note text; status `Saved` not `Saved ep_…`                                           |
| `03-after-recall.png`                                          | Recall tab; answer visible (not a blank/`sr-only` pane); no `ent_` in the answer           |
| `05-after-inspect-extract.png`                                 | Inspect tab; extract result without `ks_` / `ent_` / camelCase `livesIn` in operator lists |
| `06-alice-receipts.png`                                        | Human receipts (`Alice lives in Tokyo`), not `ent_… livesIn`                               |
| `007-graph-empty.png`                                          | Empty map frame, not a collapsed postage stamp                                             |
| `008-graph-inspect-full.png`                                   | Inspect page with a map that fills `.graph-frame`                                          |
| `009-graph-fitted.png`                                         | Nodes and edge labels centered in the frame                                                |
| One `s-*-03-inspect.png` that used `works at` or `taught … in` | Those entities are on the map (not livesIn-only)                                           |

Also read any `*-selected-*.png` / selected-node canvas shots the gallery wrote. If a required file is missing, treat that as a P0 (e2e did not produce the gallery).

## Fail the bar (P0)

- Chrome, status, lists, or receipts show `ks_`, `ep_`, `ent_`, `ing_`, or `principal_`
- Operator copy shows raw ISO instants (`T12:34:56`)
- Page `h1` / `#overview-heading` does not match the active Capture / Recall / Inspect tab
- `#knowledge-graph` is not `width/height: 100%` of `.graph-frame` (a ~300×150 postage stamp)
- Playwright passed because `toHaveText(/Saved/)` matched `Saved ep_…`

## Fail the bar (P1)

- After Extract, notes that used `works at` or `taught … in` did not become nodes (livesIn-only map)
- Map nodes sit in a corner; layout ran before the canvas had a real box
- `#overview-principal` shouts `PERSONAL` in the PNG because `.shelf .meta { text-transform: uppercase }` won. `toHaveText(/PERSONAL/)` reads the DOM, not CSS — assert `toHaveCSS('text-transform', 'none')` on `#overview-principal` **and** read the PNG
- Recall answer is visually missing (`sr-only` / zero-size) even if the DOM has text

## Assertions that lie

- `toHaveText` / substring match on status (`/Saved/`)
- `toHaveText(/PERSONAL/)` for casing that CSS applies
- Vitest (`pnpm test`) — it never launches the browser

Prefer exact text (`/^Saved$/`), `toHaveCSS`, and a human look at the shot.
