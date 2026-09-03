---
id: ch09-checkpoint
translation_key: ch09-checkpoint
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
title: "第九章检查点"
description: 在打开实验前练习一次 softmax 得分更新并解释 baseline 不变性。
outline: deep
---

# 第九章检查点

::: warning 范围
下面是有限算术检查，不是策略梯度收敛证明。
:::

<a id="score-update"></a>

## 1. 得分更新

若一行概率为 $(0.2,0.5,0.3)$，选中动作 $a=1$，回报 $G=2$，$\alpha=0.1$，则得分为 $(-0.2,0.5,-0.3)$，参数增量为 $(-0.04,0.10,-0.06)$。

<a id="baseline-check"></a>

## 2. Baseline 检查

若 $b(s)=1.5$，标量权重为 $A=0.5$。得分不变，每个参数增量正好是无 baseline 时的四分之一。

<a id="objective-check"></a>

## 3. 目标与样本

解释为什么两个种子能产生不同采样回报，而相同参数向量下的精确目标不变。前者包含奖励抽样，后者直接求和固定表。

<a id="next"></a>

打开[策略梯度实验](/zh-Hans/labs/ch09-policy-gradient)，用种子 `5eed` 核对第一行。
