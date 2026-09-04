---
id: appendix-optimization
translation_key: appendix-optimization
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix optimization"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 梯度几何与优化
description: 用可审计的小例子连接梯度、损失、策略和步长。
outline: deep
---

# 梯度几何与优化

<a id="direction"></a>

## 梯度是局部方向

对可微目标 $J(\theta)$，在欧氏范数下，梯度 $\nabla J(\theta)$ 指向局部增幅最大的方向。下降更新为

$$\theta_{k+1}=\theta_k-\alpha_k\nabla J(\theta_k).$$

符号取决于代码是在最大化回报还是最小化损失。阅读更新账本前，先说清目标。

<a id="softmax"></a>

## Softmax 让策略留在单纯形上

对 logits $z_a$，

$$\pi(a\mid s)=\frac{e^{z_a}}{\sum_b e^{z_b}}.$$

概率为正且和为 1。数值实现可以在取指数前减去最大 logit，避免溢出而不改变结果。

<a id="noise"></a>

## 完整、随机与策略梯度更新

完整数据梯度使用全部可用项；SGD 使用一个样本或小批量，因此方向含有噪声。REINFORCE 从采样回报估计策略梯度；在满足必要独立性条件时，baseline 可以改变方差而不改变理想期望梯度。

<a id="geometry"></a>

## 几何检查清单

对每条绘制的路径，检查：

1. 目标及其符号；
2. 参数向量与特征尺度；
3. 步长调度以及裁剪/投影；
4. 目标、梯度和更新范数；
5. 是否把有限轨迹展示成了保证。

策略梯度和 Actor–Critic 实验会同时提供表格和曲线，因此不依赖颜色或动画也能检查这些几何量。
