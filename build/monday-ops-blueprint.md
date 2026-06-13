# ADAMAS × Monday.com — Operational Blueprint

> The exact structure I will create in your Monday account once you approve the
> calls. Read this first; nothing is created until you say go. Principle: **Monday
> holds operational STATE (pipeline, tasks, money, dates); Obsidian holds the
> REASONING (the decision ledger).** They link, they don't overlap.
>
> Integration rule: I create a **new dedicated workspace** ("ADAMAS Delivery") so
> nothing touches your existing CRM/boards. Your current workspaces stay exactly
> as they are; ADAMAS lives beside them.

## What I read before building (read-only, your approval per call)
1. `get_user_context` — who you are, plan tier, your most-used boards.
2. `list_workspaces` — so the new workspace doesn't collide with an existing name.
3. `get_board_info` on any existing CRM board you point me to — so the Engagements
   board mirrors your column conventions (status labels, owner field) instead of
   inventing new ones.

## Workspace: "ADAMAS Delivery" (open kind)

### Board 1 — Engagements (the delivery pipeline / CRM)
One item per client. Groups = the 6-stage process chain, so an item physically
moves down the board as the engagement progresses:

| Group (stage)        | Meaning                                  |
|----------------------|------------------------------------------|
| Lead                 | Interested, not yet closed               |
| 1 · Clarity Audit    | Audit paid, interviews + report          |
| 2 · Install          | Hardware + vault standup                 |
| 3 · Build            | Ledger seeding + sources + assets        |
| 4 · Handover         | Handover pack + training                 |
| 5 · Aftercare (30d)  | Included support window                  |
| Won / Closed         | Live + case study, or lost (with reason) |

Columns:
- **Stage status** (status) — same labels as the groups, for board-wide views.
- **Geography** (status: `US — remote`, `DACH — on-site`) — drives delivery mode.
- **Owner** (people) — you, for now.
- **Audit invoice** (status: Not sent / Sent / Paid).
- **Build invoice** (status: Not sent / Sent / Paid).
- **Hardware** (status: Not ordered / Ordered / Arrived / Installed).
- **Hybrid route** (status: Off / Client-enabled) — the security flag.
- **Next action** (text) + **Next action due** (date).
- **Vault link** (link) — to the engagement's vault folder / handover doc. THIS is
  the bridge to the Obsidian knowledge layer.
- **Audit report** (file) + **Handover pack** (file).
- **Revenue** (numbers) — booked value, for a simple pipeline total.

### Board 2 — Delivery Tasks (the runbook, made executable)
Linked to Engagements (board-relation). Each engagement gets the standard task
set, seeded from the runbook checklists so nothing is improvised. Groups by stage;
each task an item with: **Done** (status), **Owner**, **Due**, **Runbook ref**
(text → e.g. `delivery/02 §3`). The seed task list (the "idiot-proof" spine):

- Stage 0: Order confirmation sent · Audit invoiced · DPA signed · Kickoff booked · Hardware list sent
- Stage 1: Founder interview · Key-person interviews · Synthesis run · Clarity Report delivered · 20-decision list approved
- Stage 2: Hardware arrived · macOS hardened (FileVault/firewall) · Engine installed · Vault bootstrapped · Backup verified
- Stage 3: 20 decisions seeded · Weekly review live · First asset generated · Build QA passed · Baseline metric captured
- Stage 4: Handover pack assembled · Training session done · Remote access disabled · Closing email sent
- Stage 5: Wk1–4 check-ins · Case study drafted + approved · Retainer offered

### Board 3 — (optional) Decisions Mirror
NOT the ledger — the ledger stays in Obsidian. Optional lightweight board to track
only FIG's own top-level company decisions for at-a-glance ops review, mirroring
entry IDs (OPS-001 …) with a link back to the vault file. Skip unless you want the
company-decisions view inside Monday. Recommend: skip for now, revisit after Client Zero.

## Dashboard
A "Delivery" dashboard over Board 1: pipeline by stage, revenue total, overdue
next-actions. Created last, once the boards exist.

## What I will NOT do
- Touch, rename, or restructure any existing workspace or board.
- Create automations that email clients without your sign-off.
- Put any client's actual decision content in Monday — that's vault-only.
