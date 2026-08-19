# Dogfood postmortem — 2026-08-19 cycle 7

## Outcome

Inspect ships a **vanilla Canvas 2D knowledge map** (nodes, edges, pan/zoom, click-to-inspect, neighbor dimming, edge labels on select). Playwright captured **100** screenshots; 007–013, 01, 03, and 05 were read. Operator chrome still hides `ks_` / `ep_` / `ent_` ids. HTTP practical battery remains in place (`practical-cases-graph.test.ts` plus earlier suites).

## What went wrong or surprised you

- Missing Inspect graph was a **P1** once the bar was Cognee/Semantica, not “nice to have”.
- `#knowledge-graph` had no CSS size, so the canvas stayed at the HTML default (~300×150) in the corner of a 28rem frame. `size()` then used `Math.max(320, rect)` and painted a postage stamp.
- `fitCamera` capped scale at 1.6 while node radius scaled with camera, so “Fit” could not fill the short axis without giant circles.
- Playwright `toBeHidden()` on `<canvas hidden>` is not reliable; assert `#graph-empty`.
- Graph and workbench e2e share one SQLite; each spec must create its own space.
- Screenshot helper once appended `.png` to names that already had `.png`.

## Root cause

The map was laid out in bitmap pixels that did not match the frame. Commercial-looking chrome hid a default-sized canvas.

## P0 / P1

None remaining for this bar. Fitted shots are centered in the frame; labels are human; selection dims non-neighbors; Capture/Recall/Inspect h1 matches the tab.

## P2 (not blocking)

- Some edge crossings; no arrows or curved edges.
- `worksAt` / “taught” notes often do not extract, so Dana/Yosano/Thales may be notes-only (Recall can still show the matching note).
- Native `yyyy/mm/dd` date picker.
- Zoom-in can clip a literal label (Tokyo on 010).
- No Sigma/3D (intentional vs Semantica/TrustGraph).

## Action items

- **rule:** After graph UI work, run `pnpm test:e2e` and read empty / fitted / selected-node PNGs. Fail if the canvas is the HTML default size in a corner, if nodes show `ent_`, or if there are no edges after extract. Canvas CSS must be `width/height: 100%` of `.graph-frame`.
- **no change:** Do not add Sigma, React, or TrustGraph 3D for v1.

## Test report

- `graph-layout.test.ts` 4/4; Playwright 2/2 (~6s); **100** PNGs under `packages/web/test-results/screenshots`.
