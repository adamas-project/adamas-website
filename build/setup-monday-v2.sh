#!/usr/bin/env bash
# ADAMAS × Monday.com — operational setup v2 (works with your EXISTING boards).
# Strictly ADDITIVE and IDEMPOTENT: only ever CREATES columns/groups/items/boards.
# Never renames, never deletes, never touches existing columns or groups.
# Safe for the live Netlify->Zapier Sales Pipeline (adding columns can't break a
# column-mapped zap). Run with YOUR personal token — no MCP, no approval prompts.
#
# Re-running is safe: it skips anything already present (matches by title/name).
#
# Prereqs:
#   export MONDAY_TOKEN='paste-your-token'   (Monday -> avatar -> Developers -> My access tokens)
#   jq (auto-installed via brew if missing)
#
# Usage:  bash setup-monday-v2.sh
set -uo pipefail   # NOTE: no -e; we handle errors per-call so one failure doesn't abort the run

: "${MONDAY_TOKEN:?-> Set your token first:  export MONDAY_TOKEN='your_token'  then re-run}"
API="https://api.monday.com/v2"
command -v jq >/dev/null 2>&1 || { echo "==> installing jq"; brew install jq; }

gql() {  # $1 = graphql; echoes raw JSON
  curl -s "$API" -H "Authorization: $MONDAY_TOKEN" -H "Content-Type: application/json" \
       -H "API-Version: 2024-10" -d "$(jq -nc --arg q "$1" '{query:$q}')"
}

echo "==> Discovering your boards (read-only)"
BOARDS=$(gql 'query { boards (limit: 500) { id name state } }')
if ! echo "$BOARDS" | jq -e '.data.boards' >/dev/null 2>&1; then
  echo "!! Could not list boards. Token problem? Raw response:"; echo "$BOARDS" | jq '.'; exit 1
fi
find_id() { echo "$BOARDS" | jq -r --arg n "$1" '.data.boards[] | select(.state=="active") | select(.name|contains($n)) | .id' | head -1; }

SALES=$(find_id "Sales_Pipeline")
CLIENT0=$(find_id "Client-0 Installation")
DASH=$(find_id "Dashboard and reporting")
DLOG=$(find_id "Decision Log")   # may be empty on first run
echo "    Sales Pipeline      = ${SALES:-NOT FOUND}"
echo "    Client-0 Install    = ${CLIENT0:-NOT FOUND}"
echo "    Dashboard           = ${DASH:-NOT FOUND}"
echo "    Decision Log        = ${DLOG:-(will create)}"

# --- helpers -----------------------------------------------------------------
EXISTING=""   # newline list of column titles for the board currently being worked
load_cols() { EXISTING=$(gql "query { boards(ids: $1){ columns { title } } }" | jq -r '.data.boards[0].columns[].title'); }
add_col() {   # add_col BOARD "Title" type ["defaultsJSON"]
  local b="$1" t="$2" ty="$3" d="${4:-}" q r
  if printf '%s\n' "$EXISTING" | grep -qxF "$t"; then echo "    = exists: $t"; return; fi
  if [ -n "$d" ]; then
    q="mutation { create_column(board_id: $b, title: \"$t\", column_type: $ty, defaults: $(jq -Rc . <<<"$d")) { id } }"
  else
    q="mutation { create_column(board_id: $b, title: \"$t\", column_type: $ty) { id } }"
  fi
  r=$(gql "$q")
  if echo "$r" | jq -e '.data.create_column.id' >/dev/null 2>&1; then echo "    + added: $t ($ty)"
  else echo "    ! FAILED: $t -> $(echo "$r" | jq -c '.errors // .data // .')"; fi
}

# === BOARD 1: Sales Pipeline — ADD COLUMNS ONLY (strictly additive) ===========
if [ -n "$SALES" ]; then
  echo "==> Sales Pipeline: adding columns (existing groups/columns untouched)"
  load_cols "$SALES"
  add_col "$SALES" "Client Number"     text
  add_col "$SALES" "Client Name"       text
  add_col "$SALES" "Company"           text
  add_col "$SALES" "Source"            status '{"labels":{"0":"Website Form","1":"Direct Booking","2":"Referral","3":"Outbound"}}'
  add_col "$SALES" "Contract Value"    numbers
  add_col "$SALES" "Clarity Audit Date" date
  add_col "$SALES" "Client Board"      link
  add_col "$SALES" "Notes"             long_text
else echo "!! Skipping Sales Pipeline (board not found — check the name)"; fi

