---
id: ch09-overview
translation_key: ch09-overview
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.1-9.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "第九章：策略梯度方法"
description: 从表格策略走向参数化 softmax，并用采样梯度更新策略。
outline: deep
---

# 第九章：策略梯度方法

前面的章节先改进价值，再从表格中读取策略。本章反过来：参数向量产生动作概率，标量目标告诉我们如何移动参数。伴随实验使用上下文赌博机，让每个得分函数项都可见。

::: info 原创伴读说明
本页是对固定章节主题的原创导读，不复制原文、图表、证明、例题、问题或代码。
:::

<a id="learning-goals"></a>

## 学习目标

1. 区分表格策略和参数化策略；
2. 说明平均价值或平均奖励等标量目标；
3. 使用对数导数恒等式写出策略梯度；
4. 审计一次包含 baseline 和方差的 REINFORCE 更新。

<a id="chapter-map"></a>

## 本章路线

```text
策略表示 → 标量指标 → 策略梯度定理 → 采样回报（REINFORCE）→ 方差与 baseline
```

要区分真实期望和浏览器使用的有限样本；好看的轨迹只说明一个种子下的证据，不是最优性定理。

<a id="lab-preview"></a>

## 打开实验

[策略梯度实验](/zh-Hans/labs/ch09-policy-gradient)从三个上下文、三个动作的均匀 softmax 行开始。固定种子 `5eed`，比较“REINFORCE（b = 0）”与状态 baseline，并同时查看采样回报、得分梯度、参数更新、目标、熵和更新方差。

<a id="notation"></a>

## 贯穿符号

令 $\theta$ 收集策略参数，$\pi_\theta(a\mid s)$ 是归一化的动作分布。核心估计器为

$$
\widehat{\nabla J}=G\,\nabla_\theta\log\pi_\theta(A\mid S).
$$

若 baseline 与采样动作无关，可将 $G$ 换成 $G-b(S)$，期望梯度不变。

<a id="next"></a>

## 继续

先读[策略表示](./policy-representation)，再用[策略指标](./metrics)明确“更好”的含义。
