---
id: ch02-policy-evaluation
translation_key: ch02-policy-evaluation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Iterative policy evaluation
description: Apply synchronous Bellman sweeps to a fixed policy and measure convergence with the Bellman residual.
outline: deep
---

# Iterative policy evaluation

A closed-form expression identifies the solution, but repeated Bellman sweeps make the fixed-point process visible. Begin with any finite value vector, apply the same fixed-policy Bellman operator to every state, and monitor how far the current vector is from self-consistency.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. perform one synchronous Bellman sweep;
2. explain why every update in that sweep reads the same old vector;
3. calculate and interpret the infinity-norm (maximum-norm) Bellman residual; and
4. state the discounted convergence guarantee without calling the method value iteration.

<a id="bellman-operator"></a>

## Iterate one fixed operator

For a fixed policy, define

$$
T_\pi v=r_\pi+\gamma P_\pi v.
$$

Iterative policy evaluation applies

$$
v_{k+1}=T_\pi v_k.
$$

The policy, transition matrix, reward vector, and discount factor stay fixed. Only the value estimate changes. A common initialization is $v_0=0$, but convergence for a finite discounted model does not require that particular start.

<a id="synchronous-sweep"></a>

## A synchronous sweep uses one frozen input

Suppose the old vector is $v_k$. A synchronous sweep follows this data flow:

```text
freeze old = v_k
for every state s:
    next[s] = r_π(s) + γ Σ_s' P_π(s,s') old[s']
commit v_{k+1} = next
```

No update for state $s_i$ may read `next[s_j]` from the same sweep. All states read `old`, and the new vector is committed only after every row is complete.

Reading freshly updated entries immediately is an in-place or asynchronous scheme. Such schemes can also be useful, but their intermediate values and traces differ. An interface labeled “synchronous sweep” must preserve the frozen-vector rule.

<a id="worked-sweeps"></a>

## Three sweeps of the original matrix example

Use the matrix and rewards from [Matrix form](./matrix-form), start with $v_0=(0,0,0)^\mathsf T$, and keep $\gamma=0.8$:

| $k$ | $v_k(a)$ | $v_k(b)$ | $v_k(z)$ |
| ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 |
| 1 | 0.8 | 1.5 | 0 |
| 2 | 1.52 | 2.10 | 0 |
| 3 | 1.808 | 2.34 | 0 |

The first sweep contains only expected immediate rewards because all old successor values are zero. Later sweeps propagate continuation value through the fixed transition graph. The sequence approaches $(2,2.5,0)^\mathsf T$.

<a id="bellman-residual"></a>

## Residual measures self-consistency

For a current estimate $v$, define the Bellman residual used in this chapter as

$$
\delta(v)
=\lVert T_\pi v-v\rVert_\infty
=\max_s\left|(T_\pi v)(s)-v(s)\right|.
$$

The residual asks: if we performed one more exact Bellman sweep, what is the largest state update? It is zero exactly at the fixed point, apart from floating-point rounding.

Be precise about when it is measured. After committing $v_{k+1}$, the lab displays $\delta(v_{k+1})$, which requires evaluating $T_\pi v_{k+1}$ conceptually. That is not necessarily the same number as the largest change made while producing $v_{k+1}$.

For $0\leq\gamma<1$, the residual also yields an error bound:

$$
\lVert v-v_\pi\rVert_\infty
\leq \frac{\delta(v)}{1-\gamma}.
$$

A tolerance is therefore a stopping rule for self-consistency, not a promise that every displayed digit equals the exact solution.

<a id="why-converges"></a>

## Why discounted sweeps converge

Because $P_\pi$ averages vector entries,

$$
\lVert P_\pi x-P_\pi y\rVert_\infty
\leq\lVert x-y\rVert_\infty.
$$

Multiplication by $\gamma<1$ gives

$$
\lVert T_\pi x-T_\pi y\rVert_\infty
\leq\gamma\lVert x-y\rVert_\infty.
$$

Thus $T_\pi$ is a contraction in the infinity norm: after one application, the distance between two estimates is at most $\gamma$ times its previous value. It has one fixed point, and repeated synchronous application converges to it.

At $\gamma=1$, this contraction proof no longer applies. Convergence requires stronger assumptions—for example, transient nonterminal dynamics under a proper policy, with terminal values fixed at zero. The Chapter 2 lab intentionally restricts $\gamma$ to $[0,1)$.

<a id="stopping-rules"></a>

## Converged, truncated, or still running

An implementation should report these cases separately:

- **converged:** the current Bellman residual is at or below the requested tolerance;
- **truncated:** the maximum sweep count was reached before convergence; and
- **in progress:** neither condition holds.

Truncation is not convergence. It provides a finite work limit while preserving an honest residual that shows what remains.

<a id="scope-check"></a>

## Keep the algorithm name honest

This unit evaluates one supplied policy. There is no maximization, no greedy action choice, and no policy update. Therefore the loop is **iterative policy evaluation** or **fixed-point iteration**. Value iteration is a different algorithm that uses an optimality operator and is outside Chapter 2.

<a id="self-check"></a>

## Self-check

1. During one synchronous sweep, may the update for $s_2$ read the newly calculated $v(s_1)$?
2. If the current vector has residual $0.004$ and tolerance $0.001$, is it converged?
3. If execution stops only because the sweep limit was reached, what status should be reported?

::: details Check your answers
1. No. Every row reads the frozen vector from before the sweep.
2. No. One more Bellman application would still change at least one state by more than the tolerance.
3. Truncated, not converged; the residual should remain visible.
:::

<a id="chapter-links"></a>

## Continue through Chapter 2

Run the process in the [Bellman policy-evaluation lab](/en/labs/bellman-grid), then continue to [Action values](./action-values).

Chapter 2 pilot pages: [Overview](/en/learn/ch02/) · [State values](/en/learn/ch02/state-values) · [Bellman equation](/en/learn/ch02/bellman-equation) · [Matrix form](/en/learn/ch02/matrix-form) · [Policy evaluation](/en/learn/ch02/policy-evaluation) · [Action values](/en/learn/ch02/action-values) · [Checkpoint](/en/learn/ch02/checkpoint) · [Lab](/en/labs/bellman-grid)
