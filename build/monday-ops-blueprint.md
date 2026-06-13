# ADAMAS × Monday.com — Operational Structure (AS BUILT)

> This reflects what was actually implemented. The earlier plan (a brand-new
> "ADAMAS Delivery" workspace with Engagements/Tasks boards) was **superseded** —
> we integrated with your existing live boards instead, which is better: nothing
> got duplicated and the live lead intake stayed put. The old `setup-monday.sh`
> (v1, new-workspace) is kept only for reference; **`setup-monday-v2.sh` is canonical.**

Principle unchanged: **Monday holds operational STATE; Obsidian holds the REASONING.**
Monday = pipeline, tasks, money, dates, decision *index*. Obsidian vault = the decision
ledger itself (full context/trade-offs), local-first on the host Mac.

## The boards (existing + added)

### `1_Sales_Pipeline` — pipeline / CRM (EXISTING, live Netlify→Zapier intake)
Strictly **added columns** (never renamed/deleted, so the zap kept working):
Client Number, Client Name, Company*, Source* (Website Form / Direct Booking / Referral /
Outbound), Contract Value, Clarity Audit Date, Client Board (link), Notes.
(*Company and Source pre-existed.) Lead capture + field mapping → `integrations-map.md`.

### `ADAMAS — Client-0 Installation` — per-client delivery board (EXISTING, restructured)
Added 8 columns (Client Number, Phase, Start Date, Contract Value, Sales Pipeline Link,
Support Status, Video Course Access, Next Review Date) and 5 workflow groups, each seeded
with task items:
1. **Pre-Onboarding (Discovery & Clarity Audit)** — discovery call, clarity audit, decision, contract
2. **Environment & Access Setup** — provision env, install tools, verify ports/access
3. **ADAMAS Build & Installation** — clone, deps, configure, migrations, start services, verify UI, e2e test
4. **System Handoff** — credentials/configs, runbook, knowledge transfer
5. **Training + Support** — video course, training, support window, feedback

This board is the **template**: duplicate it per new client. Its phases map 1:1 to the
delivery process chain in `/delivery` (Stages 1–5).

### `Decision Log` — company decision index (ADDED)
11 columns matching the Decision Ledger Standard: Decision ID, Date, Domain (Hiring/Sales/
Product/Finance/Ops), Title, Context, Decision, Owner, Trade-offs, Links, Sources, Status
(Active/Superseded/Reversed). This is an **index/mirror** of the Obsidian ledger for
at-a-glance ops review — the vault stays the source of truth. Don't dual-author: write
decisions in the vault (full reasoning), mirror the headline + ID here when useful.

### `Dashboard and reporting` — master dashboard (EXISTING)
Widgets are UI-only (Monday's API can't create them). Configure: Leads by Stage,
Revenue Forecast (sum Contract Value), Active Installations, Support Load, Recent Leads.

## The scripts (`build/`)
- `setup-monday-v2.sh` — additive + idempotent build of the above (auto-retries on rate limit).
- `audit-monday.sh` — read-only enumeration of workspaces/boards (run before deleting anything).
- `cleanup-monday.sh` — deletes only empty leftover groups on the ADAMAS boards; dry-run by default.
- `integrations-map.md` — website forms + calendar → pipeline field mapping and Zapier zaps.

## What the API can't do (manual, in the Monday UI)
Dashboard widgets · automation recipes (e.g. Closed-Won → notify) · renaming/merging groups.
