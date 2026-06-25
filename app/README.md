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

## Hermes & a local Ollama model

Hermes (the evaluation agent) is pluggable behind one interface. By default it
uses a built-in deterministic heuristic that needs no model and runs fully
offline. To back it with a **local [Ollama](https://ollama.com) model** instead
(still on-device — nothing leaves the machine):

```bash
# 1. install + start Ollama, then pull a model
ollama pull llama3.1

# 2. point Hermes at it (env vars, or copy .env.example -> .env)
export ADAMAS_HERMES_PROVIDER=ollama
export ADAMAS_OLLAMA_URL=http://127.0.0.1:11434   # default
export ADAMAS_OLLAMA_MODEL=llama3.1               # any model you've pulled
npm start
```

Verify the active provider:

```bash
curl -s http://localhost:8787/api/meta | grep -o '"hermes":{[^}]*}'
# => "hermes":{"provider":"ollama","location":"local","ollamaUrl":"...","model":"llama3.1"}
```

If Ollama is unreachable or returns unusable output, Hermes logs a warning and
falls back to the built-in heuristic so capture never hard-fails offline. See
`.env.example` for all configuration. In Docker, set `ADAMAS_OLLAMA_URL` to
`http://host.docker.internal:11434` (the compose file already does, and adds the
`host.docker.internal` host mapping).

### Feedback learning loop (smarter over time)

Every decision you **confirm** (with your edits) or **dismiss** is remembered as
an example under `vault/learning/`. On future captures, a strong match to a
confirmed example nudges the extracted decision toward the domain/owner **you**
chose — so ADAMAS improves from your own corrections, on-device, with no training
run. It's deterministic and conservative (only acts on strong matches) and shows
up as a rising `npm run eval` score. On by default; `ADAMAS_LEARNING=0` disables.

### Model router (cheap-first, escalate when unsure)

When Ollama is configured, Hermes routes **cheap-first**: the free deterministic
heuristic handles the easy majority, and the model is called **only** when the
heuristic isn't confident enough (`ADAMAS_ROUTER_MIN_CONFIDENCE`, default `0.75`)
— fewer model calls for the same result. Both tiers are local, so nothing crosses
the boundary. On by default; set `ADAMAS_HERMES_ROUTER=0` to always use the model.
Measure the trade-off with `npm run eval`.

## Read-only connectors (ingestion)

Connectors pull source material onto the machine — **read-only and inbound
only**; they never write to the source system and never send vault content out.
Pulled material flows through Hermes into the Capture Inbox (nothing enters the
ledger unreviewed). Use them in **Capture Inbox → Read-only connectors → Pull**.

- **Local folder** (always on, fully local): reads `.md`/`.txt`/`.eml` from
  `ADAMAS_SOURCES_DIR` (Docker: the host `./sources` folder, mounted read-only).
  Incremental (only new/changed files); a domain subfolder (e.g.
  `finance/budget.md`) sets a domain hint.
- **Email (IMAP, opt-in)**: read-only IMAP — opens the mailbox read-only, never
  marks messages seen, pulls only new mail (incremental by UID). Enable by
  setting `ADAMAS_IMAP_HOST/USER/PASS` (see `.env.example`). For Gmail, use an
  **App Password** (Google Account → Security → 2-Step Verification → App
  passwords), host `imap.gmail.com`. The connector appears automatically once
  configured.
- **Calendar (Google, opt-in)**: read-only iCal feed. In Google Calendar →
  Settings → your calendar → copy the **"Secret address in iCal format"** and set
  `ADAMAS_ICS_URL`. ADAMAS only fetches the feed (no OAuth) and surfaces recent +
  upcoming meetings.

**Auto-pull (opt-in):** set `ADAMAS_CONNECTOR_PULL_MINUTES` to a number of
minutes and ADAMAS pulls every connector on that interval in the background, so
the Capture Inbox fills itself — no clicking. Still read-only and inbound only.
`0` (default) keeps pulls manual. There's also `POST /api/connectors/pull-all`.

**Autopilot (opt-in):** set `ADAMAS_AUTO_CONFIRM_CONFIDENCE` (e.g. `0.8`) and
ADAMAS auto-files candidates at/above that confidence into the ledger — so with
auto-pull on too, the whole chain (pull → evaluate → file → refresh Obsidian)
runs with **zero clicks**. Decisions stay governed and **reversible** (principle
#1: never deleted, only superseded), so autopilot is safe to leave on; low-
confidence items still wait for review. `0` (default) reviews everything by hand.
You can also click **⚡ Auto-file high-confidence** in the Capture Inbox, or call
`POST /api/inbox/auto-confirm`.

### Capturing meeting outcomes & transcripts

A calendar event tells you a meeting happened; the *decision* usually isn't in the
invite. In **Capture Inbox** you can:
- **Log a meeting outcome** by hand (title, date, attendees, what was decided) when
  there's no recording — Hermes turns it into a candidate decision.
- **Upload or paste a transcript** (`.txt`/`.md`/`.vtt`/`.srt`). ADAMAS
  **summarizes it locally first**, then extracts candidate decisions from the
  summary. Nothing enters the ledger until you confirm.
- **Drop a recording (audio/video)** — transcribed **on-device** (whisper.cpp is
  baked into the image), then summarized and extracted. Works out of the box; the
  engine is pluggable via `ADAMAS_TRANSCRIBE_CMD` (`{input}` = file, `{output}`
  optional) if you'd rather use a different local engine, and the model is set by
  `ADAMAS_WHISPER_MODEL` (default `ggml-base.en`). Nothing leaves the machine.
  Note: the first `docker compose up --build` is heavier (it compiles whisper.cpp
  and downloads ~140MB), and transcription in Docker is CPU-only, so long
  recordings take a while — for speed, transcribe on the host and paste the text.

## Deploy (containerized)

```bash
git clone https://github.com/adamas-project/adamas-website.git
cd adamas-website/app
docker compose up -d --build   # self-contained: installs + builds inside the image
# ADAMAS on http://localhost:8787
```

The image is self-contained (it runs `npm ci` internally), so a fresh clone runs
with no host-side setup. `-d` runs it detached (no attached terminal). The
compose file mounts the vault as a host volume and enables optional HTTP basic
auth. `ADAMAS_SEED` defaults to `0` (empty vault); set it to `1` in
`docker-compose.yml` to seed the 14-decision sample on first boot.

### Everyday use — no terminal required

ADAMAS is local-first: it runs as a background service on your own machine. After
the one-time `docker compose up -d --build`:

- The container is set to `restart: unless-stopped`, and Docker Desktop →
  **Settings → General → "Start Docker Desktop when you sign in"** makes ADAMAS
  **auto-start on every boot**. Just open **http://localhost:8787** (bookmark it).
- Start/Stop from the Docker Desktop GUI — no commands.
- Or use the double-click launchers in `app/`: **`start.command`** (starts ADAMAS
  and opens the browser) and **`stop.command`** (stops it; data preserved).
- **`reset-vault.sh`** wipes the vault back to empty (asks you to type `DELETE`).
- **Native macOS app:** double-click `app/desktop/make-app.command` once to build
  **`ADAMAS.app`** (with the ADAMAS logo icon) on your Desktop — then launch ADAMAS
  from the Dock/Launchpad like any app. See `app/desktop/README.md`.

The terminal is a one-time setup step, not a daily necessity.

**Default staging credentials** (override via env in `docker-compose.yml`):

| URL | User | Password |
|-----|------|----------|
| http://localhost:8787 | `adamas` | `clarity-audit` |

> Local-first by design: the container exposes **only the single app port you
> map** — no other inbound ports. The vault lives on the host. There is no public
> staging URL because ADAMAS runs on hardware the client owns and is not exposed
> to the internet; "staging" is the same container running on a trusted machine.

### Smoke-test a running instance

```bash
npm run smoke -- http://localhost:8787
# with auth:
ADAMAS_BASIC_USER=adamas ADAMAS_BASIC_PASS=clarity-audit npm run smoke -- http://localhost:8787
```

The smoke suite exercises the full Definition of Done against a live HTTP server
(it also runs automatically in the test suite via `test/e2e.test.ts`).

See `DECISIONS.md` for the engineering decisions behind the build (recorded in
the ADAMAS schema format).

## Knowledge base

A separate ledger for what you *learn* (distinct from decisions) — the **memory
vault** that makes future decisions faster. In the **Knowledge** tab, paste a
link (article, post, video, blog) or raw text; ADAMAS fetches the page and
**synthesizes it locally** (Hermes) into a structured note: a specific title, a
2–3 sentence synthesis (not a verbatim dump), crisp self-contained takeaways,
meaningful topic tags, and a link back to the source. Synthesis is best with a
local Ollama model (see above); without one it falls back to a deterministic
extract. Entries are stored as portable Markdown + JSON under `vault/knowledge/`
and flow into the Obsidian data room. Fetching a URL is an inbound pull of public
content — no vault data is sent out; synthesis is on-device.
X/Twitter posts are fetched via the public syndication endpoint, so the actual
tweet text is captured (not the JS app shell). (No JS rendering otherwise: for
paywalled or video-only pages, paste the text/transcript.)

### Glossary (handbook & onboarding source)

A second sub-section in the **Knowledge** tab: your company's and industry's terms,
defined in your own words (with optional aliases/abbreviations and tags). It's the
single place new joiners and handbooks draw from — stored as portable Markdown +
JSON under `vault/glossary/` and rendered into the Obsidian data room as an
alphabetical `Glossary` note. API: `/api/glossary`.

## Demo data (for showcases)

`POST /api/demo` (or **Onboarding & Pricing → Load demo data**) fills every
section with a coherent sample company (NorthPeak Robotics): 100+ decisions,
knowledge entries, people, and diligence records, plus a glossary — and refreshes
the Obsidian vault. Entry-level idempotent: re-running only adds what's missing.

## People (team / human resources)

The team a buyer underwrites. In the **People** tab add a team member by **name,
role, and type** (founder/employee/advisor/board/contractor) and paste their
**CV** — ADAMAS summarizes it on-device into a bio, highlights, and skills, and
links them to the decisions they own. Flag **key people** so key-person risk is
explicit. People are stored as portable Markdown + JSON under `vault/people/`,
rendered into the Obsidian data room (Company → People, with profiles + decisions
owned), and factored into the **Valuation Readiness** scorecard (a dedicated
*Team & key-person documentation* component).

## Diligence records (customers, financials, risk, IP)

The commercial facts a buyer underwrites, captured in the **Data Room** tab as
records in four categories: **Customers & contracts** (ARR, recurring vs one-off,
renewal dates), **Financial KPIs** (metric/value/period with a source), **Risk
register** (severity, owner, mitigation, status), and **IP & assets** (patents,
trademarks, licenses, domains with expiry). Stored as portable Markdown + JSON
under `vault/records/`, grouped into the Obsidian data room, and scored in
**Valuation Readiness** (a *Diligence records* component rewards breadth across
all four categories). API: `/api/records`.

## Obsidian data room (the "second brain")

ADAMAS is the cockpit; **Obsidian is the memory**. ADAMAS keeps its validated
files as the source of truth and, on demand, generates a clean **Obsidian-native
vault** — YAML frontmatter, `[[wikilinks]]`, MOC indexes — structured as an
**M&A data room** (Decisions by department, a Diligence section with the diligence
binder / founder-continuity dossier / risk register, Knowledge, Company/People,
and a **Valuation Readiness** scorecard). It's written to `ADAMAS_OBSIDIAN_DIR`
(Docker: the host `./obsidian` folder). Open that folder in Obsidian → start at
`00 - Index.md`.

**Auto-sync (default on):** the vault refreshes automatically (debounced)
whenever a decision or knowledge entry changes, so it always mirrors the source
of truth — no need to click anything. The **Data Room** tab still has a
**Generate / refresh** button (and `POST /api/obsidian/export`) to force an
immediate rebuild. Turn auto-sync off with `ADAMAS_OBSIDIAN_AUTO=0`.

Division of roles: the **decision ledger stays governed and append-only** in
ADAMAS (immutable, sourced — the audit trail buyers want); the **Knowledge base
is the living brain**; Obsidian is the fast browse/graph/edit layer over the same
material.

**Write-back (two-way):** the export never touches two folders — Obsidian's own
`.obsidian` settings, and a dedicated `_Inbox/`. Drop or write notes in
`obsidian/_Inbox/` from inside Obsidian and ADAMAS imports each into the
Knowledge base (summarized, tagged), then moves the file to `_Inbox/Imported/`.
It runs automatically (when auto-sync is on) and on demand via **Data Room →
Import from _Inbox** (`POST /api/obsidian/import`). Everything else in the vault
is regenerated, so this inbox is the safe place to add things from Obsidian.

## Application surfaces

- **The Ledger** — list/detail/filter of decisions; context, decision, owner,
  trade-offs, links, sources, status.
- **Capture Inbox** — candidate decisions surfaced by Hermes; confirm or dismiss.
  Nothing enters the ledger unreviewed.
- **Decision Graph** — a force-directed "second brain" graph (2D or 3D) of the
  whole memory: decisions by department and knowledge entries, hung off MOC hubs,
  with decision↔decision bi-links and topic cross-links from knowledge to the
  decisions it relates to — the same structure as the Obsidian vault, in the
  ADAMAS colorway. Drag a node and its neighbors follow.
- **Asset Generation** — pick an asset, see source decisions, generate, view
  SRC-traced output, see stale/regeneration status.
- **Boundary / Hybrid Approval** — the per-task opt-in flow.

## Data ownership

Local-first by default. Ledger, source material, generated assets, indexes, and
AI working memory never leave the machine. No tracking, no external telemetry.
Full offline operation. Complete export (Markdown + JSON) at any time, plus
encrypted local backup/restore.
