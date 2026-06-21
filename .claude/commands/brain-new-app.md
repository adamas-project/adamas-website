---
description: Add a new modular app (Lego brick) to the brain
argument-hint: [app name + one-line purpose]
---

Read `brain/_apps/README.md` (the app contract) first.

Add a new app to the brain's Lego registry:

$ARGUMENTS

Steps:
1. Create `brain/_apps/<name>.md` from `brain/_system/templates/app.md`. Fill all five
   sections: Purpose, Inputs (folders + connectors), Outputs (exact destinations),
   Trigger, Boundary (read-only vs write + what needs approval).
2. If the app owns data, create its folder under the right PARA section
   (`10_projects/`, `20_areas/`, etc.) with an `index.md`.
3. If it pulls from an account, add a row to `brain/_system/connectors.md`.
4. If it needs a repeatable trigger, create `/.claude/commands/<name>.md`.
5. Add the app to the "Registered apps" table in `brain/_apps/README.md`.
6. Reply with what you created. Nothing else in the brain should need to change —
   that's the Lego promise.
