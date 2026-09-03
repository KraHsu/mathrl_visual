# MathRL Visual

[![Deploy GitHub Pages](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml/badge.svg)](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml)

An unofficial, bilingual interactive companion for *Mathematical Foundations of Reinforcement Learning*, built with Rust, WebAssembly, Vue 3, and VitePress.

Chapter 1 is implemented as a draft vertical slice. Chapter 2 has a bilingual four-state policy-evaluation pilot. Chapters 3 and 4 are bilingual technical slices built on Chapter 1's shared 4×4 Grid World, and Chapters 5–10 now add bilingual model-free, stochastic-approximation, temporal-difference, value-function, policy-gradient, and actor–critic slices. Chapter 2's integration with the shared model remains a follow-up. See [PLAN.md](./PLAN.md) and [RIGHTS.md](./RIGHTS.md).

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

Chapter 3 is published as an original technical preview. Its mathematics and runtime are test-gated, while the bilingual human-review metadata remains `draft` and therefore cannot pass the release-only content gate yet. Repeated optimality sweeps are used here to expose the fixed point; Chapter 4 turns that operator into comparable planning schedules.

## Chapter 4 planning slice

- Nine paired English and Simplified Chinese routes covering Value Iteration, Policy Iteration, Truncated Policy Iteration, generalized policy iteration, a summary, Q&A, a checkpoint, and the planning lab
- One shared Rust core and Wasm adapter with independent VI/PI/TPI state, synchronous backups, explicit policy-evaluation phases, deterministic tie masks, terminal-state handling, residuals, bounded convergence, and reference values
- A side-by-side 4×4 planning laboratory with value/policy maps, requested-action transition ledgers, phase traces, residual history with a numeric fallback, work counters, configuration validation, reduced-motion batching, and local restoration
- A documented 20% wind preset that changes the transition distribution while preserving the “expectation first, action maximum second” rule; the Chapter 1 Transition and Markov views provide the introductory one-click wind prompt
- Pinned Chapter 4 source metadata, reciprocal locale links, Pages-subpath artifact checks, and browser coverage for the Worker/Wasm boundary

Chapter 4 is also an original technical preview. The chapter and lab use `review_content: draft` and `review_language: draft`, so the release-only content gate must continue to fail until a human mathematics and bilingual review is recorded.

## Chapter 5 Monte Carlo slice

- Nine paired English and Simplified Chinese routes covering mean estimation, MC Basic, Exploring Starts, ε-greedy control, exploration/exploitation, summary, Q&A, and a checkpoint
- A paired Monte Carlo episode laboratory with seeded replay, initial/first/every-visit return ledgers, state/action counts, running means and variances, policy probabilities, model-free audits, and a no-JavaScript explanation fallback
- One Rust core and Wasm adapter that generate realised episodes through the shared Grid World; the learner receives sampled transitions and returns rather than a transition-probability table
- Dedicated Worker protocol validation, stale-message protection, reset/replay, bounded episode and step budgets, optional 20% wind, and a seeded Exploring Starts permutation over the 75 legal nonterminal pairs
- The Chapter 1 Transition and Markov views retain a bilingual guided prompt: inspect the deterministic row first, then enable 20% wind; with seed `5eed`, requested right-right-down-down can be observed as realised right-right-down-left

Chapter 5 is an original technical preview. Its pages and UI remain `review_content: draft` and `review_language: draft`; the release-only gate must remain closed until mathematics, translation, accessibility, and rights review are recorded.

## Chapter 6 stochastic-approximation slice

- Ten paired English and Simplified Chinese routes cover mean estimation, Robbins–Monro, Dvoretzky-style convergence, SGD, batch/mini-batch updates, summary, Q&A, a checkpoint, and the lab.
- The Rust core and Wasm adapter expose seeded scalar mean, root-finding, SGD, mini-batch, and batch-gradient recursions with harmonic, constant, and polynomial schedules.
- The Worker normalizes the versioned payload, bounds each advance to 2,000 updates, rejects stale runs, and reports before/after iterates, observations, residuals, noise, batch indices, step-size sums, and finite-run diagnostics.
- The bilingual Vue laboratory keeps a numeric trace beside an SVG trajectory and explicitly distinguishes a finite tolerance hit from an almost-sure convergence theorem; no JavaScript fallback remains readable.
- In the Chapter 1 Grid World lab, both the Transition and Markov views now show a prominent bilingual wind guide plus a static page fallback: inspect the no-wind row, then enable 20% wind and reproduce the seeded right-right-down-left realised trace.

Chapter 6 is an original technical preview. Its content and translations remain `review_content: draft` and `review_language: draft`; the release-only gate must stay closed until human mathematics, bilingual, accessibility, and rights review is recorded.

## Chapters 7–10 learning slices

- Paired English and Simplified Chinese learning paths cover temporal-difference methods (Chapter 7), value-function methods and function approximation (Chapter 8), policy-gradient methods (Chapter 9), and actor–critic methods (Chapter 10), with chapter summaries, Q&A, checkpoints, stable anchors, and source metadata.
- Four dedicated Rust/Wasm evaluators run behind versioned Dedicated Workers. The labs expose tabular TD(0)/SARSA/n-step SARSA/Q-learning, linear features and DQN-style replay/target updates, seeded REINFORCE with an optional baseline, and QAC/A2C/off-policy/deterministic actor–critic updates.
- Each lab keeps formulas and a no-JavaScript explanation beside numeric tables, traces, finite-value audits, deterministic reset/replay, input validation, stale-message protection, and responsive bilingual controls.
- The Pages artifact checker and browser matrix cover all 76 Chapter 7–10 locale routes, four Worker bundles, the Wasm exports, Chinese no-JavaScript fallback, language metadata, and 1024/400/320px overflow checks.

These four chapters are original technical previews. Their pages and translations remain `review_content: draft` and `review_language: draft`; `RELEASE=1` must remain blocked until mathematics, bilingual, accessibility, and rights review is recorded.

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

Open the URL printed by VitePress, then visit `/zh-Hans/learn/ch07/` or `/en/learn/ch07/` (or any of the Chapter 7–10 labs under `/en/labs/`).

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
