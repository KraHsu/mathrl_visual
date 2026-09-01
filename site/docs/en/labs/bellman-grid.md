---
id: exp-ch02-bellman-grid
translation_key: exp-ch02-bellman-grid
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_sections: "2.3-2.8"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Bellman policy-evaluation lab
description: Inspect synchronous Bellman sweeps, value propagation, and residual convergence in an original four-state model.
aside: false
outline: deep
---

# Bellman policy-evaluation lab

This experiment evaluates one fixed policy in a small, fully inspectable model. Rust/Wasm performs the numeric work in a browser Worker; Vue presents the same state in a value grid, update breakdown, transition table, and residual history.

::: warning Pilot model
This four-state model isolates Bellman mechanics for inspection. It is not yet the cross-chapter Bellman view derived from the shared 4×4 Grid World described in the project plan.
:::

<BellmanLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the model, Bellman equations, first sweep, and manual observation procedure remain available in the text below.
</noscript>

<a id="model"></a>

## The original four-state model

The lab uses an independently designed policy-induced Markov reward process rather than a diagram or example from the book:

- $s_0$ is a branch that leads with equal probability to route state $s_1$ or $s_2$;
- $s_1$ is the more reliable route toward completion but can return to $s_0$;
- $s_2$ is the less reliable route toward completion and can also return to $s_0$; and
- $s_3$ is a zero-reward absorbing terminal state.

All exact next-state probabilities and rewards are exposed in the **Dependencies** view's numeric transition table. The table is the data source for the visual edges; line width or position never has to be interpreted as a probability.

The action-selection details have already been averaged under one fixed policy, so the lab works with $P_\pi$ and $r_\pi$ directly. It does not select actions, improve the policy, use a greedy rule, or perform value iteration.

<a id="controls"></a>

## Parameters and controls

The default configuration is

$$
\gamma=0.9,
\qquad
\varepsilon=10^{-3},
\qquad
K_{\max}=200.
$$

- **Discount factor $\gamma$:** accepts $0\leq\gamma<1$ and controls the weight of successor values.
- **Tolerance $\varepsilon$:** accepts $0<\varepsilon\leq1$ and defines when the current residual counts as converged.
- **Maximum sweeps $K_{\max}$:** accepts an integer from $1$ to $10{,}000$ and caps work without pretending truncation is convergence.
- **One sweep:** computes one update from a frozen copy of the current value vector.
- **Run to tolerance:** repeats that same sweep path until convergence or the sweep cap.
- **Reset:** returns all four values and the sweep counter to zero while keeping the applied configuration.

Changing language preserves the applied configuration and completed sweep count. All experiment state remains local to the browser.

<a id="synchronous-sweep"></a>

## Read a synchronous sweep

Every state update in sweep $k+1$ reads the same old vector $v_k$:

$$
v_{k+1}(s)
=\sum_{s'}P_\pi(s,s')
\left[r(s,s')+\gamma v_k(s')\right].
$$

The update breakdown shows each transition as four auditable fields: probability, immediate reward, old successor value, and weighted contribution. Only after all four new state values are calculated does the engine commit the vector.

Starting from $v_0=(0,0,0,0)^\mathsf T$ with $\gamma=0.9$, the first sweep must produce

$$
v_1=(-0.10,\ 0.78,\ 0.56,\ 0)^\mathsf T.
$$

Because every successor value in $v_0$ is zero, this first vector contains only expected immediate rewards. Continuation values begin propagating through the graph in the second sweep.

<a id="residual"></a>

## Read the residual, not just the colors

The displayed Bellman residual is always computed for the **current** vector:

$$
\delta_k
=\lVert T_\pi v_k-v_k\rVert_\infty.
$$

It is the largest absolute inconsistency across all states. For the default model, the initial residual is $0.78$; after the first sweep, the residual is $0.603$. The latter is not merely the largest update that produced $v_1$: it asks what another full Bellman application would change from $v_1$.

At the default discount, the exact linear-system reference is approximately

$$
v_\pi=(0.664465,\ 0.899604,\ 0.799207,\ 0)^\mathsf T.
$$

The reference is a verification aid. The learning target is to explain how the terms and residual approach it, not merely to copy its digits.

<a id="tasks"></a>

## Observation tasks

### Task A: explain the first sweep

Keep the defaults, reset, and perform one sweep. For each state, explain why successor values contribute zero and reconstruct the four displayed results from the transition table's probabilities and rewards.

### Task B: audit one branch

Select $s_0$ in the update breakdown after the second sweep. Add its two weighted contributions by hand. Confirm that both use $v_1$, even though the interface also displays the newly committed $v_2$.

### Task C: distinguish update size from current residual

Choose one state and record its absolute change from the latest Rust update event, then record the residual shown after the commit. Explain why the state-local update and the global current-vector residual are different quantities and need not match.

### Task D: change only the discount

Compare $\gamma=0$, $0.5$, and $0.9$. At zero, one sweep already equals the expected immediate reward vector. As $\gamma$ increases, explain why route returns matter more and why convergence can take more sweeps.

### Task E: test honest truncation

Choose a strict tolerance and a maximum of one sweep. Run to the limit and confirm that the interface reports truncation unless the residual actually satisfies the tolerance.

### Task F: verify the fixed point two ways

Run to tolerance, compare the iterated values with the exact reference, and inspect the final residual. Explain why agreement between a linear solve and Bellman sweeps checks the implementation without changing the evaluated policy.

<a id="no-javascript"></a>

## Readable path without JavaScript

If the interactive component is unavailable, the complete Bellman operator can still be reconstructed from these original model equations:

$$
\begin{aligned}
(T_\pi v)(s_0)
&=0.5[-0.1+\gamma v(s_1)]
 +0.5[-0.1+\gamma v(s_2)],\\
(T_\pi v)(s_1)
&=0.2[-0.1+\gamma v(s_0)]
 +0.8[1+\gamma v(s_3)],\\
(T_\pi v)(s_2)
&=0.4[-0.1+\gamma v(s_0)]
 +0.6[1+\gamma v(s_3)],\\
(T_\pi v)(s_3)
&=1[0+\gamma v(s_3)].
\end{aligned}
$$

Start with four zeros, evaluate every right-hand side without changing the old vector, and then replace all four entries at once. Repeat to simulate synchronous sweeps on paper. After any vector $v$, evaluate the right-hand sides once more and take the largest $|(T_\pi v)(s)-v(s)|$ to obtain the residual.

This text path preserves the model, algorithm, expected first result, and convergence criterion. What it omits is only the live controls and visual trace.

<a id="chapter-links"></a>

## Connect the experiment to the chapter

Use [State values](/en/learn/ch02/state-values) for the expectation being computed, [The Bellman equation](/en/learn/ch02/bellman-equation) for the one-step expansion, [Matrix form](/en/learn/ch02/matrix-form) for the exact reference, and [Policy evaluation](/en/learn/ch02/policy-evaluation) for the sweep and residual guarantees.

Chapter 2 pilot pages: [Overview](/en/learn/ch02/) · [State values](/en/learn/ch02/state-values) · [Bellman equation](/en/learn/ch02/bellman-equation) · [Matrix form](/en/learn/ch02/matrix-form) · [Policy evaluation](/en/learn/ch02/policy-evaluation) · [Action values](/en/learn/ch02/action-values) · [Checkpoint](/en/learn/ch02/checkpoint) · [Lab](/en/labs/bellman-grid)
