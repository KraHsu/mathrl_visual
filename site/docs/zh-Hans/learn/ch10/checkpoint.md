---
id: ch10-checkpoint
translation_key: ch10-checkpoint
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第十章检查点"
description: 计算一次 TD 目标、优势、actor 更新和重要性比率。
outline: deep
---

# 第十章检查点

::: warning 范围
下面是一次有限转移的算术，不是收敛证明。
:::

<a id="td"></a>

## 1. TD 目标

设 $r=2$、$\gamma=0.9$，下一状态因终止而价值为 $0$。目标为 $2$；若当前 critic 值为 $0.4$，则 $\delta=1.6$。

<a id="advantage"></a>

## 2. 优势 actor 更新

动作概率为 $(0.6,0.4)$ 且选择动作 0 时，得分为 $(0.4,-0.4)$。取 $\alpha_\theta=0.1$、优势 $1.6$，actor 增量为 $(0.064,-0.064)$。

<a id="ratio"></a>

## 3. 重要性比率

若目标概率为 $0.6$、行为概率为 $0.3$，则 $\rho=2$。离策略标量信号在乘以得分前加倍。

<a id="next"></a>

打开 [Actor–Critic 实验](/zh-Hans/labs/ch10-actor-critic)，在一行中核对这些字段。
