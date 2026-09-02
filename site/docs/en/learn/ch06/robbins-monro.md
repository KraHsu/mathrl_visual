---
id: ch06-robbins-monro
translation_key: ch06-robbins-monro
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Robbins–Monro: finding a root through noisy observations"
description: Formulate a black-box root problem, follow the Robbins–Monro update, and make its step-size assumptions testable.
outline: deep
---

# Robbins–Monro: finding a root through noisy observations

Suppose the useful function is hidden behind an experiment. You choose an input $w$, receive a noisy measurement, and want to find the input where the underlying response is zero. Robbins–Monro (RM) turns that black-box interaction into an incremental update.

::: info Original companion note
The residual examples, trace, and diagnostics below are original. They introduce the upstream RM topic without reproducing its prose, theorem layout, figures, or numerical examples.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. separate an unknown mean response from its observation noise;
2. write and interpret the RM recursion;
3. explain why the sign of a residual moves an estimate toward a root;
4. check the two classic sums required of a diminishing step-size sequence; and
5. recognize mean estimation as a special RM problem.

<a id="black-box"></a>

## The black-box root problem

Let $g:\mathbb R\to\mathbb R$ be an unknown response and suppose the desired solution $w^*$ satisfies

$$
g(w^*)=0.
$$

At a query $w_k$, the experiment returns

$$
\widetilde g(w_k,\eta_k)=g(w_k)+\eta_k,
$$

where $\eta_k$ is measurement noise. The learner sees $w_k$ and $\widetilde g_k$; it need not know a closed form for $g$ or its derivative. A useful mental model is a sensor whose reading is positive on one side of the target and negative on the other.

<a id="update"></a>

## The Robbins–Monro update

The recursion is

$$
w_{k+1}=w_k-a_k\widetilde g(w_k,\eta_k),
\qquad a_k>0.
$$

The step is a correction, not a replacement. A large residual causes a larger move early in the run; a small step prevents a single noisy reading from dominating late in the run. The update requires only an input, an observed residual, and a schedule.

<a id="sign"></a>

## Read the sign before reading the curve

Take the simple response $g(w)=w-10$, start at $w_1=20$, use $a_k=0.5$, and set noise to zero. The residual is positive, so the subtraction moves left:

| $k$ | $w_k$ | $g(w_k)$ | $w_{k+1}$ |
| ---: | ---: | ---: | ---: |
| 1 | 20.000 | 10.000 | 15.000 |
| 2 | 15.000 | 5.000 | 12.500 |
| 3 | 12.500 | 2.500 | 11.250 |
| 4 | 11.250 | 1.250 | 10.625 |

If $w_k<10$, the residual is negative and the same subtraction moves right. With noise, the sign can be wrong on an individual step; the hope is that unbiased disturbances cancel while the step size shrinks.

<a id="step-conditions"></a>

## Why two step-size sums appear

The classic RM conditions are

$$
\sum_{k=1}^{\infty}a_k=\infty,
\qquad
\sum_{k=1}^{\infty}a_k^2<\infty.
$$

They express two opposing requirements:

- the first sum must diverge so an estimate that starts far away can accumulate enough total movement;
- the squared sum must converge so the total influence of finite-variance noise remains controlled.

The harmonic choice $a_k=1/k$ satisfies both. A constant step keeps adapting but fails the squared-sum condition, so its stationary behavior is usually a noisy neighborhood rather than exact convergence. A schedule that decays too quickly can freeze before reaching the root. The lab reports finite-prefix sums; those values are diagnostics, not infinite-series proofs.

<a id="convergence-lens"></a>

## What a convergence statement needs

A standard scalar theorem adds assumptions such as:

1. $g$ is monotone near the solution and its slope is bounded above and away from zero;
2. the two step-size sums above hold;
3. the conditional noise has zero mean and bounded second moment.

Under such conditions, an infinite RM sequence can converge to the root with probability one. “Almost surely” does not mean every finite trace is monotone, nor does it guarantee a run whose noise is biased, whose function has multiple roots, or whose steps are clipped unexpectedly.

<a id="mean-special-case"></a>

## Mean estimation is an RM instance

To estimate $\mathbb E[X]$, define

$$
g(w)=w-\mathbb E[X],
\qquad
\widetilde g(w,x)=w-x.
$$

The RM update becomes

$$
w_{k+1}=w_k-a_k(w_k-x_{k+1})
       =w_k+a_k(x_{k+1}-w_k),
$$

which is exactly the general online mean update. The unknown expectation appears only in the unobserved function; the sample supplies the noisy residual.

<a id="lab-audit"></a>

## Use the lab as an assumption audit

In the [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation), compare a linear root with zero noise, then add symmetric noise and finally a constant step. For each run record:

| Field | Question |
| --- | --- |
| residual | does its sign point toward the target? |
| step | is the applied $a_k$ the configured one? |
| noise | is the disturbance centered over the observed prefix? |
| $\sum a_k$, $\sum a_k^2$ | which long-run condition is being approximated? |
| stopping flag | did the run terminate by tolerance, budget, or overflow? |

Changing the seed should change the noisy path, not the stated update rule.

<a id="check-yourself"></a>

## Check yourself

If the observed residual is $-4$ and $a_k=0.1$, the update increment is $-a_k(-4)=+0.4$. A root-finder that moves to $w_k-0.4$ has reversed the sign. If the residual is measured with a different convention, document that convention instead of silently changing the formula.

<a id="read-next"></a>

## Continue

[Dvoretzky convergence](./dvoretzky) supplies a reusable error-process argument for why a shrinking correction can overcome noise. The proof is optional on a first pass; the conditions and the error decomposition are the parts needed for later RL algorithms.
