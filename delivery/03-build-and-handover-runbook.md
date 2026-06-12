# Stage 3–5 — Build, Handover, Aftercare Runbook

## Stage 3 — The Build (1–3 weeks)

### 3.1 Seed the ledger (the core of the $4,000)

Work from the approved **20-decision list** in the Clarity Report.

- [ ] For each decision: 20–30 min with the founder (batch 4–5 per call), filling the
      six fields live (template: `_system/entry-template.md`). The founder talks; you type.
- [ ] Reconstruction prompt (run locally, on raw notes/transcript of that call):

```
You are formatting a business decision record. From the notes below, draft a decision
ledger entry with EXACTLY these sections: Title (the choice made, one line), Domain
(hiring|sales|product|finance|ops), Date (when decided, estimate if needed and mark ~),
Context (the situation at the time, 2-5 sentences), Decision (the exact choice, 1-2
sentences, falsifiable), Owner (role), Dissent (roles that disagreed, if mentioned),
Trade-offs accepted (bullet list - what was knowingly given up or risked), Linked
decisions (titles of other decisions mentioned as related), Sources (where this
happened: meeting/email/etc.). Use ONLY information in the notes; mark gaps as [GAP].
Notes:
[PASTE NOTES]
```

- [ ] Founder reviews and approves every entry — nothing enters the ledger unreviewed.
- [ ] Add bi-directional links (if A links B, edit B to link A) and fill `[GAP]`s or
      delete them consciously.

### 3.2 Connect sources (v1 = file-based, honest and shippable)

- [ ] Set up the **weekly decision review** habit (30 min, Fridays): the client drops
      meeting transcripts/notes into `inbox/` during the week.
- [ ] Extraction prompt for inbox processing (run weekly, locally):

```
You are screening raw workplace material for business decisions. From the text below,
list every passage that records or implies a DECISION (a choice between alternatives
with consequences), as: candidate title - who decided - verbatim quote - confidence
(high/medium/low). Ignore status updates, tasks, and opinions without a choice.
Text:
[PASTE INBOX ITEM]
```

- [ ] Candidates → confirm/dismiss with the client in the weekly review; confirmed ones
      become ledger entries; processed raw files move to `sources/`.
- [ ] `[HERMES]` When the agent is in place, it automates 3.2: scheduled read-only pulls
      (email/chat/CRM exports) into `inbox/` + auto-drafted candidates. The human
      confirm step stays.

### 3.3 Generate the first assets (prove the claim)

- [ ] Generate the **onboarding document** from the ledger (the launch asset):

```
You are generating an onboarding document for a new hire, assembled ONLY from the
decision ledger entries below. Structure: Why this document exists / How we quote work /
How we deliver / Who decides what / Your first 30 days. After each section heading, list
the entry IDs it was built from as "SRC: ...". Plain, direct language; no invented
facts - if the entries don't cover a section, write "Not yet covered by the ledger."
Entries:
[PASTE ALL CONFIRMED ENTRIES]
```

- [ ] Founder reviews; save to `assets/`; repeat for asset #2 and #3 if in scope
      (hiring framework, investor one-pager — same pattern, different structure line).
- [ ] **Measure now:** record baseline + first numbers (e.g., minutes to answer "why did
      we decide X?" before vs. with the ledger). This is the case-study metric.

### 3.4 Build QA checklist (before you may call it done)

- [ ] ≥ 20 approved entries, all schema-valid, all links bi-directional.
- [ ] All six domains represented or consciously excluded.
- [ ] Weekly review held twice with the client driving the second one.
- [ ] One full asset generated, reviewed, and traced (SRC tags resolve).
- [ ] Backup verified by actually restoring one file from Time Machine.
- [ ] Nothing in the vault violates the sensitivity boundaries from the Clarity Report.

## Stage 4 — Handover (half day; on-site for DE, video for US)

**The Handover Pack** (printed for DE clients, PDF for US — this is what makes it feel
like a professional firm):

- [ ] **System Passport** (2 pages): what's installed (versions), folder map, the six
      fields, how the weekly review runs, how assets are generated, what is and isn't
      connected, the hybrid-route status (OFF).
- [ ] **Credentials sheet** (client's copy only): account password, FileVault recovery
      key, backup passphrase.
- [ ] **Runbook card** (1 page, lives next to the machine): weekly review steps,
      "machine died" recovery steps, monthly backup check, support contact + SLA.
- [ ] **Training session** (60–90 min, recorded for them): founder runs a full weekly
      review and generates an asset themselves while you watch.
- [ ] Remote access demonstrably disabled; you retain no credentials, no copies.
- [ ] Closing email: what was delivered, aftercare window dates, invoice settled,
      case-study conversation scheduled for day ~30.

## Stage 5 — Aftercare (30 days included)

- [ ] Week 1, 2, 3, 4: 15-min check-in call each (did the review happen? inbox flowing?).
- [ ] Fix anything broken at no charge; log every fix → it becomes a manual improvement.
- [ ] Day ~30: case-study conversation — collect the metric, draft per the template on
      /case-studies/, get written approval. Offer the $200/mo retainer; take yes or no
      gracefully.
