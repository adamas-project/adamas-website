#!/usr/bin/env bash
# ADAMAS × Monday — clean up ONLY ADAMAS leftovers (redundant EMPTY groups on the
# boards ADAMAS set up). Safe by construction:
#   - Scope: ONLY the "Client-0 Installation" and "Decision Log" boards.
#   - Deletes ONLY groups with ZERO items. Every ADAMAS group has task items,
#     and any group of yours with content is non-empty -> both are protected.
#   - NEVER touches 1_Sales_Pipeline or anything with data.
#   - DRY RUN by default. Pass --apply to actually delete.
#
# Usage:
#   export MONDAY_TOKEN='your-token'
#   bash cleanup-monday.sh            # shows what WOULD be deleted (no changes)
#   bash cleanup-monday.sh --apply    # actually deletes the listed empty groups
set -uo pipefail
: "${MONDAY_TOKEN:?-> export MONDAY_TOKEN='your_token' first}"
API="https://api.monday.com/v2"
APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1
command -v jq >/dev/null 2>&1 || { echo "==> installing jq"; brew install jq; }

gql() {
  local q="$1" attempt=0 resp wait
  while :; do
    resp=$(curl -s "$API" -H "Authorization: $MONDAY_TOKEN" -H "Content-Type: application/json" \
                -H "API-Version: 2024-10" -d "$(jq -nc --arg q "$q" '{query:$q}')")
    if echo "$resp" | jq -e '.errors[]? | select(.extensions.code=="COMPLEXITY_BUDGET_EXHAUSTED")' >/dev/null 2>&1; then
      attempt=$((attempt+1)); [ "$attempt" -gt 8 ] && { echo "$resp"; return; }
      wait=$(echo "$resp" | jq -r '[.errors[].extensions.retry_in_seconds] | max // 20')
      echo "    … rate limit; waiting $((wait+2))s" >&2; sleep "$((wait+2))"; continue
    fi
    echo "$resp"; return
  done
}

BOARDS=$(gql 'query { boards (limit: 500, state: active) { id name } }')
find_id() { echo "$BOARDS" | jq -r --arg n "$1" '.data.boards[] | select(.name|contains($n)) | .id' | head -1; }
CLIENT0=$(find_id "Client-0 Installation")
DLOG=$(find_id "Decision Log")

if [ "$APPLY" -eq 1 ]; then echo "### APPLY MODE — empty groups WILL be deleted ###"
else echo "### DRY RUN — nothing will be deleted. Re-run with --apply to delete. ###"; fi

clean_board() {  # $1 = board id, $2 = label
  local bid="$1" label="$2"
  [ -z "$bid" ] && { echo "-- $label: not found, skipping"; return; }
  echo ""
  echo "== $label (board $bid)"
  # Build the set of group ids that CONTAIN items (these are protected).
  local nonempty groups
  nonempty=$(gql "query { boards(ids: $bid){ items_page(limit:500){ items { group { id } } } } }" \
             | jq -r '[.data.boards[0].items_page.items[].group.id] | unique | .[]' 2>/dev/null)
  groups=$(gql "query { boards(ids: $bid){ groups { id title } } }")
  echo "$groups" | jq -c '.data.boards[0].groups[]' | while read -r g; do
    local gid gtitle
    gid=$(echo "$g" | jq -r '.id'); gtitle=$(echo "$g" | jq -r '.title')
    if printf '%s\n' "$nonempty" | grep -qxF "$gid"; then
      echo "   keep  (has items): $gtitle"
    else
      if [ "$APPLY" -eq 1 ]; then
        local r; r=$(gql "mutation { delete_group(board_id: $bid, group_id: \"$gid\"){ id } }")
        if echo "$r" | jq -e '.data.delete_group.id' >/dev/null 2>&1; then echo "   DELETED (empty): $gtitle"
        else echo "   ! delete failed: $gtitle -> $(echo "$r" | jq -c '.errors // .')"; fi
      else
        echo "   would delete (empty): $gtitle"
      fi
    fi
  done
}

clean_board "$CLIENT0" "Client-0 Installation"
clean_board "$DLOG"    "Decision Log"

cat <<EOF

-----------------------------------------------------------
Scope was ONLY the two ADAMAS boards, empty groups only.
1_Sales_Pipeline was never touched.
$( [ "$APPLY" -eq 0 ] && echo "This was a DRY RUN. If the 'would delete' list looks right, run:
    bash cleanup-monday.sh --apply" )
Deleted groups go to Monday's Recycle Bin (recoverable) for a period.
-----------------------------------------------------------
EOF
