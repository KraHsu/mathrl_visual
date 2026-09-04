---
id: ch06-summary
translation_key: ch06-summary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 6 summary"
description: Keep mean estimation, Robbins–Monro, Dvoretzky-style convergence, and stochastic gradient descent in one auditable map.
outline: deep
---

# Chapter 6 summary

Stochastic approximation is the study of iterative corrections driven by noisy observations. It supplies the missing vocabulary between Chapter 5's return averages and Chapter 7's temporal-difference updates.

::: info Original companion note
This summary is original companion material. It compresses the upstream topic order without reproducing its prose, proofs, figures, tables, examples, questions, or code.
:::

<a id="core-chain"></a>

## The core chain

$$
\text{sample}
\longrightarrow
\text{noisy correction}
\longrightarrow
\text{step-size update}
\longrightarrow
\text{error process}
\longrightarrow
\text{diagnostic or convergence claim}.
$$

The same skeleton can be read three ways:

| View | Unknown quantity | Observable correction |
| --- | --- | --- |
| mean estimation | $\mathbb E[X]$ | $x-w$ |
| Robbins–Monro | root of $g(w)$ | $-\widetilde g(w,\eta)$ |
| SGD | minimizer of $\mathbb E[f(w,X)]$ | $-\nabla f(w,x)$ |

<a id="algorithm-map"></a>

## One recursion, several names

$$
w_{k+1}=w_k-a_k\,\widehat g_k.
$$

For a mean estimator, $\widehat g_k=w_k-x_{k+1}$. For RM, it is a noisy root observation. For SGD, it is a sampled gradient. Batch and mini-batch methods change how many observations are averaged into $\widehat g_k$ before applying the same outer update.

<a id="assumptions"></a>

## The assumption checklist

| Question | Why it matters | A finite-run field |
| --- | --- | --- |
| Are steps positive and eventually smaller? | controls stability and adaptation | applied $a_k$ |
| Does $\sum a_k$ grow without bound in the intended limit? | prevents premature freezing | cumulative step sum |
| Does $\sum a_k^2$ stay finite asymptotically? | limits finite-variance noise energy | cumulative squared-step sum |
| Is conditional noise centered? | prevents systematic drift | noise mean by seed batch |
| Is variance/curvature controlled? | bounds correction size | residual, gradient, objective |
| Are samples generated as assumed? | links observed gradient to target | seed and sampling protocol |

The checklist identifies hypotheses; it does not certify them from a finite prefix.

<a id="convergence-language"></a>

## Use convergence language carefully

“Converges almost surely” is an asymptotic probability statement. “The current error is below tolerance” is a finite numerical observation. “The curve is stable for this seed” is an empirical description. These phrases are useful together only when their scopes stay distinct.

The [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation) labels its tolerance flag as a pedagogical diagnostic and separately reports whether the selected schedule has the textbook Robbins–Monro shape. It never turns a finite run into a theorem proof.

<a id="chapter-boundary"></a>

## Boundary with the next chapter

This chapter does not implement temporal-difference learning. Its purpose is to make the incremental form familiar:

$$
\text{estimate}_{k+1}
=\text{estimate}_k
 +\text{step size}\times\text{sampled correction}.
$$

Chapter 7 will choose a correction built from a bootstrapped successor estimate. That target introduces a new dependency; it should not be retroactively inserted into the mean, RM, or SGD examples here.

<a id="implementation-contract"></a>

## A reproducible implementation contract

An honest browser experiment records at least:

1. mode and objective/root function;
2. initial value, target, step-size schedule, and any polynomial exponent;
3. noise scale, sampling protocol, batch size, and seed;
4. each applied update (before/after value, observation, gradient, noise, and error); and
5. termination reason, cumulative step sums, and projection/truncation flags.

Those fields let a reader replay arithmetic without trusting a rendered curve. They also make an implementation bug—such as applying the step twice or hiding a clipped value—observable.

<a id="read-next"></a>

## Continue

Use the [Q&A](./q-and-a) for short retrieval prompts, then solve the [checkpoint](./checkpoint) before moving on to the temporal-difference material in Chapter 7.
