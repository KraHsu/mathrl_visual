---
id: ch08-q-learning
translation_key: ch08-q-learning
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.3"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: Action values with features
description: Extend linear TD updates from state values to SARSA and Q-learning.
outline: deep
---

# Action values with features

<a id="sarsa"></a>
## SARSA-linear

Represent $\hat q(s,a,w)=\phi(s,a)^\top w$. The SARSA target uses the next sampled action, and its gradient updates the shared parameter vector.

<a id="q-learning"></a>
## Q-learning-linear

The Q-learning target replaces that action with $\max_{a'}\hat q(s',a',w)$. The parameter update can therefore alter several action values at once, especially with coordinate features. Compare this mode with one-hot features to isolate the approximation effect.
