---
id: ch09-reinforce
translation_key: ch09-reinforce
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "REINFORCE：采样策略梯度"
description: 审计一次完整采样更新，理解 baseline 改变的是方差而非期望方向。
outline: deep
---

# REINFORCE：采样策略梯度

<a id="algorithm"></a>

## 一次有限更新

对采样上下文 $s$、动作 $a$ 和回报 $G$，核心递推为

$$
\theta_{s,:}\leftarrow\theta_{s,:}+\alpha\,G\,(e_a-\pi_{s,:})。
$$

只有被采样的上下文行会改变。实验同时保留未改变的行，便于验证局部性。

<a id="baseline"></a>

## 加入状态 baseline

用运行估计 $b(s)$，标量变为优势样式的 $A=G-b(s)$：

$$
\theta_{s,:}\leftarrow\theta_{s,:}+\alpha\,A\,(e_a-\pi_{s,:})。
$$

baseline 在形成当前行后更新，因此显示行没有更新顺序歧义。

<a id="variance"></a>

## 比较什么

固定种子、奖励表和步长，比较回报方差、优势方差、熵和期望目标。baseline 可以缩小更新幅度的有限样本离散程度，同时保持期望梯度中性。

<a id="finite-boundary"></a>

::: warning 有限运行边界
浏览器在配置的回合预算处停止。“已收敛”只是最近一次更新较小的诊断，不是极限条件的证明。
:::

<a id="next"></a>

继续阅读[章节总结](./summary)或打开[实验](/zh-Hans/labs/ch09-policy-gradient)。
