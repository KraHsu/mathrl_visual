---
id: ch09-checkpoint
translation_key: ch09-checkpoint
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
title: "Chapter 9 checkpoint"
description: Practice one softmax score update and explain baseline invariance before opening the lab.
outline: deep
---

# Chapter 9 checkpoint

::: warning Scope
These are finite arithmetic checks. They do not establish policy-gradient convergence.
:::

<a id="score-update"></a>

## 1. Score update

Suppose a row has probabilities $(0.2,0.5,0.3)$, action $a=1$, return $G=2$, and $\alpha=0.1$. The score is $(-0.2,0.5,-0.3)$ and the parameter increment is $(-0.04,0.10,-0.06)$.

<a id="baseline-check"></a>

## 2. Baseline check

If $b(s)=1.5$, the scalar weight becomes $A=0.5$. The score does not change; every parameter increment is exactly one quarter of the no-baseline increment.

<a id="objective-check"></a>

## 3. Objective versus sample

Explain why two seeds can produce different sampled returns while the exact objective at the same parameter vector is identical. The former includes reward sampling; the latter sums the fixed table analytically.

<a id="next"></a>

Open the [policy-gradient lab](/en/labs/ch09-policy-gradient) and verify the first row with seed `5eed`.
