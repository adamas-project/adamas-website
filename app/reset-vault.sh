#!/usr/bin/env bash
# Reset ADAMAS to an empty vault. DESTRUCTIVE: permanently deletes every
# decision, asset, candidate, and backup in the vault volume.
set -euo pipefail
cd "$(dirname "$0")"

USER_NAME="${ADAMAS_BASIC_USER:-adamas}"
PASS="${ADAMAS_BASIC_PASS:-clarity-audit}"

echo "This PERMANENTLY DELETES the ADAMAS vault (all decisions, assets, candidates, backups)."
read -r -p 'Type DELETE to confirm: ' confirm
if [ "$confirm" != "DELETE" ]; then
  echo "Aborted — nothing was deleted."
  exit 1
fi

echo "==> Removing container + vault volume…"
docker compose down -v

echo "==> Starting ADAMAS (empty vault)…"
docker compose up -d --build

echo -n "==> Waiting for ADAMAS to be ready"
for _ in $(seq 1 40); do
  if curl -fsS "http://localhost:8787/api/health" >/dev/null 2>&1; then break; fi
  echo -n "."; sleep 1
done
echo

echo "==> Vault state:"
curl -s -u "${USER_NAME}:${PASS}" "http://localhost:8787/api/meta" || true
echo
echo "Done. Expect \"count\":0. Open http://localhost:8787"
