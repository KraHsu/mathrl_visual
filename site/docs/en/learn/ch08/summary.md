---
id: ch08-summary
translation_key: ch08-summary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.1-8.4"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Chapter 8 summary
description: A checklist for value-function approximation.
outline: deep
---

# Chapter 8 summary

<a id="checklist"></a>
## Checklist

- A feature vector maps a state to shared parameters.
- Linear TD uses the feature vector as its gradient.
- Generalization can improve coverage and spread error.
- SARSA and Q-learning differ in their action-value target.
- Replay and a lagged target network make DQN updates less correlated, but add their own schedules and diagnostics.

Continue to [policy-gradient methods](/en/learn/ch09/) for a function that represents actions directly.
