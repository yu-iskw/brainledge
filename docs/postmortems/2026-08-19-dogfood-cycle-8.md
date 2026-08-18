# Dogfood postmortem — 2026-08-19 cycle 8

## Outcome

Cycle 8 raised the commercial graph bar: extract now covers **livesIn, worksAt, taught, taughtIn**. Inspect screenshots show **16 nodes · 9 edges** (Dana/Cafe, Yosano/Hospital, Thales/Hypatia teaching) with directed arrows and neighbor dimming. A new HTTP suite adds **120** remember/recall rows (`practical-cases-cycle8.test.ts`). Playwright **100** PNGs were re-read.

## What went wrong or surprised you

- Cycle 7 closed “no P0/P1” while the map only showed `livesIn`. Against Cognee/Semantica that is a **P1** for a knowledge map: workplace and teaching notes stayed invisible.
- Recall of `Where does Dana work?` before Extract still shows the note and **no facts** — honest, but operators expect remember to populate the graph.
- Fitted 16-node map crowds labels in the center cluster; arrows help but crossings remain.

## Root cause

`extractTypedFacts` was a single `livesIn` regex. Ontology seed listed only `livesIn`/`knows`.

## P0 / P1

None remaining for this bar: extraction covers the e2e notes, the canvas fills the frame, labels are human, h1 matches the tab, operator chrome still hides ids.

## P2 (not blocking)

- Label crowding / some crossings on 16-node maps.
- Remember does not auto-extract; Recall facts stay empty until Inspect → Extract facts.
- Empty graph has copy but no in-canvas CTA button.
- Native date control (styled, still browser-native).
- No Sigma/3D (intentional).

## Action items

- **rule:** After graph or extract work, e2e notes that use `works at` / `taught … in` must appear as nodes after Extract. Fail if the map is still livesIn-only.
- **no change:** Do not add Sigma or TrustGraph 3D.

## Test report

- `pnpm test`: **89 files, 716 tests**.
- Playwright: **2/2**, **100** PNGs.
- Cycle 8 HTTP corpus: **120** unique remember/recall rows plus consolidate `factCount >= 5`.
