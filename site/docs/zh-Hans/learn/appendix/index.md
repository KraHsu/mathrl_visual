---
id: appendix-overview
translation_key: appendix-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix overview"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "附录：数学工具箱"
description: 为概率、收敛、线性代数和优化准备的双语数学工具箱。
outline: deep
---

# 附录：数学工具箱

本伴读的实验会反复使用一组小而重要的数学工具。本附录是为便于核对而写的**原创参考**，帮助你在阅读第一至十章时随时回看。它只参考上游附录的主题，不复制上游文字、图、习题或代码。

::: info 范围与来源
本站是非官方伴读。[上游附录 PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/4%20-%20Appendix.pdf) 仅作为主题参考。固定 blob 和校验和见[来源与版本记录](/zh-Hans/about/source-version)。
:::

<a id="route"></a>

## 工具箱路线

| 单元 | 适合在什么时候使用 |
| --- | --- |
| [概率与期望](./probability) | 把转移行和采样奖励写成期望； |
| [随机序列与收敛](./convergence) | 说明有限轨迹能、不能说明什么； |
| [向量、范数与投影](./linear-algebra) | 阅读 Bellman 矩阵方程和特征更新； |
| [梯度几何与优化](./optimization) | 把策略/价值更新联系到方向和步长； |
| [中英符号术语表](./glossary) | 在符号与中英文术语之间切换。 |

<a id="how-to-read"></a>

## 每页的使用方法

1. 代入数字前，先写清对象及其定义域。
2. 区分期望、一次样本和极限这三类陈述。
3. 把范数、容差和下标约定留在笔记中。
4. 将公式与实验的数值表对照；数值表是审计工具，不是证明。

本伴读刻意使用有限例子，让每一项都能检查，同时不把一次短浏览器运行冒充渐近定理。

<a id="errata"></a>

## 勘误与更新

上游仓库单独发布了[勘误 PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/5%20-%20Errata%20for%20the%20Springer%20version.pdf)。本站只提供链接，不复制勘误文字。当勘误改变实验解释时，本站会记录受影响的内容版本，同时保留旧结果的可复现性。

将页面视为生产内容前，请检查其审核标记、来源版本以及[许可证页面](/zh-Hans/about/license)。
