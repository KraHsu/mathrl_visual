# MathRL Visual

[![Deploy GitHub Pages](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml/badge.svg)](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml)

An unofficial, bilingual interactive companion for *Mathematical Foundations of Reinforcement Learning*, built with Rust, WebAssembly, Vue 3, and VitePress.

Chapter 1 is implemented as draft companion content using original explanations and an original 4×4 Grid World. See [PLAN.md](./PLAN.md) and [RIGHTS.md](./RIGHTS.md).

Public draft preview: <https://krahsu.github.io/mathrl_visual/>

## Chapter 1 implementation

- 11 paired Simplified Chinese and English routes covering the chapter map, states/actions, transitions, policies, rewards, returns, episodes, MDPs, a checkpoint, and the lab
- Eight live lab views: world, transition distribution, stochastic policy, editable reward, return ledger, episode semantics, Markov-state diagnosis, and model audit
- Rust/Wasm transition and policy sampling, editable rewards, ordinary/discounted returns, terminal/absorbing/continuing goal modes, and a 100-step truncation guard in a Dedicated Worker
- Fixed-seed replay that preserves both policy and environment RNG streams across language changes
- Localized model errors and same-worker recovery after an invalid configuration
- Keyboard controls, an ARIA grid and announcements, probability/trajectory data tables, and readable no-JavaScript chapter content
- Same-page locale switching with experiment replay across languages
- Separate local search indexes, canonical URLs, and reciprocal `hreflang` links

The content metadata remains `draft`; `RELEASE=1` intentionally blocks publication until bilingual human review is approved.

## Prerequisites

- Rust 1.97.1 with the `wasm32-unknown-unknown` target
- Node.js 22 or newer
- pnpm 10.34.5 through Corepack
- wasm-pack 0.15.x
- wasm-bindgen-cli 0.2.127

## Development

```bash
corepack pnpm install
cargo install wasm-pack --locked
cargo install wasm-bindgen-cli --version 0.2.127 --locked
corepack pnpm wasm:build
corepack pnpm dev
```

Open the URL printed by VitePress, then visit `/zh-Hans/learn/ch01/` or `/en/learn/ch01/`.

## Static build

```bash
corepack pnpm build
SITE_BASE=/mathrl_visual/ corepack pnpm build
```

The second command verifies a GitHub Pages-style project subpath.

## GitHub Pages

Pushing `main` triggers [the Pages workflow](./.github/workflows/pages.yml). It obtains the deployment base path from GitHub, rebuilds Rust/Wasm, runs the complete root and subpath test suites, verifies the static artifact, and deploys it through the `github-pages` environment.

The current public site is deliberately a preview: every page displays a bilingual draft banner and emits `noindex,nofollow` until the content review metadata is approved. The release-only content gate remains separate and continues to reject draft content.

## Verification

```bash
corepack pnpm check
```

The release-only locale gate can be exercised with:

```bash
RELEASE=1 corepack pnpm content:check
```
