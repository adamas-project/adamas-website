#!/bin/bash
# Double-click to start ADAMAS and open it in your browser. No typing required.
cd "$(dirname "$0")" || exit 1
echo "Starting ADAMAS…"
docker compose up -d --build
echo -n "Waiting for ADAMAS"
for _ in $(seq 1 40); do
  if curl -fsS "http://localhost:8787/api/health" >/dev/null 2>&1; then break; fi
  echo -n "."; sleep 1
done
echo
open "http://localhost:8787"
echo "ADAMAS is running at http://localhost:8787 (login: adamas / clarity-audit)."
echo "You can close this window; ADAMAS keeps running in the background."
