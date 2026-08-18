# Claude Code

@AGENTS.md

This file is the **Claude Code compatibility entrypoint**. Cursor is the primary interactive coding-agent surface for this template; shared behavior belongs in `AGENTS.md` rather than being duplicated here.

Repo-wide instructions load via **`@AGENTS.md`** above; on first use in a clone, approve **external file includes** if prompted, or check **`/memory`** and [Anthropic: importing memory files](https://docs.anthropic.com/en/docs/claude-code/claude-md#import-additional-files). Directory layout for **`.claude/`**: [`.claude/README.md`](.claude/README.md).

## Available agents

Invoked via the Agent tool (markdown definitions in `.claude/agents/`). Checked in: **`verifier`**.

| Agent      | Purpose                       |
| ---------- | ----------------------------- |
| `verifier` | Run build → lint → test cycle |

Add more agents as `.claude/agents/<name>.md` (see [`.claude/README.md`](.claude/README.md)).

## Available skills

Invoke with `/skill-name` when the skill is installed in this project:

| Skill                          | Purpose                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `build-and-fix`                | Fix build errors, type errors, compilation failures                         |
| `check-directory-structure`    | After bulk edits; audit layout; fix flat or misplaced files                 |
| `codeql-fix`                   | CodeQL database create/analyze and SARIF-driven fixes when CodeQL is set up |
| `improve-claude-config`        | Evolve `.claude/` configuration                                             |
| `initialize-project`           | Bootstrap a new repo from this template                                     |
| `lint-and-fix`                 | Fix lint/format issues via Trunk                                            |
| `manage-adr`                   | ADRs in `docs/adr`                                                          |
| `node-upgrade`                 | Upgrade Node dependencies in pnpm workspaces                                |
| `postmortem`                   | End-of-session capture to improve rules, hooks, skills (see `AGENTS.md`)    |
| `security-scan`                | `pnpm lint:security` and `pnpm security:grype`                              |
| `security-vulnerability-audit` | Structured Trunk security audit (Trivy, OSV-scanner) and reporting          |
| `setup-dev-env`                | Node, pnpm, Trunk setup                                                     |
| `test-and-fix`                 | Fix failing tests                                                           |

## Instruction maintenance

For **when** to capture learnings, **how** to classify improvements, and **where** to edit shared vs Claude-only files, see **`AGENTS.md`** (**Session closure and postmortems**, **Improving agent behavior**). To change **`.claude/`** from Claude Code, use **`/improve-claude-config`**.

## Recent learnings

- 2026-08-18: Workspace `exports` must target `dist` so `node packages/*/dist/*.js` works; Vitest keeps `src` via aliases. Always dogfood the compiled CLI, not only Vitest.
- 2026-08-18: Dogfood recall with a two-fact consolidate and `Where does Alice live?` (token `live` must not match predicate `livesIn`). `serve` must run the worker so URL ingest leaves `queued`; Playwright e2e is `pnpm test:e2e`, not the Vitest gate.
- 2026-08-18: After web UI work, run `pnpm test:e2e` and **read** the PNGs. Playwright substring `/Saved/` still matched `Saved ep_…`; chrome h1 must match the active tab; hide `ks_`/`ent_`/`principal_` and ISO instants from operator-facing copy. Graph layout must run after the canvas has a real box or the map sits in the corner.
- 2026-08-19: `#knowledge-graph` must be `width/height: 100%` of `.graph-frame`; otherwise the map is a ~300×150 postage stamp. Fit the short axis and keep node radius in screen pixels.
- 2026-08-19: After graph or extract work, e2e notes that use `works at` / `taught … in` must become nodes after Extract. A livesIn-only map is a P1 against a commercial knowledge map.
- 2026-08-19: Multi-valued extract (`taught`, `worksAt`) needs SPO identity; `livesIn` stays functional (Tokyo then Paris must supersede). Re-extract must skip identical triples. `ingest-url` must cap the stream, refuse redirects, and treat `169.254.169.254` / IPv4-mapped loopback as SSRF. Graphiti is not zero-infra; Cognee is.
