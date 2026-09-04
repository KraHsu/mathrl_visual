---
id: ch07-q-and-a
translation_key: ch07-q-and-a
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.7"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Chapter 7 Q&A
description: Short prompts for checking the target and policy distinction.
outline: deep
---

# Chapter 7 Q&A

<a id="questions"></a>
## Questions

**Why is SARSA on-policy?** Its target contains the next action sampled from the same policy that generated data.

**Why is Q-learning off-policy?** Its target uses a greedy maximum even when behaviour explores.

**Does a small TD error prove optimality?** No. It is a local finite-prefix diagnostic and can be misleading under poor coverage or truncation.
