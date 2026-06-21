---
description: Weekly review — empty the inbox, file everything, log decisions
---

Read `brain/CLAUDE.md` (esp. §1 filing rule and §4 loop) first.

Run a review pass over the second brain:

1. **Empty `brain/00_inbox/`.** For each item, move it to exactly ONE home:
   - goal with an end state → `10_projects/<project>/`
   - ongoing responsibility → `20_areas/<area>/`
   - reusable reference → `30_resources/<topic>/`
   - finished/inactive → `40_archive/`
   Add `[[wikilinks]]` to related notes as you file. Be idempotent — don't duplicate.
2. **Log decisions.** Any inbox item flagged as a decision → run the `/brain-decision`
   process and link it from its project `index.md`.
3. **Update active projects.** For each `10_projects/*/index.md` that's active, refresh
   **Status** and **Next action**.
4. **Archive** anything done.
5. Reply with a short summary: what moved where, decisions logged, projects updated.
   Respect privacy: never commit `personal/`, `clients/` bodies, `00_inbox/`, `40_archive/`.
