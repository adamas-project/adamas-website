#!/usr/bin/env bash
# ADAMAS × Monday.com — one-shot operational setup.
# Creates the "ADAMAS Delivery" workspace + Engagements (pipeline/CRM) board +
# Delivery Tasks board, with groups and columns, via the Monday GraphQL API.
# Uses YOUR personal API token — no MCP, no approval prompts.
#
# Your existing workspaces/boards are NOT touched; this only CREATES new ones.
#
# RUN ONCE. Re-running creates duplicates (the API has no upsert). If you need to
# redo it, delete the workspace in Monday first, then re-run.
#
# Prereqs:
#   1) A Monday API token. Get it: Monday -> click your avatar (bottom-left) ->
#      Developers -> "My access tokens" -> copy. (Admins: Administration -> API.)
#   2) jq + python3 (the script installs jq via Homebrew if missing).
#
# Usage:
#   export MONDAY_TOKEN='paste-your-token-here'
#   bash setup-monday.sh
set -euo pipefail

: "${MONDAY_TOKEN:?-> Set your token first:  export MONDAY_TOKEN='your_token'  then re-run}"
API="https://api.monday.com/v2"
command -v jq >/dev/null 2>&1 || { echo "==> installing jq"; brew install jq; }

# mapi <graphql>  -> prints raw JSON response; aborts on GraphQL errors.
mapi() {
  local resp
  resp=$(curl -s "$API" \
    -H "Authorization: $MONDAY_TOKEN" \
    -H "Content-Type: application/json" \
    -H "API-Version: 2024-10" \
    -d "$(jq -nc --arg q "$1" '{query:$q}')")
  if echo "$resp" | jq -e '.errors' >/dev/null 2>&1; then
    echo "!! Monday API error:"; echo "$resp" | jq '.errors'; exit 1
  fi
  echo "$resp"
}

echo "==> 1/6  Creating workspace: ADAMAS Delivery"
WS=$(mapi 'mutation { create_workspace (name: "ADAMAS Delivery", kind: open, description: "ADAMAS delivery operations — pipeline, tasks, engagements. Created by setup-monday.sh.") { id } }' \
      | jq -r '.data.create_workspace.id')
echo "    workspace id = $WS"

echo "==> 2/6  Creating board: Engagements"
ENG=$(mapi "mutation { create_board (board_name: \"Engagements\", board_kind: public, workspace_id: $WS, description: \"One item per client. Groups = the 6-stage process chain.\") { id } }" \
      | jq -r '.data.create_board.id')
echo "    engagements board id = $ENG"

echo "==> 3/6  Adding pipeline groups to Engagements"
# Note: new boards ship with 1-2 default groups; delete them in the UI afterward.
add_group() { mapi "mutation { create_group (board_id: $ENG, group_name: \"$1\") { id } }" >/dev/null; echo "    + group: $1"; }
add_group "Lead"
add_group "1 · Clarity Audit"
add_group "2 · Install"
add_group "3 · Build"
add_group "4 · Handover"
add_group "5 · Aftercare (30d)"
add_group "Won / Closed"

echo "==> 4/6  Adding columns to Engagements"
# add_status <title> <labels-json>   |  add_col <title> <type>
add_status() { mapi "mutation { create_column (board_id: $ENG, title: \"$1\", column_type: status, defaults: $(jq -Rc . <<<"$2")) { id } }" >/dev/null; echo "    + status: $1"; }
add_col()    { mapi "mutation { create_column (board_id: $ENG, title: \"$1\", column_type: $2) { id } }" >/dev/null; echo "    + $2: $1"; }

add_status "Geography"      '{"labels":{"0":"US — remote","1":"DACH — on-site"}}'
add_status "Audit invoice"  '{"labels":{"0":"Not sent","1":"Sent","2":"Paid"}}'
add_status "Build invoice"  '{"labels":{"0":"Not sent","1":"Sent","2":"Paid"}}'
add_status "Hardware"       '{"labels":{"0":"Not ordered","1":"Ordered","2":"Arrived","3":"Installed"}}'
add_status "Hybrid route"   '{"labels":{"0":"Off","1":"Client-enabled"}}'
add_col    "Owner"          people
add_col    "Next action"    text
add_col    "Next action due" date
add_col    "Vault link"     link
add_col    "Revenue"        numbers

echo "==> 5/6  Creating board: Delivery Tasks"
TASKS=$(mapi "mutation { create_board (board_name: \"Delivery Tasks\", board_kind: public, workspace_id: $WS, description: \"Runbook checklists, executable. Link each task to its Engagement.\") { id } }" \
      | jq -r '.data.create_board.id')
echo "    delivery tasks board id = $TASKS"
mapi "mutation { create_column (board_id: $TASKS, title: \"Done\", column_type: status, defaults: $(jq -Rc . <<<'{"labels":{"0":"To do","1":"Doing","2":"Done"}}')) { id } }" >/dev/null
mapi "mutation { create_column (board_id: $TASKS, title: \"Owner\", column_type: people) { id } }" >/dev/null
mapi "mutation { create_column (board_id: $TASKS, title: \"Due\", column_type: date) { id } }" >/dev/null
mapi "mutation { create_column (board_id: $TASKS, title: \"Runbook ref\", column_type: text) { id } }" >/dev/null
mapi "mutation { create_column (board_id: $TASKS, title: \"Engagement\", column_type: board_relation, defaults: $(jq -Rc . <<<"{\"boardIds\":[$ENG]}")) { id } }" >/dev/null
echo "    + columns: Done, Owner, Due, Runbook ref, Engagement(link to Engagements)"

echo "==> 6/6  Seeding Client Zero into Engagements"
# Put FIG in the audit group (find its id by name).
AUDIT_GID=$(mapi "query { boards(ids: $ENG) { groups { id title } } }" \
            | jq -r '.data.boards[0].groups[] | select(.title=="1 · Clarity Audit") | .id')
mapi "mutation { create_item (board_id: $ENG, group_id: \"$AUDIT_GID\", item_name: \"Falcon Intelligence Group (Client Zero)\") { id } }" >/dev/null
echo "    + item: Falcon Intelligence Group (Client Zero)"

cat <<EOF

==> DONE.
    Open Monday -> workspace "ADAMAS Delivery".
    Engagements board id: $ENG
    Delivery Tasks board id: $TASKS

    Manual cleanup (30 seconds): delete the 1-2 auto-created default groups on
    each board (the empty "Group Title" ones). The API can't remove them safely.

    Next: open the FIG item, set Geography = US — remote, fill Owner = you,
    and start the Clarity Audit (delivery/01-clarity-audit-runbook.md).
EOF
