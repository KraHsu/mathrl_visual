---
id: ch09-metrics
translation_key: ch09-metrics
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Metrics for a policy"
description: Compare average value, average reward, and the finite objective shown by the lab.
outline: deep
---

# Metrics for a policy

<a id="average-value"></a>

## Average value

Choose a state weighting $d(s)$ with non-negative entries summing to one. A discounted objective can be written

$$
\bar v_\pi=\sum_s d(s)v_\pi(s)=\mathbb E_{S\sim d}[v_\pi(S)].
$$

The weighting encodes what “important states” means. A start-state objective and a uniform objective need not prefer the same policy.

<a id="average-reward"></a>

## Average reward

For continuing tasks, one may instead optimize the long-run one-step reward. Discounted and average-reward objectives have different state-distribution assumptions; do not swap one for the other silently.

<a id="finite-objective"></a>

## What the lab reports

The contextual-bandit lab computes an exact finite objective from the current softmax rows and fixed reward table:

$$
J(\theta)=\sum_s d(s)\sum_a\pi_\theta(a\mid s)r(s,a).
$$

The sampled return is noisy, while $J(\theta)$ is a presentation-layer reference for the tiny teaching environment. Comparing both helps separate optimization signal from sampling fluctuation.

<a id="entropy"></a>

## Entropy is a diagnostic, not the task objective

The row entropy $H(\pi_s)=-\sum_a\pi(a\mid s)\log\pi(a\mid s)$ describes exploration. A high entropy can be useful early, but it does not by itself imply a high expected reward. Record it alongside $J$.

<a id="next"></a>

Continue to the [policy-gradient theorem](./policy-gradient-theorem).
