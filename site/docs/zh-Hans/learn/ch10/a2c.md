---
id: ch10-a2c
translation_key: ch10-a2c
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "优势 Actor–Critic（A2C）"
description: 用 TD 误差优势替代原始动作价值，并理解 baseline 方差。
outline: deep
---

# 优势 Actor–Critic（A2C）

<a id="baseline"></a>

## 状态 baseline

状态价值 $V(s)$ 是与动作无关的 baseline。从动作价值中减去它，可以保持策略梯度期望方向，同时常常降低有限样本方差。

<a id="advantage"></a>

## TD 误差作为优势估计

实验使用的一步估计是

$$
\widehat A_t=\delta_t=r_{t+1}+\gamma V(s_{t+1})-V(s_t)。
$$

actor 使用 $\widehat A_t$，critic 则让 $V(s_t)$ 靠近同一目标。更长的实现可以使用资格迹或多步回报。

<a id="comparison"></a>

## QAC 与 A2C

QAC 用 $Q(s,a)$ 加权 actor；A2C 用优势估计加权。因此即使访问同一个转移，两条轨迹的尺度和方差也可能不同。

<a id="next"></a>

继续阅读[离策略 Actor–Critic](./off-policy)。
