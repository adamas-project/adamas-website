#!/usr/bin/env bash
# ADAMAS × Monday — READ-ONLY audit. Creates/changes/deletes NOTHING.
# Lists your workspaces and every active board (workspace, kind, groups, columns)
# so we can decide together what's obsolete before deleting anything by hand.
#
# Usage:
#   export MONDAY_TOKEN='your-token'
#   bash audit-monday.sh
set -uo pipefail
: "${MONDAY_TOKEN:?-> export MONDAY_TOKEN='your_token' first}"
API="https://api.monday.com/v2"
command -v jq >/dev/null 2>&1 || { echo "==> installing jq"; brew install jq; }

gql() { curl -s "$API" -H "Authorization: $MONDAY_TOKEN" -H "Content-Type: application/json" \
             -H "API-Version: 2024-10" -d "$(jq -nc --arg q "$1" '{query:$q}')"; }

echo "=================== WORKSPACES ==================="
gql 'query { workspaces (limit: 100) { id name kind } }' \
  | jq -r '.data.workspaces[]? | "  [\(.id)] \(.name)  (\(.kind))"' 2>/dev/null \
  || echo "  (could not read workspaces)"

echo ""
echo "=================== BOARDS (active) ==================="
BOARDS=$(gql 'query { boards (limit: 500, state: active) { id name state board_kind workspace_id groups { title } columns { title type } } }')
if ! echo "$BOARDS" | jq -e '.data.boards' >/dev/null 2>&1; then
  echo "  Could not read boards. Raw:"; echo "$BOARDS" | jq '.'; exit 1
fi
echo "$BOARDS" | jq -r '
  .data.boards[]
  | "──────────────────────────────────────────────",
    "BOARD  [\(.id)]  \(.name)",
    "       workspace=\(.workspace_id // "main")  kind=\(.board_kind)",
    "       groups (\(.groups|length)): " + ([.groups[].title] | join(" · ")),
    "       columns (\(.columns|length)): " + ([.columns[].title] | join(" · "))
'

echo ""
echo "=================== DASHBOARDS ==================="
# Dashboards are separate objects from boards in Monday's API.
gql 'query { docs (limit: 1) { id } }' >/dev/null 2>&1
echo "  (Dashboards aren't returned by the boards API; check them in the UI —"
echo "   e.g. 'Dashboard and reporting'. Nothing here touches them.)"

cat <<'EOF'

===============================================================
This was READ-ONLY. Nothing was created, changed, or deleted.

NEXT: paste this whole output back. Then tell me, per board, what's
obsolete (whole boards to bin, or specific groups/columns). I'll give
you either:
  - exact UI click-steps (deletes go to Recycle Bin = reversible), or
  - a surgical delete script that names ONLY the items you confirmed.

We will NOT touch 1_Sales_Pipeline's live data or its Zapier intake
unless you explicitly say so.
===============================================================
EOF
