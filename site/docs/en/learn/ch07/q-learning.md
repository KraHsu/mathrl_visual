---
id: ch07-q-learning
translation_key: ch07-q-learning
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.4"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: Q-learning
description: Contrast an off-policy greedy bootstrap with the action actually sampled.
outline: deep
---

# Q-learning

<a id="optimality-backup"></a>
## Greedy target

Q-learning replaces the next sampled action with a greedy maximum:

$$Q_{t+1}(S_t,A_t)=Q_t(S_t,A_t)+\alpha\big[R_{t+1}+\gamma\max_aQ_t(S_{t+1},a)-Q_t(S_t,A_t)\big].$$

The behaviour policy may explore, while the target policy is greedy. This separation is the defining off-policy distinction.

<a id="compare"></a>
## Compare with SARSA

Keep the seed and $\epsilon$ fixed, switch between SARSA and Q-learning, and inspect the target column. A wind-perturbed action is still a realised sample; Q-learning does not retroactively replace it, it only chooses a different bootstrap.
