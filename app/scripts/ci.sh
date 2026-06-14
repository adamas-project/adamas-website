#!/usr/bin/env bash
# ADAMAS CI gate. Runs lint, typecheck, and the full test suite.
# Every build stage must pass this before the next stage begins.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> [1/3] Lint"
npm run lint

echo "==> [2/3] Typecheck"
npm run typecheck

echo "==> [3/3] Tests"
npm run test

echo "==> CI passed."
