# _system/ — schema, templates, connectors

The machinery the brain runs on. Humans rarely edit this; Claude reads it.

- **`decision-ledger-standard.schema.json`** — the Decision Ledger Standard v1.0,
  mirrored from `/downloads/`. Validates every decision entry. Reused as-is for
  business decisions; `personal/` may extend the domain set (see `brain/CLAUDE.md` §3).
- **`connectors.md`** — the map of which connected account (Gmail, Calendar, Drive,
  Monday, GitHub, Netlify, Zapier) feeds which part of the brain, read-only inbound.
- **`templates/`** — note templates, one per `type`. Use them when creating notes so
  frontmatter stays consistent:
  - `decision.md` — a ledger entry (the reasoning layer)
  - `meeting.md` — a meeting / call note
  - `person.md` — a person in your network
  - `project.md` — a project `index.md`
  - `daily.md` — a daily note
  - `app.md` — a new app spec for `_apps/`

These templates also work with Obsidian's core **Templates** plugin (point it at
this folder) so you can insert them by hand too.
