#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

bash scripts/build-wasm.sh
node scripts/check-locale-parity.mjs
node scripts/check-release-readiness.mjs
corepack pnpm --filter @mathrl/site build
PAGES_BASE="${SITE_BASE:-/}" node scripts/check-pwa-artifact.mjs
SBOM_DIST=site/docs/.vitepress/dist node scripts/check-sbom.mjs
