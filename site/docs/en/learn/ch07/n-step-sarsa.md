---
id: ch07-n-step-sarsa
translation_key: ch07-n-step-sarsa
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.3"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: n-step SARSA
description: See how delayed backups interpolate between one-step SARSA and Monte Carlo returns.
outline: deep
---

# n-step SARSA

<a id="return"></a>
## A tunable target

For horizon $n$, the target for $(S_t,A_t)$ is

$$G_t^{(n)}=R_{t+1}+\gamma R_{t+2}+\cdots+\gamma^{n-1}R_{t+n}+\gamma^nQ(S_{t+n},A_{t+n}).$$

The evaluator waits until the required observations arrive, then applies the update. When an episode ends first, the pending queue is flushed without a fictitious bootstrap.

<a id="tradeoff"></a>
## Bias and variance lens

Small $n$ reuses a current estimate and usually has lower variance; large $n$ uses more realised rewards and moves toward MC. Compare the target and `n-step return` columns rather than only the final policy.

Try $n=1$, $n=3$, and a horizon larger than the episode cap in the [lab](/en/labs/ch07-temporal-difference).
