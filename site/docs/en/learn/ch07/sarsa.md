---
id: ch07-sarsa
translation_key: ch07-sarsa
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.2"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: SARSA
description: Follow the state-action-reward-state-action backup and its on-policy meaning.
outline: deep
---

# SARSA

<a id="update"></a>
## State-action backup

SARSA observes $(S_t,A_t,R_{t+1},S_{t+1},A_{t+1})$ and updates

$$Q_{t+1}(S_t,A_t)=Q_t(S_t,A_t)+\alpha\big[R_{t+1}+\gamma Q_t(S_{t+1},A_{t+1})-Q_t(S_t,A_t)\big].$$

The next action is sampled from the same exploratory behaviour policy that generated the transition. That makes SARSA on-policy. An $\epsilon$-greedy policy exposes both exploitation and continued coverage.

<a id="questions"></a>
## Questions to vary

- What happens to episode length when $\epsilon$ is raised?
- Does wind change the realised action while leaving the requested policy action visible?
- Which state-action pairs remain unvisited under a small budget?

The lab's update table labels the requested action, realised transition, target, and TD error separately.
