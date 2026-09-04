---
id: exp-ch04-planning-grid
translation_key: exp-ch04-planning-grid
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Value and policy iteration planning lab
description: Run value iteration, policy iteration, and truncated policy iteration side by side on the shared 4×4 Grid World.
aside: false
outline: deep
---

# Value and policy iteration planning lab

This lab turns the Chapter 4 schedule comparison into a reproducible, inspectable browser experiment. Rust/Wasm performs model queries in a Worker; Vue shows the same run as a grid, action ledger, policy trace, residual history, and numeric tables.

::: info Original companion experiment
The environment presets, controls, trace format, questions, and fallback calculations on this page are original companion material. They reference the upstream chapter's topics without redistributing its prose, figures, tables, examples, questions, or code.
:::

::: warning Known-model boundary
The lab is given the complete one-step transition and reward model. It does not sample trajectories, estimate a model, or train from experience. “Planning” here means dynamic programming with a known model.
:::

<PlanningLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the model, algorithm definitions, baseline vectors, and manual audit procedure remain available in the text below.
</noscript>

<a id="model"></a>

## The shared 4×4 model

States are numbered row-major from $0$ (upper-left) to $15$ (lower-right). State $0$ is the start, state $15$ is a terminating goal, and states $6$ and $9$ are hazards. Nonterminal actions are **up**, **right**, **down**, **left**, and **stay**. The baseline uses:

$$
\gamma=0.9,
\qquad
p_{\mathrm{slip}}=0,
\qquad
(r_{\mathrm{ordinary}},r_{\mathrm{boundary}},r_{\mathrm{hazard}},r_{\mathrm{goal}})
=(-0.04,-1,-1,+1).
$$

The site's shared reward convention is therefore: ordinary movement receives $-0.04$, a boundary collision receives $-1$, entering a hazard receives $-1$, and entering the goal receives $+1$. The goal reward is counted on entry; the continuation after the goal is zero and the goal has no action row. Every requested action is selected before any slip outcome is revealed.

At the default 20% wind preset, the intended actual direction has probability $0.85$ and each of the other three directions has probability $0.05$ (with boundary handling applied after the actual direction is sampled). The **stay** action remains explicit in the model; the wind rule is attached to directional requests.

<a id="configuration"></a>

## Configuration and reproducibility

The default controls are:

| Parameter | Baseline | Meaning |
| --- | ---: | --- |
| discount $\gamma$ | $0.9$ | weight on successor values; accepted range $[0,0.99]$ |
| wind/slip probability | $0$ | stochastic directional outcome; accepted range $[0,1]$ |
| value tolerance | $10^{-10}$ | fixed-point threshold used by the planner |
| outer/total sweep cap | $100$ | work budget; reaching it is reported as truncated |
| inner evaluation depth $J$ | $1$ for the depth preset | finite fixed-policy sweeps for truncated PI |
| model identifier | shared fixed Grid World model | the planner is deterministic; no random seed is consumed or stored in the run trace |

The **baseline**, **wind 20%**, **short horizon**, and **long horizon** presets each change a documented factor. Changing a field validates it in the Vue layer and again in the Worker/Wasm engine. A failed validation is recoverable without reloading the page.

The values in this table describe the browser's responsive **baseline preset**. The native Rust API and the Worker both accept the explicit values currently applied in the controls; the named presets are reproducible shortcuts for common configurations.

Changing language preserves the algorithm, model parameters, counters, policy, values, and current trace. Reset intentionally clears the run while retaining the applied configuration.

<a id="value-iteration"></a>

## View A — Value Iteration

Value Iteration starts with $v_0=0$ and repeats the synchronous optimality backup:

