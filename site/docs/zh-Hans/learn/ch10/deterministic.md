---
id: ch10-deterministic
translation_key: ch10-deterministic
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "确定性 Actor–Critic"
description: 标记概率策略与确定性策略梯度之间的边界。
outline: deep
---

# 确定性 Actor–Critic

<a id="boundary"></a>

## 什么变成确定性

确定性 actor 将状态映射到一个动作（连续控制中是动作向量），不再有采样的 log-probability 得分；critic 仍提供价值梯度或动作价值信号。

<a id="discrete-analogue"></a>

## 实验中的类比

为了可比性，有限实验保留双动作链并选择当前 argmax。偏好更新标注为确定性教学类比，不声称实现完整连续确定性策略梯度定理。

<a id="comparison"></a>

## 比较边界

用同一种子运行随机 A2C 与确定性模式。随机模式显示 $\pi$ 和采样动作；确定性模式显示贪心动作并保留 critic TD 误差。将这些观察分开，避免过度推广离散演示。

<a id="next"></a>

继续阅读[章节总结](./summary)。
