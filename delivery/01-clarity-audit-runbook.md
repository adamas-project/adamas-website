# Stage 1 — Clarity Audit Runbook

Goal: in ~2 weeks, map where the client's decision-memory lives (and where it's missing)
and deliver a written **Clarity Report** worth $1,000 on its own.

## 1. Before the kickoff call

- [ ] Audit invoice paid.
- [ ] Client filled the intake (use the website form data: situation, company, role).
- [ ] You've skimmed their website/LinkedIn and written 3 hypotheses about where their
      knowledge traps are. (Hypotheses, not conclusions — the interviews decide.)
- [ ] Interview slots requested: founder (90 min) + 2–3 key people (45 min each).

## 2. Interview guide

**Founder (90 min)** — record with permission; transcripts feed the synthesis prompt.
1. "Walk me through the last decision that cost you real money. Who knew what, when?"
2. "If you were unreachable for two weeks, which decisions would simply stop?"
3. "What does a new hire NOT find written down that they need in month one?"
4. "Pick a big call from 2+ years ago. Can anyone but you explain why it was made?"
5. "Where do decisions actually happen here — meetings, chat, calls, hallway?"
6. "Who is your 'M.'? (the person whose departure would hurt most) What's only in their head?"
7. Tools inventory: email, chat, CRM, project tool, docs, meeting recording habits.
8. Sensitivity map: what must NEVER be in any system, even a local one?

**Key people (45 min each):**
1. "What do you know that nobody else does? How would you hand it over?"
2. "When you need to know why something is the way it is, where do you look / whom do you ask?"
3. "What decision was reversed or re-litigated in the last year because the reasoning was lost?"

## 3. Synthesis (AI-assisted, local)

Run on your own machine over the transcripts. Copy-paste prompt:

```
You are analyzing interview transcripts from a knowledge audit of a founder-led company.
Extract, with verbatim supporting quotes:
1. KNOWLEDGE TRAPS: every instance where critical reasoning lives in exactly one head.
   For each: whose head, what knowledge, what breaks if they're gone, severity 1-5.
2. DECISION VENUES: where decisions actually get made (meeting/chat/call/hallway) and
   which venues leave no record.
3. LOST DECISIONS: decisions mentioned whose rationale is already unrecoverable.
4. SENSITIVITY BOUNDARIES: anything flagged as must-never-be-ingested.
5. QUICK WINS: the 3 lowest-effort, highest-relief captures to do in week one of a build.
Do not invent anything not supported by a quote. Mark uncertain items as UNCERTAIN.
Transcripts follow:
[PASTE TRANSCRIPTS]
```

Review every line of the output against the transcripts before it goes in the report.

## 4. The Clarity Report (the deliverable)

8–12 pages, PDF, client's name on it. Fixed structure:

1. **Executive summary** — the one-paragraph diagnosis + the top 3 risks.
2. **Knowledge-trap map** — table: knowledge area · current holder · transferability
   today (none/partial/full) · severity · cost scenario if lost.
3. **Decision-venue analysis** — where decisions happen vs. where records exist.
4. **The 20 decisions that define the company** — titles only, to be reconstructed in
   the build (this list IS the build's seeding plan).
5. **Sensitivity boundaries** — what the vault will be configured to never touch.
6. **Build plan** — sources to connect (v1: which transcripts/exports), 4-week schedule,
   what the client provides, acceptance criteria.
7. **Recommendation** — proceed / proceed-with-narrower-scope / don't proceed (yes,
   that's a real option; saying "don't" once is worth ten testimonials).

- [ ] Delivered as PDF + 30-min readout call.
- [ ] If they proceed: $1,000 credited on the build invoice. If the audit surfaced
      nothing worth fixing: refund per the website guarantee.

## 5. Exit criteria for Stage 1

- [ ] Report delivered and walked through.
- [ ] Build invoice sent ($4,000 − $1,000 credit).
- [ ] Hardware confirmed ordered/arrived (see Stage 2).
- [ ] The 20-decision list approved by the founder — this is the seeding contract.
