---
id: ch03-optimal-values
translation_key: ch03-optimal-values
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_sections: "3.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Optimal state and action values
description: Define optimal values as state-wise policy maxima, separate value uniqueness from policy uniqueness, and state when stationary deterministic optima exist.
outline: deep
---

# Optimal state and action values

Improvement compares a new policy with one reference policy. Optimality makes a stronger comparison: a policy must attain the greatest achievable expected return from every state.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. define $v_*$ and $q_*$ as optimizations over policies;
2. compare policies using state-wise value dominance;
3. distinguish uniqueness of an optimal value from uniqueness of an optimal policy; and
4. state the finite discounted conditions supporting a stationary deterministic optimal policy.

<a id="definitions"></a>

## Optimize the continuation policy

Let $\Pi$ be the admissible policy class. The optimal state-value function is

$$
v_*(s)=\sup_{\pi\in\Pi}v_\pi(s).
$$

In the finite discounted model used in this chapter, the supremum is attained, so it may be read as a maximum. Writing $\sup$ first keeps the definition meaningful in broader spaces where a best policy may not exist.

The optimal action-value function fixes the first state and action, then optimizes later behavior:

$$
q_*(s,a)
=\sup_\pi
\mathbb E\!\left[G_t
\mid S_t=s,A_t=a,
\text{then follow }\pi\right].
$$

The two functions are connected by

$$
v_*(s)=\max_a q_*(s,a)
$$

when the action set is finite. The maximizing action can depend on $s$; “optimal” does not mean choosing one globally best action label.

<a id="policy-order"></a>

## Policy quality is a state-wise dominance preorder

Define

$$
\pi\succeq\mu
\quad\Longleftrightarrow\quad
v_\pi(s)\geq v_\mu(s)
\text{ for every }s.
$$

This is generally a **preorder** on policies: it is reflexive and transitive, but two distinct policies can induce the same value function and therefore dominate each other. After policies with identical values are treated as equivalent, the induced relation is a partial order. One policy can also be better from state $x$ while another is better from state $y$, so neither dominates the other. An optimal policy $\pi_*$ is special because

$$
v_{\pi_*}(s)=v_*(s)
\quad\text{for every }s,
$$

and therefore it dominates every admissible policy simultaneously.

The definition is stronger than “best from the start state.” Restricting attention to one initial distribution can hide poor choices in states that distribution never reaches. Dynamic programming typically seeks a policy that is optimal from all states, making subproblems reusable.

<a id="existence-questions"></a>

## What is unique, and what is guaranteed to exist?

For finite state and action sets, bounded rewards, and $0\leq\gamma<1$:

- the Bellman optimality operator has one unique fixed point;
- that fixed point is $v_*$;
- at least one stationary deterministic policy is greedy with respect to $v_*$; and
- every such greedy policy is optimal.

“Stationary” means the action distribution depends on the current state, not on time. “Deterministic” means it selects one action with probability one at each state.

The value can be unique while policies are not. If two actions have the same optimal action value at a state, either deterministic choice is optimal there, and so is any random mixture supported on those tied actions. All those policies induce the same $v_*$.

Outside the stated assumptions, existence needs care. Infinite action spaces may have a supremum that no action attains; unbounded rewards may make returns undefined; and $\gamma=1$ removes the contraction guarantee. Those cases are not disproved by this chapter—they simply require additional conditions.

<a id="optimal-action-values"></a>

## One-step expression for $q_*$

Once $v_*$ is known, the optimal continuation after the first transition gives

$$
q_*(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_*(s')\right].
$$

This formula uses a joint distribution, so no independence between reward and next state is assumed. It also distinguishes two choices:

1. $a$ is held fixed for the first action;
2. all future actions are chosen optimally and are summarized by $v_*(s')$.

In the queue model, the optimal values are $v_*(Q)=3$, $v_*(R)=4$, and $v_*(T)=0$. Hence

$$
q_*(Q)=\left(0.5,3,2\right),
\qquad
q_*(R)=\left(1.5,0,4\right),
$$

in the action orders shown on the policy-improvement page. The maxima recover “forward” at $Q$ and “submit” at $R$.

<a id="self-check"></a>

## Self-check

Mark each statement true or false.

1. If $v_*$ is unique, exactly one optimal policy must exist.
2. A policy that is best only from one designated start state necessarily attains $v_*$ everywhere.
3. With finite actions, $v_*(s)=\max_a q_*(s,a)$.
4. In $q_*(s,a)$, the first action and every later action are forced to equal $a$.

::: details Check your answer
The statements are false, false, true, and false. Tied maximizing actions can produce multiple optimal policies. Start-distribution optimality is weaker than state-wise optimality. The maximum relation holds for finite actions. Only the first action is fixed in $q_*(s,a)$; later behavior is optimal.
:::

<a id="chapter-links"></a>

## Continue through Chapter 3

Next, turn the one-step action expression into the [Bellman optimality equation](./optimality-equation), or inspect optimal action values in the [Grid World lab](/en/labs/bellman-optimality-grid).

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
