#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack is required. Install it with: cargo install wasm-pack --locked" >&2
  exit 1
fi

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "wasm-bindgen-cli 0.2.127 is required. Install it with: cargo install wasm-bindgen-cli --version 0.2.127 --locked" >&2
  exit 1
fi

wasm-pack build "$project_root/crates/mathrl-wasm" \
  --mode no-install \
  --no-opt \
  --release \
  --target web \
  --out-dir "$project_root/site/docs/.vitepress/generated/wasm" \
  --out-name mathrl_wasm
