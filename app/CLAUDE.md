# ADAMAS — working notes for Claude

This file is the **session memory**. Read it first; it lets a fresh session be
productive without re-reading the whole repo (which is what runs up cost).

## What ADAMAS is
A local-first **decision ledger + memory vault** for M&A/valuation readiness.
- **ADAMAS** = cockpit/dashboard. **AI (Hermes)** = synthesis. **Obsidian** = memory.
- Everything runs on-device; the hard data boundary is default (cloud is opt-in,
  per-task, gated + logged). Storage is portable Markdown + JSON.

## Architecture (where things live, under `app/`)
- `src/ledger/` — decisions (canonical Markdown+JSON), bi-directional links, graph.
- `src/evaluation/` — Hermes providers: `local.ts` (deterministic heuristic),
  `ollama.ts` (local model), `cloud.ts` (gated). Interface in `provider.ts`.
  `extract.ts` = heuristic extraction/summarize shared by providers.
- `src/ingestion/` — read-only connectors (filesystem/imap/calendar), manager,
  transcribe, `scheduler.ts` (auto-pull).
- `src/knowledge/` `src/people/` `src/records/` — the three registries
  (KNW-/PER-/REC-), each: `schema.ts` (ajv) + `store.ts` (Markdown+JSON + onChange).
- `src/obsidian/` — `export.ts` (data-room vault), `readiness.ts` (valuation score,
  must sum to 100), `auto.ts` (debounced auto-export), `import.ts` (_Inbox write-back).
- `src/server/` — Fastify: `context.ts` wires all services; `routes/*`.
- `web/src/` — React/Vite client; `views/*` tabs; `api.ts` client; `tokens.ts` colors.
- `eval/` — extraction eval harness (fixtures + scorer). `npm run eval`.

## Conventions
- TS end-to-end, ESM with **`.js`** import specifiers in `src` (NodeNext); web
  imports are extensionless.
- A new "registry" feature = schema.ts + store.ts (copy people/records) + a
  routes file + context wiring + Obsidian export + a readiness component + tests.
- ESLint: put `-` last in regex char classes; no unused eslint-disable; console
  is allowed. Ajv import: `const Ajv = (M as any).default ?? M`.
- Readiness `components` must total **100** — rebalance when adding one.

## The loop (always)
`npm run ci` (lint + typecheck + tests) must be green before commit. Add tests
for new behavior. `npm run build:web` if web changed.

## Git / PR workflow
- Branch: `claude/adamas-decision-ledger-npm822`. Commit + push, open PR, squash-merge.
- Squash merges make the branch diverge from `main`; before each new PR merge,
  `git fetch origin main && git merge origin/main` and resolve with
  `git checkout --ours <file>` (this branch is the superset), then re-run CI.

## Cost discipline (keep credits low)
- **One feature ≈ one short session.** Commit + push, then `/clear`. The repo is
  the memory; context is disposable.
- Use **subagents** (Explore/Plan) for searches so big file reads stay out of the
  main thread.
- Cheaper model for routine edits/search; Opus only for hard design.
- Smaller PRs → less context + fewer merge-conflict re-reads.
