---
id: exp-ch03-optimality-grid
translation_key: exp-ch03-optimality-grid
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_sections: "3.1-3.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Bellman optimality Grid World lab
description: Audit action backups, greedy ties, optimal-value propagation, contraction, and model sensitivity in the shared Rust/Wasm 4×4 Grid World.
aside: false
outline: deep
---

# Bellman optimality Grid World lab

This experiment applies the Bellman optimality operator to the same 4×4 environment used in Chapter 1. Rust/Wasm derives every transition row from the shared Grid World model; a browser Worker performs the numeric sweeps; the interface exposes values, action backups, greedy actions, residuals, and model audits.

<OptimalityLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the complete default model, operator, first sweep, converged golden values, and paper-based audit procedure remain available below.
</noscript>

<a id="experiment"></a>

## What this experiment isolates

The lab asks one mathematical question:

$$
\text{How does }T_*\text{ transform the current 16-state value vector?}
$$

It does not sample trajectories, estimate unknown dynamics, or train from experience. It uses the complete model already exposed in Chapter 1. Repeated sweeps let you observe a contraction and fixed point; Chapter 4 will present complete planning algorithms and compare their procedures.

<a id="model"></a>

## Shared 4×4 model

The fixed world geometry is:

- states $s_0$ through $s_{15}$ in row-major order;
- start marker $s_0$ and terminating goal $s_{15}$;
- hazard-entry states $s_6$ and $s_9$;
- actions up, right, down, left, and stay;
- ordinary reward $-0.04$, boundary collision $-1$, hazard entry $-1$, and goal entry $+1$;
- default discount $\gamma=0.9$ and wind probability $w=0$; and
- terminal continuation value $v(s_{15})=0$.

Hazards do not terminate the episode. Their $-1$ reward applies when a transition enters them. Boundary collisions remain in the same cell and receive the boundary reward. “Stay” is a deterministic self-loop with the ordinary reward. These rules come from the same language-neutral transition query as the Chapter 1 experiment; the optimality engine does not maintain a second environment model.

With cardinal wind probability $w$, the requested direction occurs with probability $1-3w/4$, while each other cardinal direction occurs with probability $w/4$. At $w=0.2$, these probabilities are $0.85$ and $0.05$ respectively.

<a id="operator"></a>

## Read one maximizing backup

For every nonterminal state and requested action, the engine calculates

