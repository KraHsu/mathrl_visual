---
id: appendix-probability
translation_key: appendix-probability
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix probability"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Probability and expectation
description: Probability identities used by transition models, policies, and Monte Carlo estimates.
outline: deep
---

# Probability and expectation

<a id="distribution"></a>

## A distribution is a normalized row

For a finite random variable $X$, a probability mass function $p(x)$ satisfies

$$p(x)\ge 0,\qquad \sum_x p(x)=1.$$

The same invariant appears in two places in the labs:

- a policy row $pi(a\mid s)$ distributes mass over actions;
- a transition row $p(s'\mid s,a)$ distributes mass over next states.

If a row sums to $0.999999$ because of display rounding, inspect the stored values before declaring a model invalid. The Rust validator checks the configured tolerance, while the table prints enough digits to find a genuinely missing probability.

<a id="expectation"></a>

## Expectation and conditional expectation

The expectation of a finite variable is

$$\mathbb E[X]=\sum_x x\,p(x).$$

Conditioning fixes the information in the subscript:

$$\mathbb E[X\mid Y=y]=\sum_x x\,p(x\mid y).$$

The one-step Bellman backup is just a conditional expectation followed by a reward-plus-discount transform:

$$\mathbb E[R_{t+1}+\gamma V(S_{t+1})\mid S_t=s,A_t=a]
 =\sum_{s',r}p(s',r\mid s,a)\,[r+\gamma V(s')].$$

Do not replace this average with the most likely next state. A wind perturbation is precisely a small example where those two calculations differ.

<a id="variance"></a>

## Variance and Monte Carlo error

For a sample $X_1,\ldots,X_n$ with mean $\bar X$,

$$\widehat{\operatorname{Var}}(X)=\frac1n\sum_{i=1}^n(X_i-\bar X)^2.$$

Variance describes spread, not bias. A seeded Monte Carlo run lets you compare two estimators on the same realised episodes, but one run is not a confidence interval. Increase the sample budget, report the seed, and show the visit rule before drawing a conclusion.

<a id="audit"></a>

## A four-line audit

When reading a probability calculation, ask:

1. What is random: policy choice, environment outcome, or both?
2. What is conditioned on?
3. Does the sum range over all possible outcomes?
4. Does the result obey the range and normalization checks?

Use the [Chapter 2 policy-evaluation lab](/en/labs/ch02-policy-evaluation) to expand these questions over the shared 4×4 transition rows.
