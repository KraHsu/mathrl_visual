---
id: ch06-overview
translation_key: ch06-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.1-6.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 6: Stochastic approximation"
description: Build the incremental viewpoint from mean estimation to Robbins–Monro, Dvoretzky-style convergence, and stochastic gradient descent.
outline: deep
---

# Chapter 6: Stochastic approximation

Chapter 5 used a complete episode before changing a value estimate. The next model-free methods will update while data arrive. Chapter 6 is the bridge: it studies stochastic approximation as a reusable update pattern rather than introducing a new reinforcement-learning algorithm.

::: info Content boundary
This is an unofficial original companion. It follows the fixed upstream chapter's topic order without reproducing its prose, proofs, figures, tables, examples, questions, or code. Topic locations refer to the [pinned upstream PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%206%20Stochastic%20Approximation.pdf); the source blob and PDF digest are recorded in this page's metadata.
:::

<a id="why-this-chapter"></a>

## Why this chapter sits between MC and TD

Monte Carlo estimation waits for a return and then forms a batch-like average. Temporal-difference learning will alter an estimate after each transition, often before an episode ends. The common shape is an iterate plus a step-size times a noisy correction:

$$
w_{k+1}=w_k-a_k\,\widehat g_k.
$$

The correction may be a residual, a gradient, or a root-finding observation. Stochastic approximation asks when repeated small corrections can approach the solution of an expectation that is not directly available.

The chapter's role can be pictured as:

```text
complete-return sample (Chapter 5)
          │  replace a stored average by an online correction
          ▼
mean estimation ──► Robbins–Monro root finding ──► convergence tools
          │
          └──────────────► SGD / mini-batch updates
                                      │
                                      ▼
                         incremental TD methods (Chapter 7)
```

This is a mathematical bridge, not a claim that every stochastic update converges automatically.

<a id="learning-goals"></a>

## Learning goals

By the end of this chapter, you should be able to:

1. turn a sample mean into an incremental recursion;
2. explain the two step-size requirements $\sum_k a_k=\infty$ and $\sum_k a_k^2<\infty$;
3. formulate a noisy black-box root problem and write the Robbins–Monro update;
4. read the scalar and finite-index convergence conditions behind a Dvoretzky-style result;
5. distinguish a true gradient from a stochastic gradient;
6. compare batch, stochastic, and mini-batch gradient descent; and
7. audit a finite run without presenting an empirical curve as an almost-sure proof.

<a id="roadmap"></a>

## Chapter roadmap

| Unit | Main question | Running object | Evidence to inspect |
| --- | --- | --- | --- |
| [Mean estimation](./mean-estimation) | How does a batch average become an online update? | $w_k$ | sample, estimate, step size |
| [Robbins–Monro](./robbins-monro) | How can a noisy black box reveal a root? | $g(w_k)+\eta_k$ | residual sign and noise |
| [Dvoretzky convergence](./dvoretzky) | Why can shrinking noisy corrections converge? | error $\Delta_k$ | drift, variance, sums of steps |
| [Stochastic gradient descent](./stochastic-gradient-descent) | How is optimization a root problem? | parameter $w_k$ | true/stochastic gradient |
| [Batch and mini-batch](./mini-batch) | What does batch size trade for variance and work? | averaged gradient | batch size and update count |

The [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation) lets you change the update family, step-size schedule, observation noise, and batch size while keeping the seed and objective visible.

<a id="notation"></a>

## Notation and assumptions

We use $k=1,2,\ldots$ for update index, $w_k$ for the current scalar or vector estimate, and $a_k>0$ for its step size. A noisy observation is written

$$
\widetilde g(w_k,\eta_k)=g(w_k)+\eta_k,
$$

where $\eta_k$ is a disturbance, not necessarily Gaussian. Conditional means and variances are taken with respect to the history $\mathcal H_k$ available before drawing the next observation. When a theorem says convergence *almost surely*, it refers to a probability-one event in an infinite experiment; a finite browser trace can only show diagnostics consistent with its assumptions.

<a id="assumption-lens"></a>

## The assumption lens

Every experiment should expose which assumptions it is testing:

| Assumption | Intuition | What to vary in the lab |
| --- | --- | --- |
| positive, diminishing steps | updates eventually settle | harmonic versus constant schedule |
| divergent step sum | a far-away guess can still travel | compare $\sum a_k$ over the run |
| finite squared-step sum | noise has finite total influence | compare $\sum a_k^2$ |
| unbiased conditional noise | no systematic push remains | shift the noise mean |
| bounded curvature/variance | corrections do not explode | change objective or noise scale |
| suitable independent samples | stochastic gradients represent the target | seed and sampling mode |

Turning a knob does not prove a theorem; it helps locate the boundary where a theorem's hypotheses stop describing the run.

<a id="reading-path"></a>

## A safe reading path

Start with [mean estimation](./mean-estimation), then derive the black-box update in [Robbins–Monro](./robbins-monro). Read [Dvoretzky convergence](./dvoretzky) selectively if you want the proof pattern, and continue to [stochastic gradient descent](./stochastic-gradient-descent) for the optimization connection. Use [batch and mini-batch](./mini-batch) to interpret computational tradeoffs, then finish with the [summary](./summary), [Q&A](./q-and-a), and [checkpoint](./checkpoint).

Chapter 6 pages: [Overview](/en/learn/ch06/) · [Mean estimation](/en/learn/ch06/mean-estimation) · [Robbins–Monro](/en/learn/ch06/robbins-monro) · [Dvoretzky convergence](/en/learn/ch06/dvoretzky) · [Stochastic gradient descent](/en/learn/ch06/stochastic-gradient-descent) · [Batch and mini-batch](/en/learn/ch06/mini-batch) · [Summary](/en/learn/ch06/summary) · [Q&A](/en/learn/ch06/q-and-a) · [Checkpoint](/en/learn/ch06/checkpoint) · [Lab](/en/labs/ch06-stochastic-approximation)
