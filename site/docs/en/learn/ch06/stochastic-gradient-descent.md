---
id: ch06-stochastic-gradient-descent
translation_key: ch06-stochastic-gradient-descent
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Stochastic gradient descent: optimization with samples"
description: Connect expected objectives to noisy gradients, identify SGD as Robbins–Monro, and interpret its near-optimum randomness.
outline: deep
---

# Stochastic gradient descent: optimization with samples

Stochastic gradient descent (SGD) is often introduced as a practical optimizer, but its mathematical role here is more precise: it replaces an unavailable expected gradient with a gradient computed from one sample. That substitution turns a batch optimization problem into a stochastic approximation recursion.

::: info Original companion note
The objective examples, gradient decomposition, and diagnostics below are original explanatory material. They cover the upstream SGD topics without reproducing its prose, proofs, figures, or numerical examples.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. write an expected objective and its true gradient;
2. derive the single-sample SGD update;
3. explain why SGD is a Robbins–Monro instance;
4. understand why relative gradient noise grows near an optimum; and
5. state the assumptions that make a convergence claim meaningful.

<a id="expected-objective"></a>

## Begin with the expected objective

Let $X$ be a random input and let $f(w,X)$ be a scalar loss. The population objective is

$$
J(w)=\mathbb E[f(w,X)].
$$

When differentiation and expectation can be interchanged, its gradient is

$$
\nabla J(w)=\mathbb E[\nabla_w f(w,X)].
$$

Full gradient descent would use this expectation:

$$
w_{k+1}=w_k-a_k\,\mathbb E[\nabla_w f(w_k,X)].
$$

The expression is conceptually clean but often unavailable: the distribution of $X$ may be unknown, or evaluating the expectation may require too many samples.

<a id="stochastic-update"></a>

## Replace the true gradient with one sample

Given a fresh sample $x_{k+1}$, SGD uses

$$
w_{k+1}=w_k-a_k\nabla_w f(w_k,x_{k+1}).
$$

Decompose the observed gradient into signal and noise:

$$
\nabla_w f(w_k,x_{k+1})
=\mathbb E[\nabla_w f(w_k,X)]+\eta_k,
$$

where $\eta_k$ has conditional mean zero under an appropriate sampling protocol. SGD is therefore true gradient descent plus a perturbation $-a_k\eta_k$.

<a id="rm-connection"></a>

## SGD is a Robbins–Monro problem

Optimization can be written as root finding for the gradient:

$$
g(w)=\nabla J(w),
\qquad g(w^*)=0.
$$

The observable quantity $\nabla_w f(w,x)$ is a noisy measurement of $g(w)$. Substituting it into the RM recursion gives exactly the SGD update. This connection is useful because it transfers the step-size and noise questions from root finding to optimization without pretending that the stochastic gradient is the true gradient.

<a id="mean-special-case"></a>

## Mean estimation reappears

For a scalar or vector random variable $X$, choose the squared loss

$$
f(w,X)=\frac12\lVert w-X\rVert^2.
$$

Then $\nabla_w f(w,x)=w-x$, and minimizing $J(w)$ has solution $w^*=\mathbb E[X]$. The SGD recursion becomes

$$
w_{k+1}=w_k-a_k(w_k-x_{k+1}),
$$

the same online mean estimator from [the previous unit](./mean-estimation). The example is not a trick: it shows that “optimization,” “root finding,” and “mean estimation” can describe one update from three angles.

<a id="relative-noise"></a>

## Why the path looks different near the optimum

The stochastic gradient has an absolute fluctuation even when the true gradient is small. A useful scalar diagnostic is the relative error

$$
\delta_k=
\frac{|\nabla f(w_k,x_{k+1})-\mathbb E[\nabla f(w_k,X)]|}
     {|\mathbb E[\nabla f(w_k,X)]|},
$$

whenever the denominator is nonzero. Far from $w^*$, the true gradient can dominate the fluctuation and the path resembles ordinary gradient descent. Near $w^*$, the denominator shrinks while sample noise does not necessarily shrink, so the relative error becomes large and the path visibly jitters.

This is not necessarily a failure. Absolute distance can continue to decrease even while relative noise increases. Plot both quantities rather than judging convergence from jaggedness alone.

<a id="convergence-conditions"></a>

## What a convergence claim assumes

A common scalar statement asks for bounded positive curvature,

$$
0<c_1\leq\nabla_w^2 f(w,X)\leq c_2,
$$

the Robbins–Monro step-size sums, and iid samples $x_k$. Vector problems replace curvature by conditions on a Hessian or a suitable monotone operator. Constant practical step sizes can still produce useful stationary behavior, but that is a different claim from exact almost-sure convergence.

<a id="lab-diagnostics"></a>

## Inspect SGD in the lab

The [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation) displays the sampled gradient, its running mean, the objective, and the distance to the target. Compare runs with the same seed and:

| Change | Question |
| --- | --- |
| harmonic to constant step | does the late path settle or keep wandering? |
| low to high noise | does absolute error or only relative error grow? |
| one sample to a mini-batch | how much fluctuation is averaged out? |
| far versus near initialization | where does the signal-to-noise ratio change? |

Keep the objective and sample distribution fixed while changing one factor. Otherwise a smoother curve may simply be solving a different problem.

<a id="check-yourself"></a>

## Check yourself

If the true gradient is $3$ and a sampled gradient is $5$, the stochastic-gradient noise is $\eta=2$. With $a_k=0.1$, the update is $w_{k+1}=w_k-0.5$, not $w_k-0.3$ and not $w_k-0.1$. The step is applied to the observed gradient once.

<a id="read-next"></a>

## Continue

Read [batch and mini-batch updates](./mini-batch) to see how changing the number of samples per update alters variance, work, and reproducibility. Then use the [summary](./summary) to connect all four update families.
