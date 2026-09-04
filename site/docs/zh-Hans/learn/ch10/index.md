---
id: ch10-overview
translation_key: ch10-overview
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第十章：Actor–Critic 方法"
description: 组合策略 actor 与增量价值 critic，让每条信息路径都可检查。
outline: deep
---

# 第十章：Actor–Critic 方法

策略梯度给出 actor 方向，却需要价值信号。Actor–Critic 将在线估计价值的 critic 与 actor 配对。伴随实验使用原创两决策链，逐行比较 QAC、A2C、离策略修正和确定性边界。

::: info 原创伴读说明
本页是固定章节主题的原创双语导读，不再发布原文、图表、证明、例题、问题或代码。
:::

<a id="learning-goals"></a>

## 学习目标

1. 追踪一次转移中的 actor 与 critic 更新；
2. 区分 QAC 的动作价值 critic 与 A2C 的优势信号；
3. 解释离策略学习为何需要重要性比率；
4. 说明使用确定性 actor 后发生的变化。

<a id="chapter-map"></a>

## 本章路线

```text
QAC → baseline/优势（A2C）→ 离策略重要性采样 → 确定性策略梯度 → 实现边界
```

每次扩展都会改变 actor 或 critic 可获得的信息，不应悄悄改变环境或奖励含义。

<a id="lab-preview"></a>

## 打开实验

在 [Actor–Critic 实验](/zh-Hans/labs/ch10-actor-critic)中保持种子 `5eed`，采样一个回合。轨迹显示 $r$、bootstrap 目标、TD 误差 $\delta$、优势、actor 得分、critic 更新、行为概率 $\mu$、目标概率 $\pi$ 以及 $\rho=\pi/\mu$。

<a id="boundary"></a>

## 有限运行边界

链式环境刻意很小。有限运行展示更新顺序和估计器连接，不是任意 Actor–Critic 实现收敛的证据。

<a id="next"></a>

继续阅读 [QAC](./qac)。
