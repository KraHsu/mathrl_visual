---
id: exp-ch09-policy-gradient
translation_key: exp-ch09-policy-gradient
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.1-9.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Policy-gradient lab
description: Replay seeded softmax policy-gradient updates and compare a state baseline.
aside: false
outline: deep
---

# Policy-gradient lab

This original companion experiment uses a three-context, three-action contextual bandit. Rust/Wasm samples a context and action in a Worker; Vue displays the softmax row, log-probability score, return, baseline, advantage, and parameter update.

::: info Original companion experiment
The reward table, trace format, controls, questions, and fallback calculations are original. They reference the pinned Chapter 9 topics without redistributing source prose, figures, examples, questions, or code.
:::

::: warning Finite-run boundary
The exact objective is computed only for this tiny teaching table. A finite trace cannot establish the policy-gradient theorem's asymptotic claims.
:::

<PolicyGradientLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the equations, reward table, and manual update below remain available.
</noscript>

<a id="experiment-question"></a>

## Experiment question

With seed `5eed`, compare `REINFORCE (b = 0)` and `REINFORCE + state baseline` while holding the reward table, step size, discount, and episode budget fixed. Does the expected objective change, or mainly the variance of finite updates?

<a id="setup"></a>

## Setup and controls

The context is sampled uniformly from $s\in\{0,1,2\}$. Each context has three actions. The observed reward is $R=r(s,a)+\xi$, where $\xi$ is a bounded centred disturbance owned by Rust. Controls are alpha, discount, noise scale, episode budget, mode, and hexadecimal seed.

<a id="equations"></a>

## Equations to audit

For the sampled context row,

$$
\pi(a\mid s)=\frac{e^{\theta_{s,a}}}{\sum_b e^{\theta_{s,b}}},\qquad
z=e_A-\pi(\cdot\mid S),
$$

$$
G=\gamma R,\qquad A=G-b(S),\qquad
\Delta\theta=\alpha A z.
$$

The table exposes every factor. The baseline is updated after the row is formed.

<a id="manual-fallback"></a>

## Manual fallback

Start with a uniform row $(1/3,1/3,1/3)$. If action 1 receives return $G=1.5$ and $\alpha=0.2$, the score is $(-1/3,2/3,-1/3)$ and the increment is $(-0.1,0.2,-0.1)$ before softmax re-normalization. With a baseline $b=1$, replace $G$ by $0.5$.

<a id="questions"></a>

## Questions

1. Do untouched context rows retain their logits?
2. Does the score vector sum to zero?
3. With the same seed, which variance changes when the baseline is enabled?
4. Why is the exact objective a reference rather than a model-free input?

<a id="next"></a>

Continue with [Chapter 10 Actor–Critic](../learn/ch10/) after recording the seed and one trace row.
