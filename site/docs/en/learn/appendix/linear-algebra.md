---
id: appendix-linear-algebra
translation_key: appendix-linear-algebra
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix linear algebra"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Vectors, norms, and projections
description: Read Bellman systems, residuals, and feature updates as finite-dimensional linear algebra.
outline: deep
---

# Vectors, norms, and projections

<a id="vectors"></a>

## Put a finite value function in a vector

Choose an ordering $s_0,\ldots,s_{n-1}$ and write

$$v=(V(s_0),\ldots,V(s_{n-1}))^\mathsf T.$$

The ordering is a convention, not a mathematical fact. Every matrix, heatmap, and copied table must state the same ordering. The shared Grid World uses row-major state IDs, so a reader can move from a cell to a vector coordinate without guessing.

<a id="norms"></a>

## Norms make residuals measurable

The infinity norm is

$$\lVert v\rVert_\infty=\max_i|v_i|.$$

For a Bellman sweep, the displayed residual is commonly

$$\lVert v_{k+1}-v_k\rVert_\infty.$$

It is a stopping diagnostic. A small residual under a poor model or an insufficiently rich function class does not automatically mean the task objective is good.

<a id="matrix"></a>

## Matrix policy evaluation

With a fixed policy and a continuing discounted model,

$$v=r_\pi+\gamma P_\pi v,
\qquad (I-\gamma P_\pi)v=r_\pi.$$

Here each row of $P_\pi$ sums to one. The inverse notation $(I-\gamma P_\pi)^{-1}$ is a compact reference expression; a numerical implementation should validate the matrix and report singular or non-finite cases rather than silently producing a result.

<a id="projection"></a>

## Features and projection

An approximator writes $\hat v(s)=\phi(s)^\mathsf T w$. If the feature columns cannot represent the exact value vector, an update seeks a useful projection into the span of those columns. More features can reduce representation error, but can also change conditioning and the step-size scale.

The value-function lab exposes $\phi(s)$, $w$, prediction, target, and update norm together so the projection story remains inspectable.
