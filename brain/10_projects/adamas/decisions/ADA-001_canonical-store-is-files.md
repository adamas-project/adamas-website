---
type: decision
id: ADA-001
domain: product
project: adamas
date: 2026-06-14
status: active
tags: [decision, adamas]
---

# ADA-001 — Canonical store is Markdown + JSON files; the index is rebuildable

- **Owner:** engineering-lead
- **Dissent:** —
- **Sources:** `spec:adamas-build-plan#storage`, `/app/DECISIONS.md#PRD-002`

## Context
ADAMAS promises portability and zero vendor lock-in, and it must run on hardware the
client owns with no cloud dependency. A database would couple the data to an engine and
make "export everything, read it in plain text" untrue.

## Decision
Store every decision as a human-readable Markdown file plus a JSON index that is
**rebuildable** from the Markdown at any time. The files are the source of truth; the
index is a cache.

## Trade-offs accepted
- Slower queries than a real DB at scale — acceptable for a single-company ledger.
- We own index-rebuild logic — paid back by true portability and Obsidian compatibility.

## Linked decisions
- [[../index|ADAMAS project]]
