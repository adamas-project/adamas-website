# _apps/ — the Lego registry

The brain is **modular**. Capabilities plug in as **apps** — self-contained Lego
bricks that read from and write to the vault through one clear contract. ADAMAS is
app #1; client work and your personal knowledge base are apps too. New apps snap in
without changing anything else. That is the whole idea: *a modular system you grow
like Lego.*

## What an app is

An app is **one markdown spec** in this folder (`_apps/<name>.md`, from the
`_system/templates/app.md` template) that declares five things:

1. **Purpose** — the job this brick does.
2. **Inputs** — which vault folders and which connectors (accounts) it reads.
3. **Outputs** — what it writes, and exactly where in the vault.
4. **Trigger** — the skill / slash-command that runs it (or "on request").
5. **Boundary** — read-only vs write; what needs your explicit approval.

If the app has its own data, it also owns a folder under the right PARA section
(e.g. `10_projects/adamas/`). If it has a repeatable action, it gets a
slash-command in `/.claude/commands/`.

## How to add an app (the Lego click)

1. Copy `_system/templates/app.md` → `_apps/<name>.md`, fill the five sections.
2. (If it needs data) create its folder under `10_projects/`, `20_areas/`, etc.
3. (If it has a trigger) add `/.claude/commands/<name>.md`, or run `/brain-new-app`.
4. (If it pulls from an account) add a row to `_system/connectors.md`.

Nothing else in the brain changes. Claude reads this registry to know what apps
exist and how to run them.

## Registered apps

| App | Purpose | Folder | Trigger |
|---|---|---|---|
| [ADAMAS](adamas.md) | Decision-ledger product: capture the *why*, generate assets | `10_projects/adamas/` | `/brain-decision`, `/app` build |
| [Clients](clients.md) | Run client engagements; reasoning in vault, state in Monday | `10_projects/clients/` | `/brain-ingest`, `/brain-review` |
| [Personal](personal.md) | "Myself": a knowledge base about you — learning, goals, health | `10_projects/personal/` | `/brain-capture`, `/brain-review` |
