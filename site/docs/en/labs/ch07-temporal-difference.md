---
id: exp-ch07-temporal-difference
translation_key: exp-ch07-temporal-difference
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
title: Temporal-Difference lab
description: Compare TD(0), SARSA, n-step SARSA, and Q-learning with a seeded transition trace.
aside: false
outline: deep
---

# Temporal-Difference lab

This original companion experiment uses a fixed 4×4 Grid World and a Worker-hosted Rust/Wasm evaluator. It reports the requested action, realised action, reward, target, TD error, and episode truncation flag.

::: warning Finite-run boundary
The lab is an executable illustration of backup arithmetic. A finite run does not establish the convergence conditions of the underlying algorithm.
:::

<TemporalDifferenceLab locale="en" />

<noscript>
The controls require JavaScript, but the update equations and comparison table remain readable below.
</noscript>

<a id="protocol"></a>
## Suggested protocol

1. Keep seed `5eed`, wind at 0, and press **One transition** in TD(0).
2. Repeat with SARSA, n-step SARSA ($n=3$), and Q-learning.
3. Compare the target column while holding the realised transition fixed as closely as the seeded stream allows.
4. Enable 20% wind and note the distinction between requested and realised actions.

The grid and table are alternative representations of the same snapshot, so the experiment remains usable without relying on colour alone.
