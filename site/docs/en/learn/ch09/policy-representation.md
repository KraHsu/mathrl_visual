---
id: ch09-policy-representation
translation_key: ch09-policy-representation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Policy representation: table to function"
description: Understand what changes when action probabilities come from parameters rather than table entries.
outline: deep
---

# Policy representation: table to function

<a id="table-function"></a>

## From entries to parameters

A table stores one probability for every state–action pair. A function representation stores a compact parameter vector $\theta$ and evaluates

$$
\pi_\theta(a\mid s)=f_\theta(s,a).
$$

The representation changes three practical questions: how to define an optimum, how to update it, and how to query an action probability. The environment does not change merely because the policy representation does.

<a id="softmax"></a>

## Softmax as a transparent example

For logits $\theta_{s,0},\ldots,\theta_{s,m-1}$, use

$$
\pi_\theta(a\mid s)=\frac{\exp(\theta_{s,a})}{\sum_b\exp(\theta_{s,b})}.
$$

Subtracting the largest logit before exponentiating is numerically equivalent and prevents overflow. The lab displays both the probabilities and the selected row's logits after every update.

<a id="score"></a>

## The score vector

For a softmax row, the score for action $a$ is

$$
\nabla_{\theta_s}\log\pi_\theta(a\mid s)=e_a-\pi_\theta(\cdot\mid s).
$$

Its entries sum to zero: increasing one preference must be balanced by decreasing the others. This is why a policy-gradient trace should show the whole score vector, not only the selected action.

<a id="questions"></a>

## Check your reading

- Does a row still sum to one after a large parameter update?
- Which part of the update changes when the reward noise changes: the score, the return, or both?
- Why can two parameter vectors represent the same ranking but different exploration probabilities?

<a id="next"></a>

Continue to [policy metrics](./metrics).
