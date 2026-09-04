---
id: ch06-stochastic-gradient-descent
translation_key: ch06-stochastic-gradient-descent
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "随机梯度下降：用样本做优化"
description: 将期望目标连接到带噪梯度，识别 SGD 是 Robbins–Monro 的实例，并理解最优点附近的随机性。
outline: deep
---

# 随机梯度下降：用样本做优化

随机梯度下降（SGD）常被当作实用优化器介绍，但它在这里的数学角色更明确：用单个样本计算的梯度替代不可直接得到的期望梯度。这个替换把批量优化问题变成随机逼近递推。

::: info 原创伴读说明
下面的目标函数例子、梯度分解和诊断项都是原创解释材料。它们覆盖上游 SGD 主题，但不复制原文、证明、图或数值示例。
:::

<a id="learning-goals"></a>

## 学习目标

完成本单元后，你应该能够：

1. 写出期望目标和真实梯度；
2. 推导单样本 SGD 更新；
3. 解释 SGD 为什么是 Robbins–Monro 的一个实例；
4. 理解最优点附近相对梯度噪声为何变大；
5. 说明收敛陈述何时才有意义。

<a id="expected-objective"></a>

## 从期望目标开始

设 $X$ 是随机输入，$f(w,X)$ 是标量损失。总体目标为

$$
J(w)=\mathbb E[f(w,X)].
$$

当可以交换微分与期望时，真实梯度是

$$
\nabla J(w)=\mathbb E[\nabla_w f(w,X)].
$$

完整梯度下降会使用这个期望：

$$
w_{k+1}=w_k-a_k\,\mathbb E[\nabla_w f(w_k,X)].
$$

这个表达式概念上很清楚，却经常不可用：$X$ 的分布可能未知，或者计算期望需要过多样本。

<a id="stochastic-update"></a>

## 用一个样本替代真实梯度

给定新样本 $x_{k+1}$，SGD 使用

$$
w_{k+1}=w_k-a_k\nabla_w f(w_k,x_{k+1}).
$$

把观测梯度分成信号与噪声：

$$
\nabla_w f(w_k,x_{k+1})
=\mathbb E[\nabla_w f(w_k,X)]+\eta_k,
$$

在合适的采样协议下，$\eta_k$ 的条件均值为零。因此 SGD 就是带有扰动 $-a_k\eta_k$ 的真实梯度下降。

<a id="rm-connection"></a>

## SGD 是 Robbins–Monro 问题

可以把优化写成梯度求根：

$$
g(w)=\nabla J(w),
\qquad g(w^*)=0.
$$

可观测的 $\nabla_w f(w,x)$ 是 $g(w)$ 的带噪测量。把它代入 RM 递推，恰好得到 SGD 更新。这个联系把步长和噪声问题从求根迁移到优化，同时不会把随机梯度冒充成真实梯度。

<a id="mean-special-case"></a>

## 均值估计再次出现

对标量或向量随机变量 $X$，选择平方损失

$$
f(w,X)=\frac12\lVert w-X\rVert^2.
$$

此时 $\nabla_w f(w,x)=w-x$，而最小化 $J(w)$ 的解是 $w^*=\mathbb E[X]$。SGD 递推变成

$$
w_{k+1}=w_k-a_k(w_k-x_{k+1}),
$$

正是[前一个单元](./mean-estimation)中的在线均值估计器。这个例子不是巧合：它说明“优化”“求根”和“均值估计”可以从三个角度描述同一条更新。

<a id="relative-noise"></a>

## 为什么最优点附近的轨迹不同

即使真实梯度很小，随机梯度仍可能有绝对波动。只要分母不为零，一个有用的标量诊断是相对误差

$$
\delta_k=
\frac{|\nabla f(w_k,x_{k+1})-\mathbb E[\nabla f(w_k,X)]|}
     {|\mathbb E[\nabla f(w_k,X)]|}.
$$

离 $w^*$ 较远时，真实梯度可能压过波动，轨迹类似普通梯度下降。接近 $w^*$ 时，分母缩小，而样本噪声不一定缩小，于是相对误差变大，轨迹看起来会抖动。

这不一定是失败。绝对距离仍可能继续下降，即使相对噪声上升。请同时绘制两者，不要只凭锯齿判断收敛。

<a id="convergence-conditions"></a>

## 收敛陈述依赖的假设

常见的标量陈述要求曲率为正且有界：

$$
0<c_1\leq\nabla_w^2 f(w,X)\leq c_2,
$$

还要求 Robbins–Monro 步长级数条件和独立同分布样本 $x_k$。向量问题会把曲率换成 Hessian 或合适单调算子的条件。常数实际步长仍可能产生有用的稳定分布，但那不同于精确的几乎必然收敛结论。

<a id="lab-diagnostics"></a>

## 在实验中观察 SGD

[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)会显示采样梯度、其运行均值、目标函数和到目标的距离。固定同一种子，比较：

| 改变 | 要问的问题 |
| --- | --- |
| 调和步长换成常数步长 | 后期轨迹会稳定还是持续游走？ |
| 低噪声换成高噪声 | 增长的是绝对误差还是只有相对误差？ |
| 单样本换成小批量 | 平均掉了多少波动？ |
| 远初值换成近初值 | 信噪比在哪里改变？ |

改变一个因素时保持目标和样本分布不变，否则更平滑的曲线可能只是在解决另一个问题。

<a id="check-yourself"></a>

## 自测

若真实梯度为 $3$，采样梯度为 $5$，则随机梯度噪声 $\eta=2$。当 $a_k=0.1$ 时，更新为 $w_{k+1}=w_k-0.5$，不是 $w_k-0.3$，也不是 $w_k-0.1$。步长只对观测到的梯度应用一次。

<a id="read-next"></a>

## 继续阅读

阅读[批量与小批量更新](./mini-batch)，了解每次更新的样本数如何改变方差、工作量和可复现性。然后用[总结](./summary)连接四种更新族。
