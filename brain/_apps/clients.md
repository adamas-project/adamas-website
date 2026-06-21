---
type: app
app: clients
status: active
owner: founder
tags: [app]
---

# Clients — app #2

> Run client engagements: keep the **reasoning** in the vault, the **state** in Monday.

## Purpose
One home per client for everything you decide and learn while working with them —
so nothing lives only in your head, and any engagement could survive a handover.
Mirrors the ADAMAS delivery chain (`/delivery`, Stages 1–5).

## Inputs
- folders: `10_projects/clients/<name>/`, `00_inbox/` (client-tagged captures)
- connectors: Monday.com (pipeline + delivery board state), Gmail (client threads),
  Google Calendar (calls), Google Drive (shared docs), GitHub (client repos)

## Outputs
- per-client folder from `_client-template/`: `index.md`, `decisions/`, `meetings/`,
  `people/`, `assets/`
- decisions → `10_projects/clients/<name>/decisions/<ID>_*.md`
- meeting/call notes → `…/meetings/`

## Trigger
- `/brain-ingest` to pull client threads/events read-only into `00_inbox/`.
- `/brain-review` to file them and log decisions.
- `/brain-decision` for a specific call.

## Boundary
**Private** — `clients/` bodies are gitignored, never committed. Monday holds
operational state; mirror only a decision's id+headline there, never the body.
All connectors read-only; emailing/creating Monday items is approval-gated and logged.
