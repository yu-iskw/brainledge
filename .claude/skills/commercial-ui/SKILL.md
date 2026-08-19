---
name: commercial-ui
description: Use when designing, implementing, reviewing, or polishing Brainledge's web interface. Orchestrates visual direction, production frontend engineering, accessibility, responsive behavior, and Playwright verification.
---

# Commercial UI workflow for Brainledge

Use this workflow for UI work under `packages/web/`.

## 1. Establish product truth before aesthetics

Read the relevant product/RFC documentation and the incumbent UI code first. State the surface's audience and single primary job. Preserve Brainledge terminology, data semantics, privacy boundaries, permissions, and workflows.

If a new visual direction is required, use the installed `frontend-design` and `impeccable` Claude plugins when available. Otherwise make a compact design plan covering semantic color tokens, typography roles, spacing/density, information hierarchy, interaction states, and one justified signature element. Avoid generic AI defaults such as arbitrary gradients, oversized cards, excessive rounding, decorative statistics, or uniform card grids that ignore information priority.

## 2. Engineer the UI, do not merely style it

Use the project `frontend-ui-engineering` skill as the implementation quality floor. Prefer semantic HTML and native controls. Reuse existing primitives and tokens before creating new ones. Keep data and domain logic separate from presentation.

Every interactive surface must cover loading, empty, error, disabled, success, and destructive states when those states can occur. User-visible actions and status messages must use consistent terminology.

Do not introduce React, Next.js, shadcn/ui, Tailwind, or another frontend framework/design system merely to satisfy this workflow. Brainledge's current web package is Vite-based without React; adopting a framework or component system is a separate architectural decision.

## 3. Accessibility and responsive behavior are acceptance criteria

At minimum verify keyboard access, visible focus, semantic headings/landmarks, form labels, meaningful accessible names, contrast, non-color-only state communication, touch targets, reduced-motion behavior when animation exists, and zoom/reflow. Use `.claude/references/accessibility-checklist.md` for the detailed checklist.

Explicitly inspect representative phone, tablet, laptop, and wide desktop widths rather than assuming responsiveness from CSS alone.

## 4. Verify the rendered application

Use the project Playwright MCP from `.cursor/mcp.json` when working in Cursor. Brainledge also has repository Playwright E2E tests, so preserve and extend those tests when behavior changes.

Run relevant build/tests first, then inspect the rendered surface in one bounded desktop+mobile pass. Exercise primary interactions, keyboard navigation, empty/error states that can be reached safely, console errors, overflow, clipping, and unintended layout shifts. Fix findings as one batch and perform at most one confirmation pass. Prefer durable assertions in `packages/web/tests/` for regressions that matter.

## 5. Completion standard

A UI task is complete only when it preserves product behavior, follows a coherent design system, is accessible and responsive, handles meaningful states, passes relevant repository checks including E2E when affected, and has been inspected in the browser. Report what was actually verified and any residual limitations.
