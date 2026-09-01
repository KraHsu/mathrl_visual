---
id: ch03-greedy-policies
translation_key: ch03-greedy-policies
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_sections: "3.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Recovering optimal policies
description: Convert an optimal value into greedy action choices, prove their optimality, and handle tied deterministic and stochastic policies correctly.
outline: deep
---

# Recovering optimal policies

An optimal value answers “how much,” but acting requires “which action.” The one-step model converts $v_*$ into $q_*$, and the maximizing action set converts those numbers into optimal policies.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. compute $q_*(s,a)$ from $v_*$ and the environment model;
2. construct deterministic and stochastic policies from maximizing action sets;
3. prove that a policy greedy with respect to $v_*$ is optimal; and
4. explain why ties make policies non-unique without making $v_*$ non-unique.

<a id="recover-policy"></a>

## Compute action values, then take an argmax

Given $v_*$, calculate

$$
q_*(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_*(s')\right].
$$

For each nonterminal decision state, define the maximizing set

$$
\mathcal A_*(s)=\arg\max_a q_*(s,a).
$$

A deterministic greedy policy selects any member:

$$
\pi_*(s)\in\mathcal A_*(s).
$$

For a stochastic policy, the exact condition is

$$
\pi_*(a\mid s)>0
\Longrightarrow
a\in\mathcal A_*(s).
$$

Giving even a small positive probability to a strictly suboptimal action lowers the policy-weighted backup at that state.

Each such action set is finite and nonempty, so its maximizing set is nonempty. The terminating goal has no later decision row: its continuation value is fixed at zero, and no policy distribution needs to be constructed there.

<a id="optimality-proof"></a>

## Why greediness with respect to $v_*$ is sufficient

Let $\pi_g$ assign probability only to actions in $\mathcal A_*(s)$. At every nonterminal decision state,

$$
\begin{aligned}
(T_{\pi_g}v_*)(s)
&=\sum_a\pi_g(a\mid s)q_*(s,a)\\
&=\max_a q_*(s,a)\\
&=(T_*v_*)(s)\\
&=v_*(s).
\end{aligned}
$$

Thus $v_*$ is a fixed point of the fixed-policy operator $T_{\pi_g}$. That operator is also a $\gamma$-contraction for $\gamma<1$, so it has a unique fixed point—its policy value $v_{\pi_g}$. Consequently,

$$
v_{\pi_g}=v_*,
$$

which proves that $\pi_g$ is optimal.

Notice what the proof does not say: a policy greedy with respect to an arbitrary approximation $v$ must be optimal. The exact conclusion depends on the equality $v=v_*$.

<a id="ties"></a>

## Treat ties as sets, not as rounding accidents

If

$$
q_*(s,a_1)=q_*(s,a_2)=v_*(s),
$$

then both actions are optimal at $s$. The following are all optimal locally:

- select $a_1$ deterministically;
- select $a_2$ deterministically; or
- choose any mixture $\lambda a_1+(1-\lambda)a_2$ in probability, $0\leq\lambda\leq1$.

An implementation should expose the complete maximizing set using a declared numeric tolerance. Silently choosing the first array entry makes a deterministic policy, but it can hide genuine policy non-uniqueness. Conversely, too loose a tolerance can label a genuinely worse action as tied. A numeric table should accompany arrows or colors so the decision can be audited.

<a id="queue-solution"></a>

## Recover the queue policy

For the original queue,

$$
v_*=(3,4)
$$

over $(Q,R)$. The optimal action values are

| State | Action values in table order | Maximizer |
| --- | --- | --- |
| $Q$ | hold $=0.5$, forward $=3$, inspect $=2$ | forward |
| $R$ | return $=1.5$, recheck $=0$, submit $=4$ | submit |

The recovered policy therefore forwards at $Q$ and submits at $R$. Verify its value directly:

$$
v(Q)=1+0.5v(R),
\qquad
v(R)=4,
$$

so $(v(Q),v(R))=(3,4)=v_*$. Then compare every unselected action with the selected backup to complete the optimality audit.

If the immediate inspect reward is changed from $2$ to $3$, forward and inspect tie at $Q$ while $v_*=(3,4)$ remains unchanged. Both deterministic policies—and every mixture between those two actions at $Q$—are optimal. This is a concrete example of one value function supporting many policies.

<a id="chapter-four-boundary"></a>

## What Chapter 4 adds

This page assumes $v_*$ is already available, then recovers a policy. A planning method must obtain an adequate approximation, decide when it is adequate, handle synchronous or asynchronous updates, and account for computation. Those are algorithmic questions.

The [Chapter 4 planning section](../ch04/) compares value iteration and policy iteration as complete procedures. Repeated $T_*$ sweeps shown in this chapter support the fixed-point argument; they are not themselves the full algorithm lesson or an efficiency claim.

<a id="self-check"></a>

## Self-check

At state $s$, suppose an accurate calculation gives

$$
q_*(s,\cdot)=(2.0000000,1.9999999,1.4).
$$

1. What additional information is needed before declaring the first two actions tied?
2. If they are genuinely tied, may an optimal policy put probability $0.1$ on the third action?
3. What equality should be checked after constructing a greedy policy from $v_*$?

::: details Check your answer
The numeric tolerance and an error bound for the computed values are needed; displayed rounding alone cannot prove a tie. A genuinely suboptimal third action must receive probability zero. Check $T_{\pi_g}v_*=T_*v_*=v_*$, or equivalently evaluate the recovered policy and verify $v_{\pi_g}=v_*$.
:::

<a id="chapter-links"></a>

## Continue through Chapter 3

Next, study how the answer changes when the [discount, rewards, or dynamics](./factors) change, or inspect tied arrows and numeric backups in the [Grid World lab](/en/labs/bellman-optimality-grid).

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
