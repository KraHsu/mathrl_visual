---
id: ch09-q-and-a
translation_key: ch09-q-and-a
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 9 Q&A"
description: Short retrieval questions about softmax scores, metrics, baselines, and REINFORCE.
outline: deep
---

# Chapter 9 Q&A

<a id="q1"></a>

## Why does the score vector sum to zero?

Because a softmax row is normalized. Differentiating the log probability gives $e_a-\pi$, whose entries sum to $1-1=0$. This keeps the update inside the row's probability simplex after re-normalization.

<a id="q2"></a>

## Why can a baseline reduce variance?

The baseline subtracts a state-dependent center from the sampled return. Its action-weighted score expectation is zero, so the mean direction is preserved while the finite products can be less dispersed.

<a id="q3"></a>

## Is a high entropy policy optimal?

No. Entropy reports spread; the chosen objective reports expected reward. A useful exploration policy may have high entropy early and lower entropy after learning.

<a id="q4"></a>

## What does the lab's exact objective mean?

It is an independent calculation for the tiny fixed reward table. It is not an oracle available to a model-free learner in a general environment.
