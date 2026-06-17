#!/bin/bash
# Double-click to stop ADAMAS (data is preserved).
cd "$(dirname "$0")" || exit 1
docker compose stop
echo "ADAMAS stopped. Your vault data is preserved. Double-click start.command to run it again."
