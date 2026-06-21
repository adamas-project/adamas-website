---
type: app
app: adamas
status: active
owner: founder
tags: [app]
---

# ADAMAS — app #1

> Local-first **decision ledger**: capture the *why* behind decisions, link them,
> and generate business assets assembled only from those decisions.

ADAMAS is the flagship Lego brick and the method the whole brain borrows. The full
application lives at repo root in [`/app`](../../app/README.md); the delivery
playbook in [`/delivery`](../../delivery/README.md); the published method in
`/guides` and `/standard.html`. This spec is how ADAMAS plugs into *your* brain.

## Purpose
Turn the reasoning behind ADAMAS-the-business (pricing, product, client selection,
the local-first bet) into a permanent, linked ledger — and run the same loop for
every client. Dogfood the product on yourself first (see `/delivery/04-client-zero.md`).

## Inputs
- folders: `10_projects/adamas/`, `00_inbox/` (ADAMAS-tagged captures)
- repo: `/app/DECISIONS.md` (already dogfoods the schema), `/delivery/*`
- connectors: GitHub (PRs/commits → product decisions), Netlify (deploys)

## Outputs
- ledger entries → `10_projects/adamas/decisions/<ID>_*.md` (e.g. `ADA-007_*`)
- project status → `10_projects/adamas/index.md`
- generated assets → `10_projects/adamas/assets/`

## Trigger
- `/brain-decision` to log a decision in the standard.
- The actual app (`cd app && npm start`) for the full ledger UI + asset generation.

## Boundary
Vault is read/write by you and Claude. GitHub/Netlify are **read-only** here;
shipping code or deploys are separate, explicitly-approved actions logged as
decisions. Domain prefix: `ADA-` (product), or the standard `hiring|sales|product|
finance|ops` for the business behind it.
