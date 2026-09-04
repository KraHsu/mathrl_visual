---
id: appendix-convergence
translation_key: appendix-convergence
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix convergence"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 随机序列与收敛
description: 区分有限轨迹诊断和关于概率极限的陈述。
outline: deep
---

# 随机序列与收敛

<a id="three-questions"></a>

## 三个不同的问题

对随机序列 $X_1,X_2,\ldots$ 和目标 $x$，要把下面三种说法分开：

| 问题 | 非正式含义 |
| --- | --- |
| 几乎处处收敛 | 以概率 1，整个尾部最终都保持接近； |
| 依概率收敛 | 偏离目标的概率趋于 0； |
| 有限前缀精度 | 我们恰好查看的那些迭代点比较接近。 |

浏览器实验可以直接测量第三行。它是有用证据，却不能替代定理所需的假设。

<a id="step-size"></a>

## 步长承担两项要求

许多随机逼近递推具有形式

$$x_{k+1}=x_k+a_k\,(h(x_k)+\xi_{k+1})。$$

一个常见的充分模式是

$$\sum_{k=0}^{\infty}a_k=\infty,
\qquad \sum_{k=0}^{\infty}a_k^2<\infty,$$

同时还要满足噪声与漂移条件。第一项和防止更新过早停止，第二项和限制噪声累积。常数步长故意不满足第二项，因此它的长期含义不同。

<a id="contraction"></a>

## 收缩作为确定性比较

在折扣有限 MDP 中，Bellman 算子常满足

$$\lVert T v-T u\rVert_\infty
 \le \gamma\lVert v-u\rVert_\infty,
\qquad 0\le\gamma<1.$$

这表示一次应用会缩小最坏坐标差异，但不表示每条带噪声的样本路径都单调缩小；采样更新可能先偏离，整体行为再改善。

<a id="diagnostic"></a>

## 实验中应该记录什么

记录种子、步长调度、噪声尺度、迭代预算、残差，以及运行是由预算还是容差停止。随机逼近实验把结果标为**收敛**、**截断**或**预算耗尽**，避免把短轨迹误读成定理。

比较两种语言时，相同配置和种子应在文档约定的浮点容差内产生相同观测。
