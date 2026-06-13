# /build — ADAMAS product scaffold (internal)

The actual ADAMAS system artifacts, as opposed to the marketing website around them.
Blocked from the public site via `_redirects` (same as `/delivery`).

> **Relocate later:** ideally this becomes its own private repo (`adamas-core`).
> It lives here for now only because this session's repo scope is the website.
> When you spin up the real repo, `git mv build/* ../adamas-core/` and delete here.

## Contents
- `bootstrap-vault.sh` — one command, run on the Mac, scaffolds the local vault
  per the Decision Ledger Standard (supersedes the manual mkdir in delivery/02 §4).
- `monday-ops-blueprint.md` — the exact Monday workspace/board structure for the
  operational layer; read before approving the Monday calls.

## The two layers (don't conflate them)
- **Knowledge layer** — the decision ledger. Local-first, Obsidian + Hermes on the
  Mac. Holds the *reasoning*. Never leaves the machine.
- **Operational layer** — delivery pipeline + CRM. Monday.com. Holds the *state*
  (who's in what stage, money, dates, tasks). Links to vault folders; never holds
  client decision content.

## Build order (Client Zero)
1. `bash build/bootstrap-vault.sh` on the Mac → vault exists, seeded with OPS-001.
2. Engine install per `delivery/02 §3` (Ollama + Obsidian; `[HERMES]` = your step).
3. Approve the Monday calls → I create the ADAMAS Delivery workspace + boards from
   `monday-ops-blueprint.md`, with FIG as the first Engagements item.
4. Run the FIG audit + seed your 20 decisions (`delivery/01`, `delivery/03`).