$$
q_k(s,a)=\sum_{s',r}p(s',r\mid s,a)[r+\gamma v_k(s')],
\qquad
v_{k+1}(s)=\max_a q_k(s,a).
$$

The trace exposes both the full action ledger and the greedy mask. At the baseline, the first vector must be

$$
v_1=(-0.04,-0.04,-0.04,-0.04,
-0.04,-0.04,-0.04,-0.04,
-0.04,-0.04,-0.04,1,
-0.04,-0.04,1,0).
$$

The current residual is reported as $\|T_*v_k-v_k\|_\infty$; an update size is reported separately. The UI must not label a vector “state value of the greedy policy” merely because a greedy arrow is shown.

<a id="policy-iteration"></a>

## View B — Policy Iteration

Policy Iteration starts with a visible deterministic representative of the zero-vector greedy sets (the lowest documented action code at each nonterminal state). Each outer round:

1. evaluates the fixed policy using synchronous $T_\pi$ sweeps until its inner tolerance or cap;
2. computes every action backup against the evaluated vector;
3. records all maximizing actions; and
4. installs a deterministic representative according to the documented tie rule.

The trace separates outer policy rounds from inner evaluation sweeps. A stable policy requires both an acceptable inner evaluation status and no strict greedy change. If a tie set is unchanged but the selected representative changes, the run should report a tie-policy change rather than inventing a value improvement.

<a id="truncated"></a>

## View C — Truncated Policy Iteration

Truncated PI keeps the policy-evaluation step finite. Select an inner depth $J$ and perform exactly $J$ synchronous $T_\pi$ backups before each greedy improvement. This lab has no adaptive early-stop mode; the explicit depth is part of the trace.

The experiment offers depth presets such as $J=1$, $J=2$, and $J=8$. Compare them with the same model, initial policy, and tolerance. The trace reports:

- outer policy round;
- inner sweep index and depth;
- value vector and inner residual;
- policy-change/tie mask;
- total model-backup count; and
- stable, inner-truncated, or outer-truncated status.

Depth one is Value-Iteration-like only when its initialization and timing are matched to the preceding optimality update. The lab intentionally keeps the schedule metadata visible so this statement can be tested.

<a id="comparison"></a>

## Compare schedules fairly

Run each view from a reset with the same baseline configuration. Record:

| Measurement | Value Iteration | Policy Iteration | Truncated PI |
| --- | ---: | ---: | ---: |
| outer rounds |  |  |  |
| inner fixed-policy sweeps | 0 by definition |  |  |
| total model backups |  |  |  |
| first nonzero vector |  |  |  |
| final residual |  |  |  |
| policy stable? |  |  |  |

Comparing only outer-round counts can reverse the apparent result: a policy-iteration round may contain many inner model queries. The numeric table and work counter are the primary comparison; colours, arrow length, and animation speed are presentation choices.

<a id="wind-audit"></a>

## Wind as a dynamics audit

First run the no-wind baseline and inspect one complete requested-action row. Then enable **wind 20%**. For a directional request, verify that the four actual-action probabilities sum to one and that the expected backup is computed before the action maximum. A useful negative test is to compare the selected backup with the illegal expression $\mathbb E[\max_a(\cdot)]$; they should differ in a state where outcomes favour different actions.

The introductory [transition/Markov experiment](/en/labs/ch01-gridworld) has a separate guided prompt to enable wind after the deterministic distribution is understood. Use that prompt when teaching the first stochastic transition; this planning lab assumes the user is ready to compare algorithms after the model ledger is clear.

<a id="audit"></a>

## Model and algorithm audit

Use the audit panel and numeric tables to confirm:

1. each nonterminal requested-action row has probabilities in $[0,1]$ summing to one;
2. state 15 has a zero continuation value and no policy row;
3. the old vector is frozen during each synchronous update;
4. the displayed greedy mask contains every action within the tie tolerance;
5. the reference solution has a small residual under the same model;
6. a work cap is labelled truncated rather than converged;
7. invalid discount, wind, reward, tolerance, and sweep inputs return stable messages; and
8. a Worker/Wasm retry keeps the run recoverable without a full page reload.

The reference solution is a diagnostic oracle for this finite model, not a replacement for understanding the algorithm. A small residual against an estimated or changed model would only certify that estimated model.

<a id="manual-check"></a>

## No-JavaScript manual check

If JavaScript is disabled, reproduce the baseline first sweep by setting every continuation value to zero. Ordinary self/boundary transitions contribute $-0.04$ or $-1$ according to the reward rule; entering hazard 6 or 9 contributes $-1$; entering goal 15 contributes $+1$; and the goal row remains zero. The resulting vector is the $v_1$ golden shown above.

For the next sweep, use the frozen $v_1$ in every action backup, write the maximum per nonterminal state, and keep the goal at zero. Repeat until the residual is below the chosen tolerance. Then compare your table with the static algorithm definitions above; no colour or animation is required.

<a id="questions"></a>

## Questions to carry into the trace

- Which counter is inner evaluation depth, and which is an outer policy round?
- Is the current vector an iterate of $T_*$, an evaluated policy value, or a finite-depth approximation?
- Did a policy change because a genuinely better action appeared, or only because a tie-break changed?
- What exactly became different after enabling wind: the action timing, or the outcome distribution?
- If the model were estimated from trajectories, which residual and optimality claim would need a qualifier?

<a id="read-next"></a>

## Continue

Return to [Value iteration](../learn/ch04/value-iteration), [Policy iteration](../learn/ch04/policy-iteration), and [Truncated PI](../learn/ch04/truncated-policy-iteration) while reading the trace. The [Chapter 1 transition/Markov lab](/en/labs/ch01-gridworld) remains the recommended first stop for learning why wind belongs inside the one-step distribution.
