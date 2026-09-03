---
id: exp-ch09-policy-gradient
translation_key: exp-ch09-policy-gradient
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.1-9.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 策略梯度实验
description: 重放带种子的 softmax 策略梯度更新，并比较状态 baseline。
aside: false
outline: deep
---

# 策略梯度实验

本原创伴随实验使用三个上下文、三个动作的上下文赌博机。Rust/Wasm 在 Worker 中采样上下文和动作；Vue 显示 softmax 行、对数概率得分、回报、baseline、优势和参数更新。

::: info 原创伴随实验
奖励表、轨迹格式、控件、问题和回退计算均为原创，引用第九章主题但不再发布原文、图表、例题、问题或代码。
:::

::: warning 有限运行边界
精确目标只针对这个小型教学表计算。有限轨迹不能证明策略梯度定理的渐近结论。
:::

<PolicyGradientLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但下面的公式、奖励表和手算更新仍可阅读。
</noscript>

<a id="experiment-question"></a>

## 实验问题

固定奖励表、步长、折扣和回合预算，用种子 `5eed` 比较“REINFORCE（b = 0）”与“REINFORCE + 状态 baseline”。改变的是期望目标，还是主要改变了有限更新的方差？

<a id="setup"></a>

## 设置与控制

上下文从 $s\in\{0,1,2\}$ 均匀采样，每个上下文有三个动作。观测奖励为 $R=r(s,a)+\xi$，其中 $\xi$ 是由 Rust 持有的有界居中扰动。控制包括 alpha、折扣、噪声、回合预算、模式和十六进制种子。

<a id="equations"></a>

## 可审计公式

对采样上下文行，

$$
\pi(a\mid s)=\frac{e^{\theta_{s,a}}}{\sum_b e^{\theta_{s,b}}},\qquad z=e_A-\pi(\cdot\mid S)，
$$

$$
G=\gamma R,\qquad A=G-b(S),\qquad \Delta\theta=\alpha A z。
$$

表格会显示每个因子，baseline 在形成当前行后更新。

<a id="manual-fallback"></a>

## 无 JavaScript 手算

从均匀行 $(1/3,1/3,1/3)$ 开始。若动作 1 得到回报 $G=1.5$、$\alpha=0.2$，得分为 $(-1/3,2/3,-1/3)$，softmax 重新归一化前增量为 $(-0.1,0.2,-0.1)$。若 baseline 为 $1$，将 $G$ 换为 $0.5$。

<a id="questions"></a>

## 思考题

1. 未采样的上下文行 logits 是否保持不变？
2. 得分向量是否和为零？
3. 固定种子后，启用 baseline 改变了哪一种方差？
4. 为什么精确目标只是参考，而不是无模型输入？

<a id="next"></a>

记录种子和一行轨迹后，继续学习[第十章 Actor–Critic](../learn/ch10/)。
