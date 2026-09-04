---
id: exp-ch08-value-function
translation_key: exp-ch08-value-function
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
title: Value-function lab
description: Inspect feature vectors, linear TD updates, replay, and target-network cadence.
aside: false
outline: deep
---

# Value-function lab

This original companion experiment runs a compact 4×4 world in a Worker-hosted Rust/Wasm evaluator. Choose a feature map, inspect $\phi(s)$, and compare the predicted value, target, gradient, and parameter update.

::: warning Approximation boundary
The Deep-Q selector is a bounded linear surrogate that makes replay and target-network timing inspectable. It is not a general neural-network training environment.
:::

<ValueFunctionLab locale="en" />

<noscript>
The interactive controls require JavaScript, but the feature and update equations remain available on this page.
</noscript>

<a id="protocol"></a>
## Suggested protocol

1. Keep seed `5eed` and run one transition with **TD-linear** and **One-hot / tabular**.
2. Repeat with **Bias + coordinates** and compare how many cells change.
3. Select **Q-learning-linear**, then **Deep Q**, and watch replay size and target syncs.
4. Record the feature vector and loss with any screenshot; a finite loss is not a global accuracy guarantee.
