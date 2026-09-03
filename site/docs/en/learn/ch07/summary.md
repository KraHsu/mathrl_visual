---
id: ch07-summary
translation_key: ch07-summary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.1-7.5"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: Chapter 7 summary
description: A compact checklist for temporal-difference methods.
outline: deep
---

# Chapter 7 summary

<a id="checklist"></a>
## Checklist

- TD(0) updates a state value from a one-step Bellman sample.
- SARSA uses the next action sampled by the behaviour policy.
- n-step SARSA delays a backup and exposes a bias/variance knob.
- Q-learning uses a greedy next-action maximum and is off-policy.
- Every finite trace needs a seed, cap, terminal convention, and visible target.

Continue to [value-function methods](/en/learn/ch08/) to replace tables with features.
