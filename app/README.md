# ADAMAS — All Decisions And Memory Archive System

A **local-first decision ledger**. ADAMAS captures the *why* behind business
decisions, structures them into linked, traceable entries, and generates
business assets assembled **only** from those decisions. The vault, ledger, AI
evaluation (Hermes), and generated assets all run on hardware the client owns.

> This is the ADAMAS **application**. The marketing site lives in the repository
> root; the app is self-contained under `app/`.

## What it is (and isn't)

ADAMAS is a decision ledger and asset generator. It is **not** a note app, CRM,
project tracker, or generic chatbot.

## The five principles (enforced at the data layer)

1. **Decisions are never deleted** — a reversed/superseded decision stays, with
   its status and a link to its successor.
2. **Owner is a role, not a name** — role required, name optional.
3. **Dissent is recorded** — never erased.
4. **Links are bi-directional** — writing `A → B` atomically writes `B → A`.
5. **Sources are traceable** — every entry references where the decision happened.

Storage is **open and portable**: human-readable Markdown + a JSON index,
exportable at any time with no vendor lock-in.

## Architecture (five stages)

`Sources → Ingestion (read-only) → Evaluation (Hermes / local LLM) → Decision
Ledger (Markdown + JSON) → Asset Generation`

A **hard data boundary** is the default: nothing leaves the machine. An optional
**hybrid-cloud route is opt-in per task** — it shows exactly what would be sent,
requires explicit approval, runs locally if declined, returns results to the
local vault, and logs the route taken into the ledger.

## Run it

```bash
cd app
npm install
npm run seed          # writes a 14-decision sample vault to ./vault
npm run build         # compiles server + builds the web client
npm start             # serves API + UI on http://localhost:8787
```

### Develop

```bash
npm run dev           # API with reload on :8787
npm run dev:web       # Vite client on :5173 (proxies /api to :8787)
```

### Test / lint / typecheck

```bash
npm run lint
npm run typecheck
npm test
npm run ci            # lint + typecheck + tests (the stage gate)
```

## Deploy (containerized)

```bash
docker compose up --build
# ADAMAS on http://localhost:8787  (default login: see docker-compose.yml)
```

The container is self-contained and exposes **no inbound ports beyond the single
app port you map**; the vault is a mounted volume on the host. See
`DECISIONS.md` for the engineering decisions behind the build (recorded in the
ADAMAS schema format).

## Application surfaces

- **The Ledger** — list/detail/filter of decisions; context, decision, owner,
  trade-offs, links, sources, status.
- **Capture Inbox** — candidate decisions surfaced by Hermes; confirm or dismiss.
  Nothing enters the ledger unreviewed.
- **Decision Graph** — bi-directional links between decisions.
- **Asset Generation** — pick an asset, see source decisions, generate, view
  SRC-traced output, see stale/regeneration status.
- **Boundary / Hybrid Approval** — the per-task opt-in flow.

## Data ownership

Local-first by default. Ledger, source material, generated assets, indexes, and
AI working memory never leave the machine. No tracking, no external telemetry.
Full offline operation. Complete export (Markdown + JSON) at any time, plus
encrypted local backup/restore.
