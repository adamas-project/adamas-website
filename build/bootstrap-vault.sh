#!/usr/bin/env bash
# ADAMAS vault bootstrap — run ONCE on the host Mac (the vault machine).
# Idempotent: safe to re-run. Supersedes the manual mkdir steps in delivery/02 §4.
#
# What it does: creates the local-first decision-ledger vault per the Decision
# Ledger Standard, pulls the schema + entry template, drops in a starter system
# note, and (optionally) creates the first ledger entry so the vault is never
# empty. It does NOT install Ollama/Obsidian/Hermes — see delivery/02 §3 for
# the engine install; this only scaffolds the vault those tools open.
#
# Usage:
#   bash bootstrap-vault.sh                # creates ~/Vault
#   VAULT="$HOME/ADAMAS" bash bootstrap-vault.sh   # custom location
set -euo pipefail

VAULT="${VAULT:-$HOME/Vault}"
BASE_URL="https://adamas-project.com/downloads"

echo "==> ADAMAS vault at: $VAULT"
mkdir -p "$VAULT"/ledger/{hiring,sales,product,finance,ops}
mkdir -p "$VAULT"/{inbox,assets,sources,_system}

echo "==> Fetching the Decision Ledger Standard (schema + template)"
curl -fsSL "$BASE_URL/decision-ledger-standard.schema.json" \
  -o "$VAULT/_system/decision-ledger-standard.schema.json" \
  || echo "   (offline — copy the schema in manually later)"
curl -fsSL "$BASE_URL/decision-ledger-entry-template.md" \
  -o "$VAULT/_system/entry-template.md" \
  || echo "   (offline — copy the template in manually later)"

# README that explains the folder meaning to any human who opens the vault.
cat > "$VAULT/_system/README.md" <<'EOF'
# ADAMAS Vault

This is a local-first decision ledger (Decision Ledger Standard v1.0).
Nothing here is transmitted anywhere. Open this folder as a vault in Obsidian.

## Folders
- `inbox/`            raw material to process (transcripts, exports, notes)
- `ledger/<domain>/`  one file per CONFIRMED decision — `SAL-021_short-title.md`
- `assets/`           documents GENERATED from the ledger (onboarding, etc.)
- `sources/`          raw material archived after it's been processed
- `_system/`          schema, entry template, this README

## The weekly habit (30 min, Fridays)
1. Drop the week's notes/transcripts into `inbox/`.
2. Run the extraction prompt (delivery/03 §3.2) over each inbox item.
3. Confirm/dismiss candidates; confirmed ones become `ledger/<domain>/` entries.
4. Move processed raw files to `sources/`.

## The six fields (every entry)
Context · Decision · Owner · Trade-offs · Links (bi-directional) · Domain.
EOF

# Seed the first decision FROM this engagement, so the system is never empty
# and the founder sees the method applied to their own first decision.
SEED="$VAULT/ledger/ops/OPS-001_adopt-the-decision-ledger.md"
if [ ! -f "$SEED" ]; then
  echo "==> Writing seed entry: OPS-001"
  cat > "$SEED" <<EOF
## OPS-001 — Adopt ADAMAS as Falcon Intelligence Group's decision ledger

- **Domain:** ops
- **Date:** $(date +%F)
- **Owner:** founder
- **Status:** active

### Context
FIG sells ADAMAS but had not yet run it internally. The single largest
key-person risk in the company is the founder: the reasoning behind pricing,
client selection, and the local-first bet lives in one head. Selling a decision
ledger without running one is a credibility gap.

### Decision
Run ADAMAS on FIG first (Client Zero) before any paying client, capturing the
company's own defining decisions in this vault.

### Trade-offs accepted
- ~2 weeks of founder time before external delivery starts.
- Forces honesty about FIG's own knowledge traps.
- Delays first paid build slightly in exchange for a real reference install,
  real screenshots, and the first honest case study.

### Linked decisions
- (link future pricing / client-selection / engine decisions here)

### Sources
- meeting:$(date +%F)#client-zero-kickoff
EOF
fi

echo ""
echo "==> Done. Next:"
echo "    1. Open Obsidian -> 'Open folder as vault' -> $VAULT"
echo "    2. Settings: disable all sync/publish (local only)."
echo "    3. Read $VAULT/_system/README.md, then run your first Friday review."
echo "    4. Engine install (Ollama/Obsidian/Hermes): see delivery/02 section 3."
