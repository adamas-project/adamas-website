---
type: app
app: personal
status: active
owner: massimo
tags: [app]
---

# Personal — app #3 ("myself")

> A knowledge base about **you**: education, goals, journal, health, money, network.
> The "extra branch for my private projects" — your own Jarvis-for-self.

## Purpose
Treat yourself as a project worth documenting. Capture what you learn, the goals
you set and revise, the decisions you make about your own life — with the same
"never deleted, always linked, reasoning preserved" discipline as the business side.

## Inputs
- folders: `10_projects/personal/`, `00_inbox/` (personal captures), `20_areas/`
- connectors: Google Calendar (life events), Gmail (personal threads),
  Google Drive (personal docs), Zapier (e.g. learning apps, fitness) — all read-only

## Outputs
- areas of life → `10_projects/personal/{education,goals,journal,health}/`
- personal decisions → `…/decisions/<ID>_*.md` (domains `LRN|HLT|MNY|REL`)
- daily notes → `10_projects/personal/journal/YYYY-MM-DD.md`

## Trigger
- `/brain-capture` for thoughts/notes.
- `/brain-review` weekly to file + reflect.
- `/brain-decision` for life decisions worth remembering.

## Boundary
**Most private app** — entire folder is gitignored, never committed, never sent to
any external service without your explicit say-so. Pure local memory.
