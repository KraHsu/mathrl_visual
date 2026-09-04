---
id: ch09-q-and-a
translation_key: ch09-q-and-a
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第九章问答"
description: 回顾 softmax 得分、指标、baseline 和 REINFORCE。
outline: deep
---

# 第九章问答

<a id="q1"></a>

## 得分向量为何和为零？

因为 softmax 行已归一化。对数概率导数为 $e_a-\pi$，各项和为 $1-1=0$。重新归一化后，更新仍在概率单纯形中。

<a id="q2"></a>

## baseline 为何能降低方差？

baseline 从采样回报中减去一个状态中心。它乘以得分后的期望为零，所以保留均值方向，却可能让有限样本乘积更集中。

<a id="q3"></a>

## 高熵策略就是最优吗？

不是。熵描述分布展开程度，目标描述期望奖励。早期探索策略可能高熵，学习后熵通常下降。

<a id="q4"></a>

## 实验中的精确目标是什么意思？

它是针对固定小奖励表的独立计算，不是一般无模型学习器可以获得的 oracle。
