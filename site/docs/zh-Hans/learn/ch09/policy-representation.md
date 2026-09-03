---
id: ch09-policy-representation
translation_key: ch09-policy-representation
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "策略表示：从表格到函数"
description: 理解动作概率从表格条目变为参数输出后发生了什么变化。
outline: deep
---

# 策略表示：从表格到函数

<a id="table-function"></a>

## 从条目到参数

表格为每个状态—动作对保存一个概率；函数表示只保存参数向量 $\theta$，并计算

$$
\pi_\theta(a\mid s)=f_\theta(s,a)。
$$

表示改变了三个问题：如何定义最优、如何更新，以及如何查询动作概率。策略表示变化本身不会改变环境。

<a id="softmax"></a>

## 透明的 softmax 示例

对 logits $\theta_{s,0},\ldots,\theta_{s,m-1}$，定义

$$
\pi_\theta(a\mid s)=\frac{\exp(\theta_{s,a})}{\sum_b\exp(\theta_{s,b})}。
$$

指数化前减去最大 logit 在数学上等价，却能避免溢出。实验每次更新都显示概率和所选行的 logits。

<a id="score"></a>

## 得分向量

softmax 行中动作 $a$ 的得分为

$$
\nabla_{\theta_s}\log\pi_\theta(a\mid s)=e_a-\pi_\theta(\cdot\mid s)。
$$

各项和为零：提高一个偏好必须由其他偏好的降低来平衡。因此应显示完整向量，而不只是被选动作。

<a id="questions"></a>

## 自检问题

- 大参数更新后，一行概率仍会和为一吗？
- 奖励噪声改变的是得分、回报，还是两者？
- 两个参数向量为何可能有相同排序却有不同探索概率？

<a id="next"></a>

继续阅读[策略指标](./metrics)。
