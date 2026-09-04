---
id: ch03-optimality-equation
translation_key: ch03-optimality-equation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.3-3.3.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: The Bellman optimality equation
description: Build the optimality operator from action backups, justify deterministic maximizers, and understand its piecewise-affine nonlinearity.
outline: deep
---

# The Bellman optimality equation

An optimal decision must be consistent with optimal decisions after every possible first transition. That self-consistency is expressed by a maximizing Bellman backup.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. compute and compare every action backup at a state;
2. write the Bellman optimality equation in scalar and vector forms;
3. explain why maximizing over a probability distribution admits a deterministic maximizer; and
4. explain why the optimality equation is generally not one linear system.

<a id="action-backup"></a>

## Audit one action before taking a maximum

For any candidate value function $v$, define

$$
B_v(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v(s')\right].
$$

This is an expected one-step return: take action $a$ now, then use $v$ to summarize the continuation. It is not yet optimal because $v$ may be only an estimate and no action comparison has occurred.

A trustworthy numeric view exposes, for every outcome, its probability, reward, successor value, and weighted contribution. Only after each $B_v(s,a)$ is complete should the largest action backup be selected. This ordering prevents a common mistake: maximizing separately inside each stochastic outcome would allow the agent to choose an action after seeing hidden randomness.

<a id="optimality-operator"></a>

## Maximize the complete action backups

The Bellman optimality operator is

$$
\boxed{
(T_*v)(s)
=\max_a\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v(s')\right]
}
$$

and the Bellman optimality equation is

$$
\boxed{v_*=T_*v_*}.
$$

Equivalently,

$$
v_*(s)=\max_a q_*(s,a).
$$

The maximum is outside the sum over environment outcomes. An action must be selected before the next state and reward are revealed.

For comparison, fixed-policy evaluation uses

$$
(T_\pi v)(s)=\sum_a\pi(a\mid s)B_v(s,a).
$$

Thus $T_\pi$ averages action backups using supplied probabilities, while $T_*$ chooses their maximum independently at each state.

<a id="why-deterministic"></a>

## Why an action distribution cannot beat its best action

Suppose a policy row $\mu(\cdot\mid s)$ may be any point in the probability simplex. For fixed $v$,

$$
\sum_a\mu(a\mid s)B_v(s,a)
\leq
\max_a B_v(s,a)
\sum_a\mu(a\mid s)
=\max_a B_v(s,a).
$$

Equality is reached by assigning probability one to a maximizing action. Geometrically, the objective is linear in the policy probabilities, so a maximum over the finite simplex occurs at an extreme point. If several actions tie, any distribution supported on their face also attains the maximum.

This does not claim that stochastic policies are never useful in reinforcement learning. It states a specific result for expected discounted return in a fully observed finite MDP without additional constraints such as entropy bonuses, risk limits, or partial observability.

<a id="matrix-view"></a>

## A stack of affine action models

For each action $a$, collect its expected reward vector $r_a$ and transition matrix $P_a$. Its all-state backup is

$$
b_a(v)=r_a+\gamma P_av.
$$

The optimality operator takes a component-wise maximum:

$$
T_*v
=\max_a^{\text{component-wise}}
\left(r_a+\gamma P_av\right).
$$

At one state, “right” may supply the maximum; at another, “down” may. A useful audit table therefore has one row per state-action pair, not merely one global row per action.

Once a particular greedy action is fixed at each state, those selected rows form a policy-specific vector $r_\pi$ and matrix $P_\pi$. But the selected rows can change as $v$ changes, so they cannot be assumed in advance when solving the optimality equation.

<a id="nonlinearity"></a>

## Why Chapter 2's matrix inverse does not transfer directly

Every $b_a(v)$ is affine, but a maximum of affine functions is generally piecewise affine rather than affine. In particular, usually

$$
T_*(\lambda u+(1-\lambda)v)
\neq
\lambda T_*u+(1-\lambda)T_*v.
$$

For a fixed policy, Chapter 2 could rearrange

$$
v_\pi=r_\pi+\gamma P_\pi v_\pi
$$

into one linear system. In $v_*=T_*v_*$, the effective policy is itself determined by which expressions are largest at the unknown solution. One may verify a proposed greedy policy by solving its linear equations and checking all action inequalities, but there is no single preselected matrix inverse that automatically performs the maximization.

<a id="worked-sweep"></a>

## Original queue sweep

For the queue model with $\gamma=0.5$, write $v=(v_Q,v_R)$ and terminal value zero. The operator is

$$
\begin{aligned}
(T_*v)(Q)
&=\max\{-1+0.5v_Q,\ 1+0.5v_R,\ 2\},\\
(T_*v)(R)
&=\max\{0.5v_Q,\ -2+0.5v_R,\ 4\}.
\end{aligned}
$$

Starting from $v^{(0)}=(0,0)$,

$$
v^{(1)}=T_*v^{(0)}=(2,4).
$$

The maximizing actions are inspect and submit. Apply the operator again:

$$
v^{(2)}=T_*v^{(1)}=(3,4),
$$

because forwarding now has backup $1+0.5(4)=3$. A third application leaves $(3,4)$ unchanged, so it satisfies the optimality equation.

<a id="self-check"></a>

## Self-check

At a state $x$, three complete action backups under the same candidate vector are $1.2$, $0.7$, and $1.2$.

1. What is $(T_*v)(x)$?
2. Which deterministic greedy choices exist?
3. Which stochastic policy rows attain the same backup?
4. Why would taking a maximum separately for each successor outcome be invalid?

::: details Check your answer
The optimality backup is $1.2$. Either the first or third action is deterministic greedy. Any distribution supported only on those two actions also attains $1.2$. Outcome-wise maximization would condition the action on randomness revealed only after the action must already have been selected.
:::

<a id="chapter-links"></a>

## Continue through Chapter 3

Next, prove that this nonlinear operator still has a unique fixed point in [Contraction and fixed points](./contraction), or audit the action rows in the [Grid World lab](/en/labs/bellman-optimality-grid).

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
