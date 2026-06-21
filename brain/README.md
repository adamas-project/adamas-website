# brain/ — your second brain (Obsidian + Claude)

This folder is a **personal second brain**: Obsidian is the memory, Claude is the
operator. Open `brain/` as an Obsidian vault; let Claude read and write it on your
behalf. It applies the ADAMAS *decision-ledger* method (capture the reasoning, link
it, never delete it) to your whole working life, organized PARA-style.

## First run

1. **Obsidian** → *Open folder as vault* → select this `brain/` folder.
   In Obsidian Settings, turn **off** all sync/publish — this stays local.
2. Read **`CLAUDE.md`** — that's the operating contract Claude follows here.
3. Skim **`_system/connectors.md`** — which of your accounts feed the brain.
4. Skim **`_apps/README.md`** — how the modular "Lego" apps plug in.

## The folders (PARA + ledger)

| Folder | What goes here |
|---|---|
| `00_inbox/` | Everything new lands here first, unfiled. |
| `10_projects/` | Active, goal-bound work — `adamas/`, `clients/`, `personal/`. |
| `20_areas/` | Ongoing responsibilities (finance, network, …). |
| `30_resources/` | Reference material by topic. |
| `40_archive/` | Done / inactive (nothing is deleted). |
| `_apps/` | The Lego registry — modular skills/apps (ADAMAS is app #1). |
| `_system/` | Schema, note templates, the connectors map. |

## The loop

**Capture** anything to `00_inbox/` → **File** it to one home during a review →
**Recall** it later from the vault. Slash-commands wire these:
`/brain-capture`, `/brain-recall`, `/brain-ingest`, `/brain-decision`,
`/brain-review`, `/brain-new-app` (see `/.claude/commands/`).

## Privacy

Your private notes (`clients/` bodies, `personal/`, `00_inbox/`, `40_archive/`)
are **gitignored** — they never leave your machine. Only the structure, templates,
and app/connector specs are committed. See `.gitignore`.
