---
id: ch10-q-and-a
translation_key: ch10-q-and-a
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第十章问答"
description: 回顾 QAC、A2C、重要性采样和确定性 actor。
outline: deep
---

# 第十章问答

<a id="q1"></a>

## 为什么叫 Actor–Critic？

actor 改变选择动作的策略，critic 评价这些选择并提供学习信号。名称描述角色，不是两个独立环境。

<a id="q2"></a>

## 什么是优势？

优势将动作结果与状态 baseline 比较。一步 TD 误差是实用的带噪估计，结果好于预期时可为正，否则为负。

<a id="q3"></a>

## 为什么公开行为概率？

没有 $\mu(a\mid s)$，重要性比率就无法审计。离策略修正只有在行为策略支持采样动作时才有意义。

<a id="q4"></a>

## 确定性模式只是 ε=0 吗？

不是。softmax 中 ε=0 仍然有概率模型和 log-probability 得分；确定性策略梯度使用不同的 actor 接口。实验将离散模式标为类比。
