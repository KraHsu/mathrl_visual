---
id: ch09-policy-gradient-theorem
translation_key: ch09-policy-gradient-theorem
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "策略梯度定理"
description: 从期望和对数导数走向按得分加权的动作价值。
outline: deep
---

# 策略梯度定理

<a id="log-derivative"></a>

## 对数导数恒等式

对正概率 $p_\theta(x)$，

$$
\nabla_\theta p_\theta(x)=p_\theta(x)\nabla_\theta\log p_\theta(x)。
$$

这个恒等式把导数移到对数概率上，结果是可以在策略自身动作分布下采样的期望。

<a id="discounted"></a>

## 折扣策略梯度

概括地说，定理给出

$$
\nabla J(\theta)=\mathbb E\left[\nabla_\theta\log\pi_\theta(A\mid S)\,q_\pi(S,A)\right]。
$$

状态权重取决于目标。定理确定方向，却不会自动提供精确动作价值。

<a id="sampled"></a>

## 把定理变成一行更新

用采样回报 $G$ 代替 $q_\pi(S,A)$。实验表格中的三个因子是：得分 $e_A-\pi(\cdot\mid S)$、标量权重 $G$ 或 $G-b(S)$，以及它们乘以 $\alpha$ 后的参数更新。

<a id="baseline-invariance"></a>

## Baseline 不变性

若 $b(S)$ 与动作无关，则

$$
\mathbb E[\nabla\log\pi(A\mid S)b(S)]=0，
$$

因为动作概率和为一。期望不变，有限样本方差可能下降。

<a id="next"></a>

继续阅读 [REINFORCE 更新](./reinforce)。
