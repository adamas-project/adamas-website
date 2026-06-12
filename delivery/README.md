# ADAMAS Delivery Playbook — Process Chain

> **Internal.** This folder is the operating manual for delivering an ADAMAS engagement,
> written so it can be executed step by step without improvisation ("idiot-proof").
> Files in /delivery and /marketing are blocked from the public site via `_redirects`.
>
> Strategy note — build order: **Falcon Intelligence Group is Client #0.** Deliver the
> entire chain below to yourself first (see `04-client-zero.md`). Every document in this
> folder gets corrected against reality during that run before a paying client sees it.

---

## The chain at a glance

| Stage | Name              | Duration   | You deliver                                   | Doc |
|-------|-------------------|------------|-----------------------------------------------|-----|
| 0     | Close & paperwork | 1–2 days   | Order confirmation, invoice, DPA, kickoff date | below |
| 1     | Clarity Audit     | ~2 weeks   | Interviews + written Clarity Report            | `01-clarity-audit-runbook.md` |
| 2     | Hardware & install| 2–4 days   | Running vault machine (remote US / on-site DE) | `02-installation-manual.md` |
| 3     | Build             | 1–3 weeks  | Seeded ledger, connected sources, first assets | `03-build-and-handover-runbook.md` |
| 4     | Handover          | half day   | Handover Pack + training session               | `03-…` §Handover |
| 5     | Aftercare         | 30 days    | Fixes included; weekly check-in                | `03-…` §Aftercare |
| 6     | Proof             | after 5    | Case study draft for client approval           | site: /case-studies/ |

Rule of thumb: a full engagement is **4–6 calendar weeks** from signature to handover.
Never run more builds in parallel than you have proven you can deliver (start: one).

---

## Stage 0 — Close & paperwork (the professional-firm minimum)

A client judges the firm by the first 48 hours after saying yes. Checklist:

- [ ] **Order confirmation email** same day: scope (Audit $1,000 credited + Build $4,000),
      timeline with the 6 stages above, what you need from them at each stage, next step.
- [ ] **Invoice for the Clarity Audit** ($1,000) — work starts when it's paid. (TODO founder:
      decide invoicing tool + payment rails for US/DE; Stripe invoice or bank transfer.)
- [ ] **DPA signed** if any client material will touch your machines during the build —
      use the published template (adamas-project.com/dpa.html), adapted per client.
- [ ] **Kickoff call booked** (30 min) within 5 business days.
- [ ] **Engagement folder created** (one folder per client, your side):
      `clients/<name>/{00-contract, 01-audit, 02-install, 03-build, 04-handover}`.
- [ ] **Hardware ordered by the client** — send the exact order list from
      `02-installation-manual.md` §1 in the confirmation email, so the machine arrives
      before Stage 2. The client buys and owns it; never buy hardware for a client.

**Delivery mode by geography (decide at Stage 0):**
- **DE/DACH client → on-site.** You drive there for Stage 2 (install day) and Stage 4
  (handover). Everything else is remote. Two trips total.
- **US client → fully remote.** Client unboxes the Mac Mini; you drive the install over a
  screen-share session (§2 of the install manual is written to be read aloud to a
  non-technical person), then complete configuration via Remote Management/Screen Sharing
  enabled for the engagement window only — and visibly disabled at handover (it's a
  security selling point).

---

## Principles (non-negotiable, they ARE the brand)

1. **Nothing leaves the client's machine.** All processing local; the hybrid route stays
   off unless the client explicitly enables it.
2. **The ledger is the deliverable, the AI is the engine.** If the engine changes, the
   Markdown/JSON ledger survives untouched (Decision Ledger Standard v1.0).
3. **Every claim measured.** Capture before/after metrics during the engagement
   (onboarding time, time-to-answer for "why did we…" questions) — that's the case study.
4. **One source of truth per engagement:** the client's own ledger gets its first entries
   from the engagement itself (the audit decisions, the scope decisions). Dogfood inside
   the delivery.

---

## What "deliverable to clients" still requires (build order)

1. **Client Zero run** (`04-client-zero.md`) — do this first, ~2 weeks. Output: working
   reference install + corrected manuals + real screenshots + first case study material.
2. **Engine decision** — pin down the v1 stack in `02-installation-manual.md` §3 (local
   runtime + model). The manual ships with a tested default; the Hermes integration slots
   in where marked `[HERMES]` once its exact install procedure is confirmed. (TODO founder:
   document Hermes install/licence steps — only you know the actual tool.)
3. **Asset prompt library** — the three launch assets (onboarding doc, hiring framework,
   investor one-pager) have tested prompts in `03-build-and-handover-runbook.md`. Add one
   per new asset type as engagements demand them.
4. **Handover Pack template** — assembled once in Client Zero, then reused (§Handover).
