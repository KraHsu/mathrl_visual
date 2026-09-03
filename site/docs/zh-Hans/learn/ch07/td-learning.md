---
id: ch07-td-learning
translation_key: ch07-td-learning
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: TD 状态价值学习
description: 将一步 TD 备份看作随机逼近更新。
outline: deep
---

# TD 状态价值学习

<a id="backup"></a>
## 一步备份

给定策略 $\pi$，Bellman 期望方程给出样本目标

$$\bar V_t=R_{t+1}+\gamma V_t(S_{t+1}).$$

TD 误差为 $\delta_t=\bar V_t-V_t(S_t)$，只有访问到的条目改变：

$$V_{t+1}(S_t)=V_t(S_t)+\alpha\delta_t.$$

未访问状态保持不变，这是它与完整模型扫描的关键区别。

<a id="audit"></a>
## 审计一行

记录 $(S_t,R_{t+1},S_{t+1})$、终止标志、旧值、目标与误差。若转移终止，目标应为 $R_{t+1}$，不应为目标状态虚构价值。

::: tip 动手试试
打开[实验](/zh-Hans/labs/ch07-temporal-difference)，选择 **TD(0)** 并点击“推进一次转移”，检查器会展示上述算式。
:::
