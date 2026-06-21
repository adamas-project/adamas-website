---
description: Log a decision to the ledger in the Decision Ledger Standard
argument-hint: [what was decided + any context]
---

Read `brain/CLAUDE.md` §3 and `brain/_system/decision-ledger-standard.schema.json` first.

Log this decision into the brain's ledger:

$ARGUMENTS

Steps:
1. Decide the **project** (`adamas` | `clients/<name>` | `personal`) and **domain**
   (`hiring|sales|product|finance|ops`, or personal `learning|health|money|relationships`).
2. Allocate the next id for that domain prefix (e.g. `ADA-008`, `LRN-004`) by checking
   existing files in the project's `decisions/` folder.
3. Create `brain/10_projects/<project>/decisions/<ID>_<slug>.md` from
   `brain/_system/templates/decision.md`. Fill: context, decision (falsifiable),
   owner (role), dissent if any, trade-offs (the most important field), sources.
4. **Bi-directional links:** if you link other decisions, add the reverse link in each
   target. Never delete a superseded decision — set `status` and `superseded_by`.
5. Validate the shape against the schema. Reply with the id, title, and path.
6. If this is a business decision worth surfacing operationally, offer to mirror just
   its id+headline to Monday's Decision Log — do not copy the body.
