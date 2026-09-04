#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
node scripts/check-locale-parity.mjs
node scripts/check-release-readiness.mjs
node scripts/check-dependency-audit.mjs
bash scripts/build-wasm.sh
corepack pnpm --filter @mathrl/site typecheck
corepack pnpm --filter @mathrl/site test
pages_test_base="${PAGES_TEST_BASE:-/mathrl_visual/}"
VITE_SITE_STAGE=preview SITE_BASE="$pages_test_base" corepack pnpm --filter @mathrl/site build
PAGES_STAGE=preview PAGES_BASE="$pages_test_base" node scripts/check-pages-artifact.mjs
PAGES_BASE="$pages_test_base" node scripts/check-pwa-artifact.mjs
SBOM_DIST=site/docs/.vitepress/dist node scripts/check-sbom.mjs
PERF_DIST=site/docs/.vitepress/dist node scripts/check-performance-budget.mjs
VITE_SITE_STAGE=preview SITE_BASE="$pages_test_base" corepack pnpm --filter @mathrl/site test:e2e
VITE_SITE_STAGE=preview SITE_BASE=/ corepack pnpm --filter @mathrl/site build
PAGES_BASE=/ node scripts/check-pwa-artifact.mjs
SBOM_DIST=site/docs/.vitepress/dist node scripts/check-sbom.mjs
PERF_DIST=site/docs/.vitepress/dist node scripts/check-performance-budget.mjs
VITE_SITE_STAGE=preview SITE_BASE=/ corepack pnpm --filter @mathrl/site test:e2e
