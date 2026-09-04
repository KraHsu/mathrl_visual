---
id: ch09-overview
translation_key: ch09-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.1-9.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 9: Policy-gradient methods"
description: Move from a tabular policy to a parameterized softmax and a sample-based gradient.
outline: deep
---

# Chapter 9: Policy-gradient methods

Earlier chapters improved values and then read a policy from a table. This chapter turns the direction around: a parameter vector produces action probabilities, and a scalar objective tells us how to move that vector. The companion lab uses a contextual bandit so every score-function term can remain visible.

::: info Original companion note
This page is an original guide to the pinned chapter topics. It does not reproduce source prose, figures, proofs, examples, questions, or code.
:::

<a id="learning-goals"></a>

## Learning goals

By the end, you should be able to:

1. distinguish a policy table from a parameterized policy;
2. state an objective such as an average value or average reward;
3. use the log-derivative identity to express a policy gradient; and
4. audit one REINFORCE update, including its baseline and variance.

<a id="chapter-map"></a>

## A route through the chapter

```text
policy representation → scalar metric → policy-gradient theorem →
sampled return (REINFORCE) → variance and baseline questions
```

The notation deliberately separates the true expectation from the finite samples used by the browser experiment. A good-looking trace is evidence about one seed, not an optimality theorem.

<a id="lab-preview"></a>

## Open the laboratory

The [policy-gradient lab](/en/labs/ch09-policy-gradient) starts with uniform softmax rows over three contexts and three actions. Compare `REINFORCE (b = 0)` with a state baseline while keeping seed `5eed` fixed. Inspect the sampled return, score gradient, parameter update, objective, entropy, and update variance together.

<a id="notation"></a>

## Notation that will persist

Let $\theta$ collect policy parameters and let $\pi_\theta(a\mid s)$ be a normalized action distribution. For a sampled return $G$, the core estimator has the shape

$$
\widehat{\nabla J}=G\,\nabla_\theta\log\pi_\theta(A\mid S).
$$

The baseline version replaces $G$ by $G-b(S)$ without changing the expected gradient when the baseline is independent of the sampled action.

<a id="next"></a>

## Continue

Read [policy representation](./policy-representation), then use [metrics](./metrics) to decide what “better” means before studying the theorem.
