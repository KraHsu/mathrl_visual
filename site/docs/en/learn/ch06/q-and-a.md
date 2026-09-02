---
id: ch06-q-and-a
translation_key: ch06-q-and-a
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 6 Q&A"
description: Short original answers about incremental means, Robbins–Monro, convergence assumptions, SGD, and finite experiments.
outline: deep
---

# Chapter 6 Q&A

Use these prompts for retrieval practice. Whenever an answer says “converges,” ask whether it means an asymptotic theorem, a finite tolerance flag, or a visual description of one seed.

::: info Original companion note
The questions and answers are original. They follow the upstream chapter's topic scope without reproducing its prose, figures, examples, or question list.
:::

<a id="q1"></a>

## What is stochastic approximation?

It is a family of iterative methods that use noisy observations to approach a root, an optimum, or another solution defined through an expectation. The recurring ingredients are an iterate, a step size, and a sampled correction.

<a id="q2"></a>

## Why turn a mean into an incremental update?

A batch average waits for all observations and stores or revisits them. The recursion updates immediately with the new prediction error, so a learner can report a current estimate after every sample. A general step size also lets the estimator track a drifting stream.

<a id="q3"></a>

## What does Robbins–Monro know about the function?

Only the input and a noisy output. It does not need a closed-form expression for $g$ or its derivative. To justify convergence, however, one still needs assumptions about monotonicity/slope, step sizes, and conditional noise.

<a id="q4"></a>

## Why require $\sum a_k=\infty$ and $\sum a_k^2<\infty$?

The first prevents the total possible movement from being finite, which could leave a distant initial value stranded. The second limits the accumulated influence of finite-variance noise. The harmonic schedule is the standard example satisfying both; a constant schedule does not satisfy the second.

<a id="q5"></a>

## What does Dvoretzky's theorem contribute?

It gives a reusable error-process template. If contraction repeatedly removes error while centered noise has controlled variance and finite total energy, a squared-error argument can establish almost-sure convergence. The theorem is not a shortcut around checking those hypotheses for every coordinate.

<a id="q6"></a>

## Is SGD just gradient descent with a smaller batch?

Not exactly. Gradient descent uses the expected or full-data gradient; SGD uses one sampled gradient, and mini-batch methods average a selected number of samples. They share an update shape, but their noise, sampling protocol, work per update, and convergence statements differ.

<a id="q7"></a>

## Why can SGD look noisier near the optimum?

The true gradient approaches zero while the absolute fluctuation of a sampled gradient may remain nonzero. Relative noise therefore grows even if absolute distance to the optimum continues to shrink. A jagged tail is not by itself evidence of divergence.

<a id="q8"></a>

## Can the browser lab prove almost-sure convergence?

No. It can replay a finite seeded prefix, show errors and step sums, and flag whether the chosen schedule has the textbook shape. Almost-sure convergence concerns an infinite random process under stated assumptions; a finite plot is evidence for an example, not a proof.

<a id="q9"></a>

## How does this prepare temporal-difference learning?

TD methods also update an estimate by a step size times a sampled correction, but their correction uses a bootstrapped successor estimate. Chapter 6 explains the incremental/stochastic machinery; it does not silently include the TD target or claim that TD has already been implemented here.

<a id="read-next"></a>

## Continue

Solve the [checkpoint](./checkpoint) with the formulas closed, then open the [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation) to audit the same ideas numerically.
