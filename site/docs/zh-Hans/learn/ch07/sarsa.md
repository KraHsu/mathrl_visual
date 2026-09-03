---
id: ch07-sarsa
translation_key: ch07-sarsa
locale: zh-Hans
origin: companion-translation
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
description: 跟随状态—动作—奖励—状态—动作备份，理解其同策略含义。
outline: deep
---

# SARSA

<a id="update"></a>
## 状态—动作备份

SARSA 观察 $(S_t,A_t,R_{t+1},S_{t+1},A_{t+1})$ 并更新

$$Q_{t+1}(S_t,A_t)=Q_t(S_t,A_t)+\alpha\big[R_{t+1}+\gamma Q_t(S_{t+1},A_{t+1})-Q_t(S_t,A_t)\big].$$

下一个动作来自产生该转移的同一个探索策略，因此 SARSA 是同策略方法。$\epsilon$-greedy 同时保留利用与覆盖能力。

<a id="questions"></a>
## 可改变的问题

- 提高 $\epsilon$ 后回合长度如何变化？
- 风扰动会怎样改变实际动作，同时保留请求动作？
- 小预算下哪些状态—动作对仍未访问？

实验表格将请求动作、真实转移、目标和 TD 误差分开标示。
