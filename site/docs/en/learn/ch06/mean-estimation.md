---
id: ch06-mean-estimation
translation_key: ch06-mean-estimation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Mean estimation: from a batch to an online update"
description: Rewrite a sample average as an incremental stochastic-approximation update and inspect what each step-size schedule remembers.
outline: deep
---

# Mean estimation: from a batch to an online update

The smallest useful stochastic-approximation problem is estimating a mean. It has no states, actions, or policy to distract us: a stream of observations arrives, and one number $w$ should track their expected value. The same algebra later appears inside value and gradient updates.

::: info Original companion note
The examples, trace tables, and implementation advice below are original explanatory material. They reference the upstream mean-estimation topic without reproducing its prose, figures, proofs, or numerical example.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. distinguish a model mean from a sample average;
2. derive an online mean update with an explicit index convention;
3. explain how a general step size changes the memory of the estimator; and
4. list the diagnostics needed before calling a finite run converged.

<a id="batch-mean"></a>

## The batch view

Let $X$ be a random variable and let $x_1,\ldots,x_n$ be observations. If the distribution is known, the expectation is a weighted sum. If it is not known, the usual finite-data estimate is

$$
\bar x_n=\frac{1}{n}\sum_{i=1}^{n}x_i.
$$

The law of large numbers describes what can happen as the number of suitable observations grows. It does not say that the first few observations are close to the target, nor does it excuse a sampling process whose distribution changes silently.

<a id="incremental-derivation"></a>

## Derive the incremental form

Suppose $w_k$ is the average of the first $k$ observations. Then

$$
w_{k+1}=\frac{k w_k+x_{k+1}}{k+1}
       =w_k+\frac{1}{k+1}(x_{k+1}-w_k).
$$

The difference $(x_{k+1}-w_k)$ is the current prediction error. The factor $1/(k+1)$ prevents one new observation from erasing all previous information. Starting with $w_1=x_1$ makes the recursion exactly equal to the batch average at every later index.

For example, observations $2,8,5$ produce:

| update | observation | step | new estimate |
| ---: | ---: | ---: | ---: |
| 1 | 2 | — | 2.000 |
| 2 | 8 | $1/2$ | 5.000 |
| 3 | 5 | $1/3$ | 5.000 |

The update never needs to retain the complete list. It needs only the current estimate and the number of observations (or an equivalent step counter).

<a id="general-step"></a>

## Replace the counting step with a schedule

The more general recursion is

$$
w_{k+1}=w_k+a_k(x_{k+1}-w_k),\qquad a_k>0.
$$

With $a_k=1/(k+1)$ this is the exact running mean. With another schedule it is an exponentially or polynomially weighted estimator: recent samples can matter more, and the iterate need not equal the batch average at any finite time. Writing the update as

$$
w_{k+1}=(1-a_k)w_k+a_kx_{k+1}
$$

makes the convex-combination interpretation visible when $0<a_k\leq1$.

The step size is therefore part of the estimator, not merely a speed knob. A constant $a_k=0.2$ keeps adapting to a drifting stream but normally leaves a noise-sized neighborhood around a stationary mean. A harmonic schedule eventually takes tiny steps and can settle, provided the relevant assumptions hold.

<a id="weighting"></a>

## What the recursion remembers

Unrolling two updates gives

$$
w_{k+2}=(1-a_{k+1})(1-a_k)w_k
       +(1-a_{k+1})a_kx_{k+1}+a_{k+1}x_{k+2}.
$$

Older observations are multiplied by more factors of $(1-a_j)$. This explains the practical tension:

| Schedule | Strength | Risk |
| --- | --- | --- |
| $a_k=1/(k+1)$ | exact average for a stationary stream | adapts slowly after a distribution shift |
| $a_k=c/(k+1)^p$, $0<p\leq1$ | tunable decay | convergence conditions depend on $p$ and $c$ |
| $a_k=c$ | tracks drift quickly | persistent stochastic fluctuations |

Do not infer a theorem from a visually smooth line. Record both $\sum a_k$ and $\sum a_k^2$ for the actual finite prefix.

<a id="mc-connection"></a>

## Why this is the Chapter 5 bridge

In Monte Carlo control, a return $G_t$ is one observation of a value random variable. The familiar running action-value update can be written

$$
Q_{k+1}(s,a)=Q_k(s,a)+a_k\bigl(G_{k+1}-Q_k(s,a)\bigr).
$$

The state–action key determines which estimate receives the observation; the algebra is the same scalar recursion. Chapter 6 studies the recursion on its own so that Chapter 7 can introduce temporal-difference targets without making the update look mysterious.

<a id="finite-run-audit"></a>

## Audit a finite run

Before writing “converged,” check:

1. **Indexing:** does the displayed $a_k$ correspond to the sample used at that row?
2. **Target:** is the stream stationary, or did its mean change during the run?
3. **Noise:** are the sample mean and a variance estimate shown separately from $w_k$?
4. **Step sums:** do the observed prefixes support the intended long-run schedule?
5. **Reproducibility:** are the seed, initial value, sample source, and stopping rule recorded?

The [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation) exposes these fields and lets you replay the same observation stream with different schedules.

<a id="check-yourself"></a>

## Check yourself

If $w_k=4$, $x_{k+1}=10$, and $a_k=0.25$, then $w_{k+1}=4+0.25(6)=5.5$. The update moves toward the observation but does not jump all the way to it. If a UI reports $10$, it has displayed the sample rather than the estimate.

<a id="read-next"></a>

## Continue

Next, turn the prediction error into a noisy black-box residual in [Robbins–Monro](./robbins-monro). Keep the mean-estimation recursion in mind: it will reappear as both an RM and an SGD special case.
