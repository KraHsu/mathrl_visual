---
id: ch07-q-learning
translation_key: ch07-q-learning
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Q-learning
description: 对比贪心引导项与实际采样动作，理解异策略更新。
outline: deep
---

# Q-learning

<a id="optimality-backup"></a>
## 贪心目标

Q-learning 用下一状态的贪心最大值替代下一采样动作：

$$Q_{t+1}(S_t,A_t)=Q_t(S_t,A_t)+\alpha\big[R_{t+1}+\gamma\max_aQ_t(S_{t+1},a)-Q_t(S_t,A_t)\big].$$

行为策略可以探索，而目标策略保持贪心；这正是异策略区别。

<a id="compare"></a>
## 与 SARSA 对比

固定种子与 $\epsilon$，在 SARSA 和 Q-learning 间切换并检查目标列。风扰动作仍是真实样本；Q-learning 只改变引导项，不会改写已发生的转移。
