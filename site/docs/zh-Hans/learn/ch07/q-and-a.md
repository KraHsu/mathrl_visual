---
id: ch07-q-and-a
translation_key: ch07-q-and-a
locale: zh-Hans
origin: companion-translation
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
title: 第七章问答
description: 检查目标与策略区别的简短问题。
outline: deep
---

# 第七章问答

<a id="questions"></a>
## 问题

**为什么 SARSA 是同策略？** 因为目标包含从同一策略采样的下一动作。

**为什么 Q-learning 是异策略？** 因为目标使用贪心最大值，即使行为策略仍在探索。

**小 TD 误差能证明最优吗？** 不能；它只是有限前缀的局部诊断，在覆盖不足或截断时可能误导。
