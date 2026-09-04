---
id: exp-ch06-stochastic-approximation
translation_key: exp-ch06-stochastic-approximation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.1-6.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Stochastic approximation lab
description: Replay seeded mean, Robbins–Monro, SGD, batch, and mini-batch updates while inspecting step-size and noise diagnostics.
aside: false
outline: deep
---

# Stochastic approximation lab

This lab turns the Chapter 6 update pattern into a small, auditable scalar experiment. Rust/Wasm generates a bounded seeded stream in a Worker; Vue displays each before/after value, observation, gradient or residual, noise, objective, and error. The page is an experiment about incremental arithmetic, not a replacement for an asymptotic proof.

::: info Original companion experiment
The synthetic data stream, controls, trace format, questions, and fallback calculations on this page are original companion material. They reference the upstream chapter's topics without redistributing its prose, figures, tables, examples, questions, or code.
:::

::: warning Finite-run boundary
The interface can report a tolerance hit and whether a schedule has the textbook Robbins–Monro shape. Neither flag proves almost-sure convergence. Record the assumptions, seed, and stopping rule with any screenshot or exported trace.
:::

<StochasticApproximationLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the update equations, mode definitions, audit table, and hand-calculation procedure below remain available.
</noscript>

<a id="experiment-question"></a>

## Experiment question

How do incremental estimators behave when the correction is exact, noisy, averaged, or deliberately nonlinear? Keep the target, initial value, seed, and sample budget fixed while changing one factor at a time:

1. mean estimation versus Robbins–Monro root finding;
2. zero noise versus centered noise;
3. harmonic, polynomial, and constant step sizes; and
4. one sample versus a mini-batch or full batch.

The lab's random stream is a project-defined reproducibility aid. It is not a reproduction of any figure or unseeded numerical example from the source chapter.

<a id="problem-setup"></a>

## Problem setup and controls

The default task is scalar. `target` is the mean, root, or minimizer; `initial w` is the starting estimate. Noise is sampled from a bounded, centered distribution so that a browser run remains finite and inspectable. The RM selector can use a linear, hyperbolic-tangent, or centered cubic root function.

| Control | Baseline | Meaning |
| --- | ---: | --- |
| mode | mean | mean, Robbins–Monro, SGD, mini-batch, or batch gradient |
| root function | linear | RM signal shape; ignored by mean/gradient modes |
| target / root | 1.0 | desired mean or solution $w^*$ |
| initial $w$ | 0.0 | starting iterate |
| step schedule | harmonic | $a_k=\alpha/k$, constant, or polynomial |
| base $\alpha$ | 0.8 | scale of the selected schedule |
| polynomial power | 1.0 | $a_k=\alpha/k^p$ when selected |
| noise standard deviation | 0.25 | bounded observation/gradient disturbance |
| sample count | 200 | maximum scalar updates |
| batch size | 1 | gradients averaged in mini-batch/batch modes |
| tolerance | $10^{-3}$ | pedagogical absolute-error flag |
| seed | `5eed` | hexadecimal replay key |

The engine validates these ranges and reports invalid input instead of silently clamping a mathematical parameter.

<a id="mode-contract"></a>

## Five modes, one outer update

Every row follows the pattern $w_{k+1}=w_k-a_k\widehat g_k$, but the observed correction differs:

| Mode | Observation | Correction used | What to compare |
| --- | --- | --- | --- |
| Mean | target plus noise | $w_k-\text{observation}$ | online average and noise |
| Robbins–Monro | $g(w_k)+$ noise | observed root signal | residual sign and root function |
| SGD | target plus noise | $w_k-\text{observation}$ | objective and distance |
| Mini-batch | several target-plus-noise observations | $w_k-$ their average | variance versus work |
| Batch gradient | fixed synthetic dataset | $w_k-$ full-data mean | exact finite-data gradient |

The BGD dataset is generated once after reset. Mini-batch indices and batch size are displayed so that “one update” does not hide how many samples were consumed.

<a id="trace-contract"></a>

## What one trace records

Each iteration row should expose at least:

| Field | Why it matters |
| --- | --- |
| index and seed | replay and alignment with $a_k$ |
| $w_{\text{before}}$, $w_{\text{after}}$ | verify the update arithmetic |
| applied $\alpha_k$, $\alpha_k^2$ | audit step-size sums |
| observation and gradient/residual | distinguish target signal from noise |
| noise and batch indices | inspect centering and sample reuse |
| signed/absolute error and objective | separate direction from magnitude |
| projected flag | reveal a safety bound rather than hiding overflow |

The summary panel additionally reports $\sum a_k$, $\sum a_k^2$, noise mean/variance, iteration count, tolerance status, and whether the configured budget was exhausted or the run was truncated.

<a id="return-equations"></a>

## Update equations to audit by hand

For mean, SGD, and batch modes, the observation is $y_k=\text{target}+\xi_k$ and

$$
w_{k+1}=w_k+a_k(y_k-w_k).
$$

For RM, let $r_k=g(w_k)+\xi_k$:

$$
w_{k+1}=w_k-a_kr_k.
$$

For a mini-batch $I_k$ of size $m$, average the observed gradients first:

$$
\widehat g_k=\frac1m\sum_{j\in I_k}g(w_k,x_j),
\qquad
w_{k+1}=w_k-a_k\widehat g_k.
$$

Use the displayed `batch_indices` to reproduce the average. A batch size of one is SGD only when its sampling protocol matches.

<a id="protocol"></a>

## A controlled protocol

1. Reset with seed `5eed`, target 1, initial value 0, and noise 0.
2. Run harmonic steps in mean mode and note the first five rows.
3. Keep every control fixed, switch to RM/linear, and compare the residual sign.
4. Turn noise to 0.25 and replay; inspect noise mean and the tail of the error.
5. Compare SGD, mini-batch size 8, and batch gradient by both update index and samples consumed.
6. Switch to a constant step and explain why a tolerance hit is not an asymptotic guarantee.

Changing the seed should change observations but not the update contract. Changing the mode changes the question being answered, even if two rows happen to share a numeric value.

<a id="interpretation"></a>

## Interpretation guide

| Pattern | Plausible explanation | Follow-up check |
| --- | --- | --- |
| smooth approach then jitter | signal dominates far away; noise dominates near target | plot absolute and relative error |
| quick movement but persistent band | constant step or non-vanishing noise | inspect schedule and $\sum a_k^2$ |
| no movement from a distant start | step decays too quickly or sign is wrong | inspect $\sum a_k$ and one row's gradient |
| mini-batch is smoother but costs more | averaging reduced gradient variance | compare examples consumed |
| RM and SGD differ strongly | root function is nonlinear or objective differs | compare `root function` and residual |

<a id="manual-fallback"></a>

## Manual fallback without JavaScript

Choose target $1$, initial $w_1=0$, harmonic $a_k=0.8/k$, and a zero-noise mean run. The first updates are

$$
w_2=0+0.8(1-0)=0.8,
\qquad
w_3=0.8+0.4(1-0.8)=0.88.
$$

Continue with the same recurrence and record the index, step, before/after values, error, and cumulative sums. For RM with a linear root, replace $(1-w_k)$ by $-(w_k-1)$; the numerical update is identical when noise is zero. This hand trace is enough to audit the sign and indexing conventions.

<a id="next"></a>

## Continue

Return to [mean estimation](../learn/ch06/mean-estimation) for the algebra, [Robbins–Monro](../learn/ch06/robbins-monro) for root assumptions, and [batch and mini-batch](../learn/ch06/mini-batch) for sampling tradeoffs. Chapter 7's temporal-difference target is intentionally outside this lab.
