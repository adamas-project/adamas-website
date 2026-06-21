---
type: decision
id: ADA-000            # 3-letter domain prefix + sequence, e.g. ADA-007, LRN-003
domain: product        # hiring|sales|product|finance|ops  (+ personal: learning|health|money|relationships)
project:               # e.g. adamas | clients/<name> | personal
date: 2026-01-01       # when the decision was MADE, not recorded
status: active         # active | superseded | reversed
superseded_by:         # id of successor, if status is superseded/reversed
tags: [decision]
---

# {{id}} — [one line stating the decision, phrased as the choice made]

- **Owner:** [role] · *(role, not just a name — accountability survives staff changes)*
- **Dissent:** [roles who disagreed, if any] · *(recording this is a feature)*
- **Sources:** [where it happened] · e.g. `email:2026-01-01#thread-114`, `meeting:…`, `pr:…`

## Context
*(The situation at the time: constraints, pressures, what was and wasn't known.
Write it so a reader five years from now understands why this was hard. 2–5 sentences.)*

## Decision
*(The exact choice — precise enough to be falsifiable. 1–2 sentences.)*

## Trade-offs accepted
*(What was knowingly given up or risked. The most valuable section.)*
-
-

## Linked decisions
*(Bi-directional: when you link a decision here, add the reverse link there too.)*
- [[ABC-000_…]] —