$$
q_v(s,a)=\sum_{s',r}p(s',r\mid s,a)
[r+\gamma v(s')],
$$

then commits

$$
(T_*v)(s)=\max_a q_v(s,a).
$$

The goal row is fixed at zero with no greedy action. A synchronous sweep freezes all 16 old values, computes all five action values at every nonterminal state, records every maximizing action in a bit mask, and only then commits the new vector.

When wind is active, first add all stochastic outcome contributions within one action. Taking the best successor outcome would be invalid because the requested action is chosen before wind reveals the actual direction.

<a id="first-sweep"></a>

## First-sweep golden result

Reset to $v^{(0)}=\mathbf0$ with the defaults. Continuation terms vanish, so the first image reflects the best expected immediate reward. In row-major grid form,

$$
v^{(1)}=
\begin{bmatrix}
-0.04&-0.04&-0.04&-0.04\\
-0.04&-0.04&-0.04&-0.04\\
-0.04&-0.04&-0.04&1.00\\
-0.04&-0.04&1.00&0
\end{bmatrix}.
$$

Only $s_{11}$ and $s_{14}$ can enter the goal in one action, so their best immediate backup is $1$. At $s_0$, right, down, and stay tie at $-0.04$, while up and left collide with the boundary for $-1$. The initial residual and first maximum update are both $1$; the residual of the newly committed first vector is $0.9$ because another backup can propagate the goal value one layer farther.

The second sweep provides a stronger audit:

$$
v^{(2)}=
\begin{bmatrix}
-0.076&-0.076&-0.076&-0.076\\
-0.076&-0.076&-0.076&0.86\\
-0.076&-0.076&0.86&1.00\\
-0.076&0.86&1.00&0
\end{bmatrix}.
$$

For $s_{10}$, the five action backups on that sweep are

$$
(-1.036,\ 0.86,\ 0.86,\ -1.036,\ -0.076),
$$

so right and down must both be shown as greedy.

<a id="final-golden"></a>

## Default converged golden result

With tolerance $10^{-12}$, the deterministic default reaches the exact fixed point after six synchronous sweeps. The residual history is

$$
1, 0.9, 0.81, 0.729, 0.6561, 0.59049, 0.
$$

The values, rounded to six decimals, are

$$
v_*\approx
\begin{bmatrix}
0.426686&0.518540&0.620600&0.734000\\
0.518540&0.426686&0.734000&0.860000\\
0.620600&0.734000&0.860000&1.000000\\
0.734000&0.860000&1.000000&0
\end{bmatrix}.
$$

The complete greedy sets are:

| State | Greedy action set | State | Greedy action set |
| --- | --- | --- | --- |
| $s_0$ | right, down | $s_8$ | down |
| $s_1$ | right | $s_9$ | right, down |
| $s_2$ | right | $s_{10}$ | right, down |
| $s_3$ | down | $s_{11}$ | down |
| $s_4$ | down | $s_{12}$ | right |
| $s_5$ | up, left | $s_{13}$ | right |
| $s_6$ | right, down | $s_{14}$ | right |
| $s_7$ | down | $s_{15}$ | terminal; none |

The values at $s_6$ and $s_9$ do not include a permanent hazard penalty merely because the agent starts there. The penalty was paid on entry; ordinary exit moves use the ordinary reward.

<a id="views"></a>

## Read the synchronized views

Use every view as a different projection of one Worker-owned experiment state:

| View | Evidence to inspect |
| --- | --- |
| Value map | old and current values, greedy arrows, ties, goal and hazard semantics |
| Action backups | all five $q_v(s,a)$ values and the selected state's weighted outcome rows |
| Propagation history | sweep count, current residual, maximum update, and residual trace |
| Contraction | consecutive operator images and the witnessed bound $\rho(v_k)\leq\gamma\lVert v_k-v_{k-1}\rVert_\infty$ |
| Factors | controlled edits to $\gamma$, rewards, and wind with a fresh reference |
| Audit | transition-row sums, finite values, terminal conventions, greedy masks, and reference residual |

Colors and arrow directions are summaries. The numeric table is authoritative when values are close or several actions tie.

<a id="tasks"></a>

## Core observation tasks

### Task A: reconstruct the first image

Reset, keep wind at zero, and perform one sweep. Explain every entry using only immediate rewards. For $s_0$, verify why three actions tie even though two other actions remain in the same cell after a collision.

### Task B: inspect value propagation

Advance one sweep at a time. Track the value $1$ backward from $s_{11}$ and $s_{14}$. Confirm that no state reads a value produced earlier in the same sweep.

### Task C: audit a tie

At the second sweep, select $s_{10}$. Reconstruct the displayed action values and confirm that both right and down are encoded as greedy. Change display precision if available; do not infer a tie only from rounded text.

### Task D: compare update and residual

For one committed sweep, record the maximum absolute update that produced the vector, then record the Bellman residual of the new vector. Explain why the latter requires one additional operator image and can differ from the former.

### Task E: verify the fixed point

Run to tolerance and compare all 16 values, every greedy set, the sweep count, and the final residual with the golden result above. A matching heatmap alone is insufficient.

<a id="contraction-task"></a>

## Contraction task

After a committed sweep, let

$$
d_k=\lVert v_k-v_{k-1}\rVert_\infty.
$$

Because $v_k=T_*v_{k-1}$, the current residual is the distance between two consecutive operator images:

$$
\rho(v_k)
=\lVert T_*v_k-v_k\rVert_\infty
=\lVert T_*v_k-T_*v_{k-1}\rVert_\infty
\leq\gamma d_k.
$$

Reset to the default model and perform one sweep. The maximum update is $d_1=1$ and the new residual is $0.9$, so the bound is attained. Continue one sweep at a time and verify the displayed inequality. Treat $0.9$ as an upper-bound factor, not an equality requirement. Then change $\gamma$ to $0.5$ and predict the new bound before running the witness again.

<a id="factors-task"></a>

## Discount, reward, and wind tasks

### Task F: make the agent myopic

Set $\gamma=0$. From a zero reset, one sweep is already a fixed point because continuation values have no influence. Identify all immediate-reward ties at $s_0$.

### Task G: enable guided wind

Return to $\gamma=0.9$, first inspect a no-wind action row, then enable $20\%$ wind. Confirm the requested cardinal action probability changes from $1$ to $0.85$, with $0.05$ on each other direction. Compare the windy reference values with the deterministic values; for example, the windy start value is approximately $-0.108770$ and the goal remains zero.

### Task H: distinguish reward scale from reward shift

Multiply every reward by a common positive factor and check that greedy sets are preserved while values scale. Then add a common constant under the active terminating goal mode. Do **not** predict invariance: routes with different episode lengths accumulate different numbers of shifted rewards. Use the complete numeric backups to see whether any action ranking crosses.

### Task I: change one penalty

Adjust only the hazard-entry reward. Compare states beside $s_6$ and $s_9$, and explain any detour through the changed expected outcome terms. Keep wind fixed so the reward effect is not confounded with a dynamics change.

<a id="audit"></a>

## Numeric and implementation audit

Before accepting a run, verify:

1. each nonterminal state-action transition row sums to one;
2. the terminating goal has no outgoing decision row and value zero;
3. every displayed $q_v(s,a)$ equals the sum of its weighted outcomes;
4. every greedy mask contains all and only numerically tied maxima;
5. a sweep reads one frozen old vector;
6. the displayed residual is $\lVert T_*v-v\rVert_\infty$ for the current vector;
7. convergence means residual at most the applied tolerance;
8. reaching the sweep cap without that inequality is reported as truncation; and
9. the high-precision reference itself has a negligible residual.

All configuration and experiment state stays in the browser. The Rust core is the numeric source of truth; Vue does not reimplement the Bellman equations.

<a id="accessibility"></a>

## Nonvisual and keyboard reading path

The grid must not be the only representation. Use the state selector and numeric tables to inspect values, actions, probabilities, rewards, and successor states. Greedy status must be conveyed by text as well as color or arrows. Controls need keyboard focus, labels, validation messages, and stable focus after a sweep. Status announcements should report meaningful phase changes—ready, sweep complete, converged, paused, truncated, or error—without announcing every animated cell.

When reduced motion is requested, numeric state should advance directly without requiring the user to watch a trace animation. At narrow widths, tables may scroll inside their own region while the document itself remains within the viewport.

<a id="chapter-boundary"></a>

## Chapter boundary

This lab visualizes $T_*$, its fixed point, greedy recovery, contraction, and sensitivity. Although the “run” control repeats synchronous optimality backups, Chapter 3 uses those repetitions as mathematical evidence.

Chapter 4 will name and analyze value iteration as an algorithm, introduce policy iteration, compare update schedules and stopping rules, and discuss computational tradeoffs. Do not infer from this lab alone that one planning algorithm is always faster or preferable.

<a id="chapter-links"></a>

## Connect the experiment to the chapter

Use [The optimality equation](/en/learn/ch03/optimality-equation) for each action row, [Contraction](/en/learn/ch03/contraction) for the consecutive-image witness and residual certificate, [Greedy policies](/en/learn/ch03/greedy-policies) for the arrow sets, and [Model factors](/en/learn/ch03/factors) for discount, reward, and wind interpretations.

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
