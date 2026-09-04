# MathRL Visual

[![Deploy GitHub Pages](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml/badge.svg)](https://github.com/KraHsu/mathrl_visual/actions/workflows/pages.yml)

An unofficial, bilingual interactive companion for *Mathematical Foundations of Reinforcement Learning*, built with Rust, WebAssembly, Vue 3, and VitePress.

Chapter 1 is implemented as a draft vertical slice. Chapter 2 now includes a shared 4×4 Grid World, all-16-state fixed-policy evaluation lab, and the retained four-state Bellman scaffold. Chapters 3 and 4 are bilingual technical slices built on the same shared model, and Chapters 5–10 add bilingual model-free, stochastic-approximation, temporal-difference, value-function, policy-gradient, and actor–critic slices. The original bilingual appendix pages, local progress, offline/PWA packages, release manifest, readiness audit, and performance budget are also in the repository. See [PLAN.md](./PLAN.md) and [RIGHTS.md](./RIGHTS.md).

Public Pages preview: <https://krahsu.github.io/mathrl_visual/>

The normal goal of this repository is a static learning website, not a formal
publication workflow. A successful build can be deployed to GitHub Pages
without an approval step. The companion pages, Rust/Wasm code, and diagrams
are written for this project and link back to the upstream book as a reference.
If the scope later changes to redistribute the book's verbatim prose, PDF,
figures, or other upstream material, review that separate permission question
before adding those assets; it is not a prerequisite for the original
interactive site.

## Chapter 1 implementation

- 10 paired Simplified Chinese and English routes covering the chapter map, states/actions, transitions, policies, rewards, returns, episodes, MDPs, a checkpoint, and the lab
- Eight live lab views: world, transition distribution, stochastic policy, editable reward, return ledger, episode semantics, Markov-state diagnosis, and model audit
- Rust/Wasm transition and policy sampling, editable rewards, ordinary/discounted returns, terminal/absorbing/continuing goal modes, and a 100-step truncation guard in a Dedicated Worker
- Fixed-seed replay that preserves both policy and environment RNG streams across language changes
- Localized model errors and same-worker recovery after an invalid configuration
- Keyboard controls, an ARIA grid and announcements, probability/trajectory data tables, and readable no-JavaScript chapter content
- Same-page locale switching with experiment replay across languages
- Separate local search indexes, canonical URLs, and reciprocal `hreflang` links

The content metadata remains `draft` because this is an evolving companion.
`RELEASE=1` is an optional, stricter formal-release audit; it does not block
the ordinary Pages preview.

## Chapter 2 shared policy-evaluation slice

- Paired English and Simplified Chinese pages for state values, the Bellman expectation equation, matrix form, iterative policy evaluation, action values, and a checkpoint
- A shared 4×4 Grid World policy evaluator covering all 16 states, using the same rewards, terminal semantics, and optional wind as Chapters 1, 3, and 4
- Rust/Wasm synchronous Bellman sweeps, policy-induced $P_\pi$ and $r_\pi$, current Bellman residual, bounded convergence, structured validation, and a partial-pivoting linear-system reference solution
- A selectable one-step expectation ledger, 16-state value heatmap, selected-state dependency view, matrix table, residual trace, and model audit
- Single-sweep, run, pause, reset, speed, discount, tolerance, and iteration-limit controls through a dedicated Worker
- Deterministic replay that preserves configuration, sweep count, values, and view state across language changes
- The original four-state Bellman experiment remains as a compact preflight/scaffold; it is not used as a substitute for the shared 16-state lab

The shared 16-state implementation is technically complete and is covered by native/Wasm, protocol, parity, and static-artifact checks. It is available in the ordinary preview; a future formal release may add a separate human review record.

## Chapter 3 optimality slice

- Paired English and Simplified Chinese pages for policy improvement, optimal values, the Bellman optimality equation, contraction mappings, greedy optimal policies, parameter effects, and an integrated checkpoint
- The same original 4×4 Grid World geometry, action set, transition semantics, hazards, terminal goal, and rewards used by Chapter 1
- Rust/Wasm action-aware Bellman optimality backups, synchronous optimality sweeps, all greedy ties, residuals, bounded convergence, and a high-precision reference solution
- A 16-state value heatmap, action-value ledger, greedy-policy arrows, propagation trace, contraction witness, parameter presets, and live model audit
- Strict Worker protocol validation, retryable Worker/Wasm startup, reduced-motion batching, responsive numeric alternatives, and deterministic cross-language restoration

Chapter 3 is published as an original technical preview. Its mathematics and runtime are test-gated; the optional formal-release audit may request an additional bilingual human-review record. Repeated optimality sweeps are used here to expose the fixed point; Chapter 4 turns that operator into comparable planning schedules.

## Chapter 4 planning slice

- Nine paired English and Simplified Chinese routes covering Value Iteration, Policy Iteration, Truncated Policy Iteration, generalized policy iteration, a summary, Q&A, a checkpoint, and the planning lab
- One shared Rust core and Wasm adapter with independent VI/PI/TPI state, synchronous backups, explicit policy-evaluation phases, deterministic tie masks, terminal-state handling, residuals, bounded convergence, and reference values
- A side-by-side 4×4 planning laboratory with value/policy maps, requested-action transition ledgers, phase traces, residual history with a numeric fallback, work counters, configuration validation, reduced-motion batching, and local restoration
- A documented 20% wind preset that changes the transition distribution while preserving the “expectation first, action maximum second” rule; the Chapter 1 Transition and Markov views provide the introductory one-click wind prompt
- Pinned Chapter 4 source metadata, reciprocal locale links, Pages-subpath artifact checks, and browser coverage for the Worker/Wasm boundary

Chapter 4 is also an original technical preview. The chapter and lab use `review_content: draft` and `review_language: draft`; those fields describe review progress for the optional formal-release audit and do not prevent preview deployment.

## Chapter 5 Monte Carlo slice

- Nine paired English and Simplified Chinese routes covering mean estimation, MC Basic, Exploring Starts, ε-greedy control, exploration/exploitation, summary, Q&A, and a checkpoint
- A paired Monte Carlo episode laboratory with seeded replay, initial/first/every-visit return ledgers, state/action counts, running means and variances, policy probabilities, model-free audits, and a no-JavaScript explanation fallback
- One Rust core and Wasm adapter that generate realised episodes through the shared Grid World; the learner receives sampled transitions and returns rather than a transition-probability table
- Dedicated Worker protocol validation, stale-message protection, reset/replay, bounded episode and step budgets, optional 20% wind, and a seeded Exploring Starts permutation over the 75 legal nonterminal pairs
- The Chapter 1 Transition and Markov views retain a bilingual guided prompt: inspect the deterministic row first, then enable 20% wind; with seed `5eed`, requested right-right-down-down can be observed as realised right-right-down-left

Chapter 5 is an original technical preview. Its pages and UI remain `review_content: draft` and `review_language: draft`; the optional formal-release audit can be completed later.

## Chapter 6 stochastic-approximation slice

- Ten paired English and Simplified Chinese routes cover mean estimation, Robbins–Monro, Dvoretzky-style convergence, SGD, batch/mini-batch updates, summary, Q&A, a checkpoint, and the lab.
- The Rust core and Wasm adapter expose seeded scalar mean, root-finding, SGD, mini-batch, and batch-gradient recursions with harmonic, constant, and polynomial schedules.
- The Worker normalizes the versioned payload, bounds each advance to 2,000 updates, rejects stale runs, and reports before/after iterates, observations, residuals, noise, batch indices, step-size sums, and finite-run diagnostics.
- The bilingual Vue laboratory keeps a numeric trace beside an SVG trajectory and explicitly distinguishes a finite tolerance hit from an almost-sure convergence theorem; no JavaScript fallback remains readable.
- In the Chapter 1 Grid World lab, both the Transition and Markov views now show a prominent bilingual wind guide plus a static page fallback: inspect the no-wind row, then enable 20% wind and reproduce the seeded right-right-down-left realised trace.

Chapter 6 is an original technical preview. Its content and translations remain `review_content: draft` and `review_language: draft`; this status does not block the ordinary site.

## Chapters 7–10 learning slices

- Paired English and Simplified Chinese learning paths cover temporal-difference methods (Chapter 7), value-function methods and function approximation (Chapter 8), policy-gradient methods (Chapter 9), and actor–critic methods (Chapter 10), with chapter summaries, Q&A, checkpoints, stable anchors, and source metadata.
- Four dedicated Rust/Wasm evaluators run behind versioned Dedicated Workers. The labs expose tabular TD(0)/SARSA/n-step SARSA/Q-learning, linear features and DQN-style replay/target updates, seeded REINFORCE with an optional baseline, and QAC/A2C/off-policy/deterministic actor–critic updates.
- Each lab keeps formulas and a no-JavaScript explanation beside numeric tables, traces, finite-value audits, deterministic reset/replay, input validation, stale-message protection, and responsive bilingual controls.
- The Pages artifact checker and browser matrix cover all 76 Chapter 7–10 locale routes, four Worker bundles, the Wasm exports, Chinese no-JavaScript fallback, language metadata, and 1024/400/320px overflow checks.

These four chapters are original technical previews. Their pages and translations remain `review_content: draft` and `review_language: draft`; `RELEASE=1` is available when a formally reviewed release is desired, while the preview remains deployable.

## Appendix, progress, offline, and release infrastructure

- Six paired original companion pages cover probability, convergence, linear algebra, optimization, and a bilingual glossary; each page records its source reference, content origin, and review status.
- A bilingual learning map, Markov-property concept page, symbols index, search guide, and offline guide make the complete route graph discoverable without requiring a JavaScript-only entry point.
- A global progress panel stores completion and bookmarks by stable content ID, works across locales, and supports JSON export/import and shareable links. IndexedDB is preferred, with a bounded local-storage fallback.
- The build generates localized single-language and bilingual offline packs, manifests, a versioned service worker, and schema-2 progress migration. Updates require explicit user confirmation so an active experiment is not interrupted.
- `release-manifest.json`, `check-release-readiness.mjs`, `check-pwa-artifact.mjs`, `check-sbom.mjs`, `check-dependency-audit.mjs`, and `check-performance-budget.mjs` provide version, offline, production-readiness, dependency/license, vulnerability, and compressed-size evidence. The current preview build and local strict dependency audit pass the technical checks; the protected release workflow still archives the corresponding reports.

These facilities make the repository ready for an interactive static preview. The current local evidence includes 54-route Axe runs in each of Chromium, Firefox, and WebKit, mobile smoke over 25 route paths per locale (50 locale-route checks) in each emulated engine plus navigation/wind and visible-evidence checks, and a 9/9 Wasm browser test run. The source manifest now covers all 204 topic-reference files with the fixed upstream commit, Git blob, PDF SHA-256, and section range; policy and navigation pages are explicitly typed and are not forced to invent a PDF provenance record. If a formally reviewed v1 or a verbatim reproduction is wanted later, the optional release workflow records the additional review, rights, accessibility, and operational evidence for that narrower goal.

The strict release gate is intentionally fail-closed for that optional formal
profile. Its pending records do not prevent the clearly labelled original
companion preview from being built, viewed, or deployed.

To hand the remaining page work to reviewers, run `corepack pnpm review:packet`.
The command writes an ignored `release-evidence/` packet in JSON, Markdown, and
CSV form; it is regenerated from the current frontmatter and never counts as an
approval by itself.

The upstream pin is checked without changing local content:

```bash
corepack pnpm upstream:check
UPSTREAM_SYNC_REPORT=upstream-sync.json corepack pnpm upstream:check
```

The scheduled workflow runs the same read-only check. A changed upstream branch
fails the job and requires a reviewed source, rights, and bilingual-content
update before the immutable commit in the manifest is changed.

## Prerequisites

- Rust 1.97.1 with the `wasm32-unknown-unknown` target
- Node.js 22 or newer
- pnpm 10.34.5 through Corepack
- wasm-pack 0.15.0
- wasm-bindgen-cli 0.2.127
- cargo-audit 0.22.2 (only required for the strict dependency gate)

## Development

```bash
corepack pnpm install
cargo install wasm-pack --version 0.15.0 --locked
cargo install wasm-bindgen-cli --version 0.2.127 --locked
cargo install cargo-audit --version 0.22.2 --locked
corepack pnpm wasm:build
corepack pnpm dev
```

Open the URL printed by VitePress, then visit `/zh-Hans/learn/ch02/`, `/en/learn/ch02/`, or any of the Chapter 1–10 labs under the corresponding locale route.

## Static build

```bash
corepack pnpm build
SITE_BASE=/mathrl_visual/ corepack pnpm build
```

The second command verifies a GitHub Pages-style project subpath.

The VitePress build uses a serialized page-index pass (`buildConcurrency: 1`)
so identical release inputs produce the same local-search index and hashed
frontend chunks. Production evidence should repeat the build with identical
identity/timestamp inputs and compare the complete artifact digest.

The site build also emits localized manifests, offline packs, a service worker, a release manifest, a CycloneDX SBOM, and a license inventory. To inspect the release-candidate gates explicitly:

```bash
corepack pnpm release:readiness
corepack pnpm sbom:check
corepack pnpm pwa:check
corepack pnpm security:check
SECURITY_AUDIT_STRICT=1 corepack pnpm security:check
corepack pnpm perf:check
```

`corepack pnpm sbom:generate` can regenerate the two SBOM files for an
existing artifact; preserve the same `APP_VERSION`, `UPSTREAM_COMMIT`, and
`BUILD_TIMESTAMP` values used by the build before running the artifact checks.

The broad browser matrix is explicit and uses the pinned Playwright binaries:

```bash
corepack pnpm --filter @mathrl/site test:e2e:cross-browser
corepack pnpm wasm:test:browser
```

The wrapper checks the browser/driver major-version contract.  In normal Chrome
mode it first reuses an exact or same-build local driver, then downloads and
caches the closest same-major Chrome for Testing driver when no safe local
match exists.  This keeps a machine with an older system Chrome from receiving
an incompatible latest driver.  For a local Chrome installation whose driver
is not on `PATH`, you can still pass the matching binary explicitly (temporary
directories are not searched implicitly):

```bash
CHROMEDRIVER=/path/to/chromedriver corepack pnpm wasm:test:browser
# or: corepack pnpm wasm:test:browser --driver-search-dir /path/to/unpacked-driver
```

Use `WASM_NO_DRIVER_DOWNLOAD=1` (or `--no-driver-download`) for an offline or
hermetic run; it requires an explicit or already-cached matching ChromeDriver
and never delegates driver fetching to `wasm-pack`.  Firefox still requires a
local `geckodriver` for a no-download run.

The wrapper also verifies the exact `wasm-pack 0.15.0` build and
`wasm-bindgen-test-runner 0.2.127`.  A release can pin the exact Chrome for
Testing driver and its executable digest with
`WASM_CHROMEDRIVER_VERSION=...` and `WASM_CHROMEDRIVER_SHA256=...`; the latter
is the executable (not archive) digest and is checked for explicit, cached, and
downloaded drivers.  The two pins must be supplied together; the wrapper logs
the expected Chrome for Testing source URL and downloaded archive digest for
review.  `--check-only` is side-effect free and never downloads or writes a
cache entry.
The production dispatch requires both values, resolves the matching pinned
Playwright Chromium binary, and writes a temporary WebDriver capability file
so the driver and browser are the same build.

The mobile suite uses emulated phone viewports. Real-device and assistive-technology results must be attached to the release record separately. After deploying a production artifact, run the dependency-free HTTPS smoke probe and save its JSON report:

```bash
SMOKE_URL=https://example.test/mathrl_visual/ \
SMOKE_REPORT=deployment-smoke.json \
node scripts/smoke-deployed.mjs
```
The smoke probe follows only same-origin, same-base redirects and records the
final URL for each endpoint.

## GitHub Pages

Pushing `main` triggers [the Pages workflow](./.github/workflows/pages.yml),
which builds, validates, and deploys the static preview through the
`github-pages` environment. A manual dispatch is also available for a
one-off rebuild from a commit/ref allowed by that environment (normally
`main`). The separate production workflow is an
optional stricter path and is not required to publish the learning site.

The Pages preview artifact displays a bilingual draft banner plus visible
version/provenance and review-status information, and emits `noindex,nofollow`
while it is marked as a preview. The workflow also runs a post-deploy HTTPS
smoke check. If the public URL does not yet expose `version.json` and the PWA
metadata, it is an older deployment and will update after the next successful
main push. The optional formal-release gate remains separate.

The preview and any later production deployment use the same repository Pages
URL. Treat a production cutover as an explicit operational decision; ordinary
main pushes are the normal way to keep this learning preview current.

## Verification

```bash
corepack pnpm check
```

The release-only gate can be exercised with:

```bash
RELEASE=1 corepack pnpm release:readiness
```

In the current tree this optional audit reports pending rights and human-review
metadata (machine-checked source provenance is complete for topic-reference
pages). Do not change draft metadata merely to make an optional audit pass.
