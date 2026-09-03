---
id: ch10-qac
translation_key: ch10-qac
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Q actor–critic（QAC）"
description: 将 softmax actor 与动作价值 critic 配对，并检查耦合更新。
outline: deep
---

# Q actor–critic（QAC）

<a id="actor"></a>

## Actor 更新

QAC 用动作价值估计作为标量权重：

$$
\theta\leftarrow\theta+\alpha_\theta\,\nabla\log\pi_\theta(a\mid s)\,Q(s,a;w)。
$$

对 softmax actor，得分是 one-hot 向量减去概率行。

<a id="critic"></a>

## Critic 更新

动作价值 critic 可以使用一步 SARSA 风格目标：

$$
\delta=r+\gamma Q(s',a';w)-Q(s,a;w),\qquad w\leftarrow w+\alpha_w\delta\nabla_wQ(s,a;w)。
$$

终止状态的 bootstrap 为零，必须显式显示，避免错误地估计终止自环。

<a id="trace"></a>

## 阅读轨迹

实验记录动作前的 actor 概率、采样动作、更新前的 critic 值和两个参数增量。更新顺序是可复现契约的一部分。

<a id="next"></a>

继续阅读 [A2C](./a2c)。
