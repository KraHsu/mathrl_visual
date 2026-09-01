# MathRL Visual

[![Deploy GitHub Pages](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml/badge.svg)](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml)

An unofficial, bilingual interactive companion for *Mathematical Foundations of Reinforcement Learning*, built with Rust, WebAssembly, Vue 3, and VitePress.

Chapter 1 is implemented as a draft vertical slice. Chapter 2 has a bilingual four-state policy-evaluation pilot. Chapter 3 provides a bilingual optimality vertical slice derived from Chapter 1's shared 4×4 Grid World; the planned Chapter 2 integration with that shared model remains a follow-up. See [PLAN.md](./PLAN.md) and [RIGHTS.md](./RIGHTS.md).

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

## Chapter 2 pilot

- Paired English and Simplified Chinese pages for state values, the Bellman expectation equation, matrix form, iterative policy evaluation, action values, and a checkpoint
- An original four-state Markov reward process with a complete transition table and policy-induced dependency graph
- Rust/Wasm synchronous Bellman sweeps, current Bellman residual, bounded convergence, structured validation, and a partial-pivoting linear-system reference solution
- A selectable one-step expectation ledger, state-value heatmap, matrix table, residual trace, and model audit
- Single-sweep, run, pause, reset, speed, discount, tolerance, and iteration-limit controls through a dedicated Worker
- Deterministic replay that preserves configuration, sweep count, values, and view state across language changes

This pilot isolates the Bellman mechanics for auditability. It is not yet the plan's cross-chapter shared-Grid-World implementation, so Chapter 2 remains a draft preview rather than a completed vertical slice.

## Chapter 3 optimality slice

- Paired English and Simplified Chinese pages for policy improvement, optimal values, the Bellman optimality equation, contraction mappings, greedy optimal policies, parameter effects, and an integrated checkpoint
- The same original 4×4 Grid World geometry, action set, transition semantics, hazards, terminal goal, and rewards used by Chapter 1
- Rust/Wasm action-aware Bellman optimality backups, synchronous optimality sweeps, all greedy ties, residuals, bounded convergence, and a high-precision reference solution
- A 16-state value heatmap, action-value ledger, greedy-policy arrows, propagation trace, contraction witness, parameter presets, and live model audit
- Strict Worker protocol validation, retryable Worker/Wasm startup, reduced-motion batching, responsive numeric alternatives, and deterministic cross-language restoration

Chapter 3 is published as an original technical preview. Its mathematics and runtime are test-gated, while the bilingual human-review metadata remains `draft` and therefore cannot pass the release-only content gate yet. Repeated optimality sweeps are used here to expose the fixed point; Chapter 4 remains responsible for the full Value Iteration and Policy Iteration algorithm treatment.

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

Open the URL printed by VitePress, then visit `/zh-Hans/learn/ch03/` or `/en/learn/ch03/`.

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