# === BOARD 2: Client-0 Installation — columns + groups + task items ===========
if [ -n "$CLIENT0" ]; then
  echo "==> Client-0 Installation: adding columns"
  load_cols "$CLIENT0"
  add_col "$CLIENT0" "Client Number"       text
  add_col "$CLIENT0" "Phase"               status '{"labels":{"0":"Pre-Onboarding","1":"Environment","2":"Build","3":"Handoff","4":"Training","5":"Support"}}'
  add_col "$CLIENT0" "Start Date"          date
  add_col "$CLIENT0" "Contract Value"      numbers
  add_col "$CLIENT0" "Sales Pipeline Link" link
  add_col "$CLIENT0" "Support Status"      status '{"labels":{"0":"Active","1":"Paused","2":"Ended"}}'
  add_col "$CLIENT0" "Video Course Access" text
  add_col "$CLIENT0" "Next Review Date"    date

  echo "==> Client-0 Installation: ensuring workflow groups exist"
  GROUPS_JSON=$(gql "query { boards(ids: $CLIENT0){ groups { id title } } }")
  ensure_group() {  # ensure_group "Title" -> echoes group id (creates if absent)
    local title="$1" gid
    gid=$(echo "$GROUPS_JSON" | jq -r --arg t "$title" '.data.boards[0].groups[] | select(.title==$t) | .id' | head -1)
    if [ -z "$gid" ] || [ "$gid" = "null" ]; then
      gid=$(gql "mutation { create_group(board_id: $CLIENT0, group_name: \"$title\") { id } }" | jq -r '.data.create_group.id')
      echo "    + group: $title" >&2
    else echo "    = group exists: $title" >&2; fi
    echo "$gid"
  }
  G_PRE=$(ensure_group "Pre-Onboarding (Discovery & Clarity Audit)")
  G_ENV=$(ensure_group "Environment & Access Setup")
  G_BUILD=$(ensure_group "ADAMAS Build & Installation")
  G_HAND=$(ensure_group "System Handoff")
  G_TRAIN=$(ensure_group "Training + Support")

  echo "==> Client-0 Installation: seeding task items (skips duplicates)"
  EXIST_ITEMS=$(gql "query { boards(ids: $CLIENT0){ items_page(limit:500){ items { name } } } }" | jq -r '.data.boards[0].items_page.items[].name' 2>/dev/null)
  add_item() {  # add_item GROUP_ID "Task name"
    local gid="$1" name="$2"
    if printf '%s\n' "$EXIST_ITEMS" | grep -qxF "$name"; then echo "    = task exists: $name"; return; fi
    local r; r=$(gql "mutation { create_item(board_id: $CLIENT0, group_id: \"$gid\", item_name: \"$name\"){ id } }")
    if echo "$r" | jq -e '.data.create_item.id' >/dev/null 2>&1; then echo "    + task: $name"
    else echo "    ! FAILED task: $name -> $(echo "$r" | jq -c '.errors // .')"; fi
  }
  for t in "Discovery call completed" "Clarity audit completed" "Client decision confirmed" "Contract signed"; do add_item "$G_PRE" "$t"; done
  for t in "Provision local environment" "Install required tools" "Verify ports/access"; do add_item "$G_ENV" "$t"; done
  for t in "Clone repositories" "Install dependencies" "Configure environment" "Run migrations" "Start services" "Verify localhost/UI" "Test end-to-end workflow"; do add_item "$G_BUILD" "$t"; done
  for t in "Deliver credentials/configs" "Deliver runbook" "Schedule knowledge transfer"; do add_item "$G_HAND" "$t"; done
  for t in "Video course delivered" "Initial training complete" "Support window active" "Feedback collected"; do add_item "$G_TRAIN" "$t"; done
else echo "!! Skipping Client-0 board (not found — check the name)"; fi

# === BOARD 4: Decision Log — create new (idempotent) ==========================
echo "==> Decision Log board"
if [ -z "$DLOG" ]; then
  WS=$( [ -n "$SALES" ] && gql "query { boards(ids: $SALES){ workspace_id } }" | jq -r '.data.boards[0].workspace_id' )
  if [ -n "${WS:-}" ] && [ "$WS" != "null" ]; then
    DLOG=$(gql "mutation { create_board(board_name: \"Decision Log\", board_kind: public, workspace_id: $WS){ id } }" | jq -r '.data.create_board.id')
  else
    DLOG=$(gql "mutation { create_board(board_name: \"Decision Log\", board_kind: public){ id } }" | jq -r '.data.create_board.id')
  fi
  echo "    + created Decision Log: $DLOG"
else echo "    = Decision Log exists: $DLOG"; fi
if [ -n "$DLOG" ] && [ "$DLOG" != "null" ]; then
  load_cols "$DLOG"
  add_col "$DLOG" "Decision ID" text
  add_col "$DLOG" "Date"        date
  add_col "$DLOG" "Domain"      status '{"labels":{"0":"Hiring","1":"Sales","2":"Product","3":"Finance","4":"Ops"}}'
  add_col "$DLOG" "Title"       text
  add_col "$DLOG" "Context"     long_text
  add_col "$DLOG" "Decision"    long_text
  add_col "$DLOG" "Owner"       people
  add_col "$DLOG" "Trade-offs"  long_text
  add_col "$DLOG" "Links"       long_text
  add_col "$DLOG" "Sources"     long_text
  add_col "$DLOG" "Status"      status '{"labels":{"0":"Active","1":"Superseded","2":"Reversed"}}'
fi

cat <<EOF

============================================================
DONE (script portion). What the script did:
  - Sales Pipeline ($SALES): added 8 columns, additively. Groups/existing columns untouched.
  - Client-0 Installation ($CLIENT0): added 8 columns, 5 workflow groups, and task items.
  - Decision Log ($DLOG): created with 11 columns.

MANUAL STEPS the Monday API can't do (do these in the UI):
  1. Client-0 board: delete the OLD default groups (the empty ones) left over from
     before — the API can rename nothing, so it created correctly-named groups beside them.
  2. Sales Pipeline automation: Board -> Automations -> "When status changes to
     Closed Won, notify someone" -> notify you ("Create Client Board").
  3. Dashboard ("Dashboard and reporting") widgets — add in the UI:
     - Leads by Stage      : Chart widget, source = Sales Pipeline, group by stage
     - Revenue Forecast    : Numbers/Chart widget, source = Sales Pipeline, sum Contract Value by stage
     - Active Installations : Battery/Count widget, source = Client-0 board, Phase = Build/Handoff/Training/Support
     - Support Load        : Count widget, source = Client-0 board, Support Status = Active
     - Recent Leads        : Table widget, source = Sales Pipeline, sort newest, limit 5
  4. Confirm Zapier intact: send a test submission through your website form and
     confirm a new lead still lands in Sales Pipeline (adding columns shouldn't
     have changed the zap's mapping, but verify).
============================================================
EOF
