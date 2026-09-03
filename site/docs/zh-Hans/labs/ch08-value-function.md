---
id: exp-ch08-value-function
translation_key: exp-ch08-value-function
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.1-8.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 值函数实验
description: 检查特征向量、线性 TD 更新、经验回放与目标网络节奏。
aside: false
outline: deep
---

# 值函数实验

这是一个原创伴读实验：在 Worker 中运行 Rust/Wasm 的紧凑 4×4 世界。选择特征映射、检查 $\phi(s)$，再比较预测、目标、梯度和参数更新。

::: warning 逼近边界
Deep-Q 选择器是用于展示回放与目标网络时序的受限线性替身，不是通用神经网络训练环境。
:::

<ValueFunctionLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但本页仍提供特征与更新公式。
</noscript>

<a id="protocol"></a>
## 建议协议

1. 保持种子 `5eed`，选择 **TD-Linear** 与 **独热 / 表格**，运行一次转移。
2. 改为 **偏置 + 坐标**，比较发生变化的格子数量。
3. 选择 **Q-learning-Linear**，再选择 **Deep Q**，观察回放大小和目标同步。
4. 随截图记录特征向量与损失；有限损失不保证全局准确。
