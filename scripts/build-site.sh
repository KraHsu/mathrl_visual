#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

bash scripts/build-wasm.sh
node scripts/check-locale-parity.mjs
corepack pnpm --filter @mathrl/site build
