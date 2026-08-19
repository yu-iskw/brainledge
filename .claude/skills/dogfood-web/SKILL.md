---
name: dogfood-web
description: >
  Run Playwright web e2e, then read the PNG screenshots and fail the operator bar
  (IDs, ISO instants, tab h1, postage-stamp map, livesIn-only graph, CSS shout).
  Use after web UI, graph canvas, extract/Inspect, Capture/Recall copy, or dogfood
  work. Do not use `pnpm test` (Vitest) as a substitute. Commands: pnpm test:e2e,
  Playwright, screenshots, knowledge map, #knowledge-graph.
compatibility: Requires pnpm, a prior `pnpm build` so CLI and web `dist` exist, and Playwright Chromium (`pnpm --filter @brainledge/web exec playwright install chromium` if browsers are missing). Not a required CI job.
---

# Dogfood Web

## Purpose

Prove the compiled web UI looks like a curator workbench, not a passing unit suite. Playwright green is not enough: **read the PNGs**.

Do **not** use `/test-and-fix` or `pnpm test` for this. Those are Vitest only. Playwright is `pnpm test:e2e` and is **not** in the default GitHub Actions gate.

## When to use

- After edits under `packages/web/` (HTML, CSS, canvas, display copy, e2e)
- After extract / knowledge-map / Inspect work
- When the user says dogfood, screenshots, e2e, or “look at the UI”
- Before claiming UI work is done

## When to skip

- Backend-only changes with no operator-facing copy or layout
- Docs-only or skill-only edits that do not touch the web UI

## Loop

Work from the git repository root.

1. **Build.** Run `pnpm build`. Package `exports` point at `dist`; Vitest aliases `src`. Skip this only when `packages/cli/dist/main.js` and `packages/web/dist` are already current for this tree.
2. **E2E.** Run `pnpm test:e2e` (same as `pnpm --filter @brainledge/web test:e2e`). If Chromium is missing, install it, then re-run. Do not treat a skipped Playwright run as a pass.
3. **Read PNGs.** Open every file under `packages/web/test-results/screenshots/` with the Read tool (images). Passing assertions without reading shots is a fail.
4. **Apply the bar.** Use [references/screenshot-bar.md](references/screenshot-bar.md). Any P0/P1 on that list fails the skill even if Playwright exited 0.
5. **Fix and repeat.** Change the product (or the e2e that failed to catch it), then rebuild and re-run from step 1. Cap at 5 iterations; then stop and report remaining visual P0/P1s.

## Success criteria

- `pnpm test:e2e` exits 0
- Required shots exist and were **read** (see the screenshot bar)
- No P0/P1 from the screenshot bar remains

## Termination

- Bar is clean, or
- 5 distinct fix attempts still leave a visual P0/P1 (report and stop)
