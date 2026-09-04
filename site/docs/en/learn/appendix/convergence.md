---
id: appendix-convergence
translation_key: appendix-convergence
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix convergence"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Random sequences and convergence
description: Distinguish finite-trace diagnostics from probability-limit statements.
outline: deep
---

# Random sequences and convergence

<a id="three-questions"></a>

## Three different questions

For a random sequence $X_1,X_2,\ldots$ and target $x$, keep these claims separate:

| Question | Informal meaning |
| --- | --- |
| almost sure convergence | with probability one, the whole tail eventually stays close; |
| convergence in probability | the chance of being far away tends to zero; |
| finite-prefix accuracy | the displayed run is close at the iterations we happened to inspect. |

The third row is what a browser experiment can measure directly. It is useful evidence, but it is not a replacement for assumptions in a theorem.

<a id="step-size"></a>

## Step sizes carry two obligations

Many stochastic-approximation recurrences have the form

$$x_{k+1}=x_k+a_k\,(h(x_k)+\xi_{k+1}).$$

A familiar sufficient pattern is

$$\sum_{k=0}^{\infty}a_k=\infty,
\qquad \sum_{k=0}^{\infty}a_k^2<\infty,$$

along with conditions on the noise and the drift. The first sum prevents updates from stopping too early; the second limits accumulated noise. A constant step size intentionally violates the second condition and therefore has a different long-run interpretation.

<a id="contraction"></a>

## Contraction as a deterministic comparison

For a discounted finite MDP, a Bellman operator often satisfies

$$\lVert T v-T u\rVert_\infty
 \le \gamma\lVert v-u\rVert_\infty,
\qquad 0\le\gamma<1.$$

This inequality says that one application shrinks the worst coordinate difference. It does not say that every noisy sample path shrinks monotonically; sampled updates can move away before the aggregate behavior improves.

<a id="diagnostic"></a>

## What to record in an experiment

Record the seed, step-size schedule, noise scale, iteration budget, residual, and whether the budget or tolerance stopped the run. The stochastic-approximation lab labels a result as **converged**, **truncated**, or **budget exhausted** so a short trace cannot be mistaken for a theorem.

When comparing languages, the same configuration and seed should produce the same recorded observations up to the documented floating-point tolerance.
