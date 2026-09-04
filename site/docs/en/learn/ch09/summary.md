---
id: ch09-summary
translation_key: ch09-summary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 9 summary"
description: Keep policy representation, objective choice, theorem, and REINFORCE in one auditable chain.
outline: deep
---

# Chapter 9 summary

<a id="chain"></a>

## The chain

```text
parameters θ → probabilities πθ → sampled return G → score × weight → θ update
```

The objective determines the state weighting; the theorem supplies the score-weighted direction; REINFORCE supplies a finite estimator.

<a id="checklist"></a>

## Audit checklist

- Do each softmax row's probabilities sum to one?
- Is the score vector $e_a-\pi$ evaluated before the parameter update?
- Does a baseline leave the expected direction unchanged while changing finite variance?
- Are `objective`, sampled return, and entropy kept as distinct quantities?

<a id="boundary"></a>

## Boundary to Chapter 10

REINFORCE uses a complete sampled return. Actor–critic methods will replace that expensive critic signal with an incremental value estimate, while preserving the policy-gradient actor update.

<a id="next"></a>

Use the [Q&A](./q-and-a) and [checkpoint](./checkpoint) before moving on.
