---
id: ch09-metrics
translation_key: ch09-metrics
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "策略指标"
description: 比较平均价值、平均奖励和实验显示的有限目标。
outline: deep
---

# 策略指标

<a id="average-value"></a>

## 平均价值

选择非负且和为一的状态权重 $d(s)$。折扣目标可以写作

$$
\bar v_\pi=\sum_s d(s)v_\pi(s)=\mathbb E_{S\sim d}[v_\pi(S)]。
$$

权重编码了“哪些状态重要”。只关注起点和均匀关注所有状态，可能偏好不同策略。

<a id="average-reward"></a>

## 平均奖励

持续任务也可以优化长期平均单步奖励。折扣目标和平均奖励目标的状态分布假设不同，不能不加说明地互换。

<a id="finite-objective"></a>

## 实验报告什么

上下文赌博机实验从当前 softmax 行和固定奖励表计算有限精确目标：

$$
J(\theta)=\sum_s d(s)\sum_a\pi_\theta(a\mid s)r(s,a)。
$$

采样回报带噪，而 $J(\theta)$ 是这个小型教学环境的展示参考。对照两者可分离优化信号和抽样波动。

<a id="entropy"></a>

## 熵是诊断，不是任务目标

行熵 $H(\pi_s)=-\sum_a\pi(a\mid s)\log\pi(a\mid s)$ 描述探索程度。高熵可能适合早期，但不等于高期望奖励，应与 $J$ 一起记录。

<a id="next"></a>

继续阅读[策略梯度定理](./policy-gradient-theorem)。
