---
id: ch06-q-and-a
translation_key: ch06-q-and-a
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第六章问答"
description: 用简短原创答案回顾增量均值、Robbins–Monro、收敛假设、SGD 与有限实验。
outline: deep
---

# 第六章问答

把下面的问题当作检索练习。每当答案出现“收敛”时，都要追问它指的是渐近定理、有限容差标记，还是某一个种子的视觉描述。

::: info 原创伴读说明
问题与答案均为原创。它们覆盖上游章节主题，但不复制原文、图、示例或问题清单。
:::

<a id="q1"></a>

## 什么是随机逼近？

它是一类利用带噪观测去逼近根、最优点，或其他由期望定义的解的迭代方法。反复出现的要素是迭代量、步长和采样修正。

<a id="q2"></a>

## 为什么要把均值改写成增量更新？

批量平均要等所有观测到齐，并保存或重新访问它们。递推在每个样本到来时就用新的预测误差更新，因此可以随时报告当前估计。一般步长还允许估计器跟踪漂移的数据流。

<a id="q3"></a>

## Robbins–Monro 对函数知道多少？

它只需要输入和带噪输出，不需要 $g$ 或其导数的闭式表达式。不过要证明收敛，仍需关于单调性/斜率、步长和条件噪声的假设。

<a id="q4"></a>

## 为什么要求 $\sum a_k=\infty$ 与 $\sum a_k^2<\infty$？

第一条防止可能的总移动量有限，从而初值很远时被困住；第二条限制有限方差噪声的累计影响。调和调度是同时满足两条的经典例子；常数调度不满足第二条。

<a id="q5"></a>

## Dvoretzky 定理贡献了什么？

它提供可复用的误差过程模板。如果收缩不断消除误差，居中的噪声有受控方差且总能量有限，那么平方误差论证可以建立几乎必然收敛。它不能替你检查每个坐标是否满足假设。

<a id="q6"></a>

## SGD 只是更小批量的梯度下降吗？

不完全是。梯度下降使用期望或全数据梯度；SGD 使用一个采样梯度，小批量方法则平均指定数量的样本。它们共享更新形状，但噪声、采样协议、单次工作量和收敛陈述都不同。

<a id="q7"></a>

## 为什么 SGD 在最优点附近看起来更嘈杂？

真实梯度趋近于零，而采样梯度的绝对波动不一定消失。因此相对噪声会变大，即使到最优点的绝对距离仍在缩小。锯齿尾部本身不是发散证据。

<a id="q8"></a>

## 浏览器实验能证明几乎必然收敛吗？

不能。它可以重放带种子的有限前缀，显示误差和步长和，并标记调度是否具有教科书形状。几乎必然收敛描述的是满足假设的无限随机过程；有限曲线只是一个例子的证据，不是证明。

<a id="q9"></a>

## 这如何准备时间差分学习？

TD 方法同样用“步长乘以采样修正”更新估计，但修正中会出现自举的后继估计。第六章解释增量/随机机制，不会偷偷加入 TD 目标，也不声称本章已经实现 TD。

<a id="read-next"></a>

## 继续阅读

合上公式完成[检查点](./checkpoint)，再打开[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)，用数值审计同一组思想。
