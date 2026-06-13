# ADAMAS — Operator Handbook (START HERE)

The single front door to delivering ADAMAS. Internal; not served on the public site.

## The two layers (never conflate them)
- **Knowledge layer** — the decision ledger. Local-first, Obsidian + Hermes on a Mac the
  client owns. Holds the *reasoning*. Never leaves the machine.
- **Operational layer** — pipeline, tasks, money. Monday.com. Holds the *state*. Links to
  vaults; never holds a client's actual decision content.

## Build order (do this once, on yourself first)
**Falcon Intelligence Group is Client Zero.** Run the whole chain on FIG before any paying
client. See `04-client-zero.md` for the 2-week plan. Why first: it produces the reference
install, real screenshots, the first case study, and corrected manuals — all at once.

## The delivery chain (per engagement)
| Stage | Doc | What |
|-------|-----|------|
| 0 · Close & paperwork | `README.md` | order confirmation, invoice, DPA, kickoff, hardware order |
| 1 · Clarity Audit | `01-clarity-audit-runbook.md` | interviews + written Clarity Report |
| 2 · Install | `02-installation-manual.md` | vault machine standup (idiot-proof, both US-remote/DE-onsite) |
| 3 · Build | `03-build-and-handover-runbook.md` | seed ledger, connect sources, generate first assets |
| 4 · Handover | `03-…` §Handover | Handover Pack + training |
| 5 · Aftercare | `03-…` §Aftercare | 30 days; then case study |

## The system files (`/build`)
| File | Purpose |
|------|---------|
| `bootstrap-vault.sh` | one command: scaffold the local vault (Decision Ledger Standard) |
| `monday-ops-blueprint.md` | the AS-BUILT Monday structure (boards, columns, groups) |
| `setup-monday-v2.sh` | build the Monday structure (additive, idempotent) |
| `audit-monday.sh` | read-only: list workspaces/boards before any deletion |
| `cleanup-monday.sh` | delete only empty leftover groups (dry-run by default) |
| `integrations-map.md` | website forms + Google-calendar bookings → Monday pipeline (Zapier) |
| `README.md` | layer model + relocate-to-own-repo note |

## Current state (FIG / Client Zero)
- [x] Vault bootstrapped on the host Mac (`~/Vault`, seeded `OPS-001`).
- [x] Monday Sales Pipeline columns + Client-0 board (columns/groups/most tasks).
- [x] Website lead capture tagged `Source = Website Form`; booking clicks attributed.
- [ ] Re-run `setup-monday-v2.sh` → finish last tasks + create Decision Log.
- [ ] `cleanup-monday.sh --apply` → remove empty leftover groups.
- [ ] Zapier: map Source on the form zap; build the calendar→Monday (Direct Booking) zap.
- [ ] Plausible: add the `Book 30-min Call` goal.
- [ ] Engine: install Ollama + model (`02 §3`) and open the vault in Obsidian.
- [ ] **`[HERMES]`** — install/configure Hermes (only the founder can; fill the `[HERMES]`
      slots in `02-installation-manual.md` once done).
- [ ] Rotate the Monday API token (was exposed in chat during setup).

## Hard rules
1. Nothing leaves the client's machine. Hybrid cloud route stays off unless they enable it.
2. The ledger is the deliverable; the AI is the engine. Open formats (Markdown + JSON) outlive it.
3. Every claim measured — capture before/after metrics during the engagement (= the case study).
4. Never fabricate proof. Case studies publish only with written client approval.
