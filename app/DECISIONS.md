# ADAMAS Build Decisions

This file dogfoods the ADAMAS concept: the key engineering decisions for the
build are recorded here in the same schema shape ADAMAS uses for the ledger
(`id`, `domain`, `date`, `title`, `context`, `decision`, `owner`, `tradeoffs`,
`links`, `sources`, `status`). Domain `product` is used for build/architecture
decisions.

---

### PRD-001 — TypeScript end-to-end (Node + Fastify API, React + Vite client)

- **date:** 2026-06-14
- **context:** Need a pragmatic, well-supported stack that runs 24/7 on a single
  small machine (reference: Mac Mini M4), is easy to type-check end to end, and
  has no heavy native dependencies that complicate local deployment.
- **decision:** Use TypeScript on both ends. Fastify for the HTTP API (pure JS,
  fast, no native build). React + Vite for the client, built to static assets the
  server hosts. One container runs the whole app.
- **owner:** { role: "engineering-lead" }
- **tradeoffs:** ["Single language reduces context-switching but couples client
  and server release cadence", "Fastify is less batteries-included than Next.js,
  traded for a smaller, inspectable surface"]
- **links:** ["PRD-002", "PRD-003"]
- **sources:** ["spec:adamas-build-plan#tech-standards"]
- **status:** active

---

### PRD-002 — Canonical store is Markdown + JSON files; index is rebuildable

- **date:** 2026-06-14
- **context:** Storage must be open, portable, and vendor-lock-in-free. The spec
  asks for SQLite as the JSON index with Markdown+JSON files as the source of
  truth. Native SQLite builds (better-sqlite3) add a compile step that can fail
  on constrained/ephemeral hosts.
- **decision:** Treat the per-decision `{ID}_{slug}.md` Markdown file (with a
  YAML-ish front-matter JSON block) plus a JSON record as the canonical source of
  truth. The query index is a derived artifact rebuildable from the files at any
  time, accessed through an `Index` interface. Ship a pure-TypeScript file-backed
  index implementation (zero native deps) and document SQLite as a drop-in
  alternative behind the same interface.
- **owner:** { role: "engineering-lead", dissent: [] }
- **tradeoffs:** ["Pure-TS index trades raw query speed at very large scale for
  zero native build risk and trivial portability", "Index is disposable, so
  correctness always derives from the files — never the other way around"]
- **links:** ["PRD-001"]
- **sources:** ["spec:adamas-build-plan#core-data-model", "spec:adamas-build-plan#security"]
- **status:** active

---

### PRD-003 — LLM behind a provider interface; local-first by default

- **date:** 2026-06-14
- **context:** Hermes (the evaluation agent) must run locally and be swappable;
  an optional hybrid-cloud route must be opt-in per task with a hard data
  boundary.
- **decision:** Define an `LLMProvider` interface with `LocalLLMProvider`
  (default, deterministic mock standing in for a local model) and
  `CloudLLMProvider` (gated behind a per-task approval flow). Nothing reaches a
  cloud provider unless a task is explicitly approved, and every route taken is
  logged into the ledger.
- **owner:** { role: "engineering-lead" }
- **tradeoffs:** ["A mock local provider keeps the build deterministic and
  offline-testable; a real model (e.g. Ollama) drops in behind the same
  interface"]
- **links:** ["PRD-001"]
- **sources:** ["spec:adamas-build-plan#architecture", "spec:adamas-build-plan#security"]
- **status:** active

---

### PRD-004 — Assets are assembled only from existing ledger decisions

- **date:** 2026-06-14
- **context:** The asset generator is the core differentiator. It must never
  invent content; every section must trace to real decision IDs and auto-flag
  stale when sources change.
- **decision:** Model assets as templates (`domains/decisions drawn from` +
  `section -> decision query` mapping). The engine fills sections only from
  matching ledger entries, records SRC decision IDs per section as structured
  metadata and rendered text, builds a dependency graph (section -> source IDs),
  and marks dependent assets stale on any source change.
- **owner:** { role: "engineering-lead" }
- **tradeoffs:** ["Template-driven generation is less free-form than an LLM
  writer, traded for full traceability and reproducibility"]
- **links:** ["PRD-002"]
- **sources:** ["spec:adamas-build-plan#asset-generation"]
- **status:** active
