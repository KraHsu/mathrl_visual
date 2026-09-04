---
id: appendix-optimization
translation_key: appendix-optimization
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix optimization"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Gradient geometry and optimization
description: Connect gradients, losses, policies, and step sizes through small auditable examples.
outline: deep
---

# Gradient geometry and optimization

<a id="direction"></a>

## A gradient is a local direction

For a differentiable objective $J(\theta)$, the gradient $\nabla J(\theta)$ points toward the steepest local increase under the Euclidean norm. A descent step is

$$\theta_{k+1}=\theta_k-\alpha_k\nabla J(\theta_k).$$

The sign depends on whether the code maximizes a return or minimizes a loss. Always name the objective before reading an update ledger.

<a id="softmax"></a>

## Softmax keeps a policy on the simplex

For logits $z_a$,

$$\pi(a\mid s)=\frac{e^{z_a}}{\sum_b e^{z_b}}.$$

The probabilities are positive and sum to one. Numerically, subtracting the largest logit before exponentiating avoids overflow without changing the result.

<a id="noise"></a>

## Full, stochastic, and policy-gradient updates

A full-data gradient uses all available terms. An SGD update uses one sampled term or a mini-batch, so its direction contains noise. REINFORCE estimates a policy gradient from sampled returns; a baseline can change variance without changing the ideal expected gradient when it satisfies the required independence condition.

<a id="geometry"></a>

## A geometric checklist

For every plotted path, inspect:

1. the objective and its sign;
2. the parameter vector and feature scale;
3. the step-size schedule and clipping/projection;
4. the target, gradient, and update norm;
5. whether a finite trace is being presented as a guarantee.

The policy-gradient and actor–critic labs expose these quantities in tables as well as curves, making the geometry testable without relying on color or animation.
