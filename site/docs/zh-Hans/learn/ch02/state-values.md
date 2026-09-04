---
id: ch02-state-values
translation_key: ch02-state-values
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.1-2.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 状态价值
description: 从一次采样得到的折扣回报，走向固定策略下某个状态的期望回报。
outline: deep
---

# 状态价值

一段已记录的回合回答“这一次得到了多少回报”。状态价值则回答“从这里出发，随后遵循一个给定策略，预期会得到多少回报”。即使它们采用同一个回报定义，两者也不是同一对象。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 区分样本回报与它的条件期望；
2. 解释 $v_\pi(s)$ 中隐含的全部条件；
3. 在不漏掉进入终止状态所得奖励的前提下处理终止状态价值；
4. 判断哪些变化会改变状态价值。

<a id="return-random-variable"></a>

## 在未来发生前，回报是随机变量

从时刻 $t$ 开始，把折扣回报定义为

$$
G_t=\sum_{k=0}^{T-t-1}\gamma^kR_{t+k+1},
$$

其中回合在时刻 $T$ 结束。在环境和策略尚未生成未来之前，$G_t$ 是一个随机变量。它的随机性可能来自动作采样、随机转移、随机奖励或初始状态。

回合一旦被记录，同一个符号就在该样本上取得一个具体数值。一次格外好或格外差的样本，不能与相同条件下反复出发所得结果的期望混为一谈。

<a id="state-value-definition"></a>

## 给定当前状态与策略

策略 $\pi$ 的状态价值函数定义为

$$
v_\pi(s)
=\mathbb E_\pi[G_t\mid S_t=s].
$$

这个定义固定了四件事：

- 当前状态是 $s$；
- 未来动作由策略 $\pi$ 产生；
- 未来结果遵循环境模型；
- 奖励按照给定折扣因子 $\gamma$ 与终止规则组合。

因此，如果没有默认的策略和任务设定，“状态 $s$ 的价值”这句话并不完整。换一个策略、奖励规则、转移模型、折扣因子或终止约定，同一状态的价值都可能改变。

<a id="expectation-not-score"></a>

## 价值是期望，不是贴在格子上的标签

设想一个位于岔路口的维护机器人。在固定的巡检策略下，一半可能的未来很快结束，另一半则需要昂贵的绕行。状态价值会按概率平均所有这些未来的折扣回报。它不必等于任何一次实际运行可能产生的回报。

例如，某状态以 $0.25$ 的概率得到回报 $4$，以 $0.75$ 的概率得到回报 $0$，那么

$$
v_\pi(s)=0.25(4)+0.75(0)=1.
$$

这个例子中没有任何一次运行的回报是 $1$。期望概括的是分布，不一定是可直接观察到的结果。

这也说明，价值热图不是即时奖励地图。即时奖励为零的状态仍可能具有正价值，因为按照该策略继续行动，未来仍可能到达有价值的结果。

<a id="terminal-convention"></a>

## 先计入进入奖励，再停止

对回合式模型，一种方便的约定是令终止状态 $s_\mathrm{term}$ 的价值为

$$
v_\pi(s_\mathrm{term})=0.
$$

这**不会**丢掉到达终止状态的奖励。该奖励是进入终止状态的那次转移上的 $R_{t+1}$。零只表示终止之后没有更多奖励。

如果进入终止状态会得到奖励 $5$，最后一步目标就是

$$
5+\gamma v_\pi(s_\mathrm{term})=5.
$$

把“进入时的奖励”与“进入后的价值”混在一起，是重复计算奖励的常见来源。

<a id="value-dependencies"></a>

## 什么变化会改变价值？

| 变化 | $v_\pi$ 会改变吗？ | 原因 |
| --- | --- | --- |
| 在同一模型和策略下再采样一次 | 数学期望不会 | 只有观察到的回报变了 |
| 改变 $\pi$ | 会 | 未来动作概率变了 |
| 改变转移或奖励规则 | 会 | 未来结果变了 |
| 改变 $\gamma$ | 通常会 | 未来奖励的权重变了 |
| 只给状态换名字，不改变规则 | 不会 | 标签本身没有数学作用 |

本章把 $\pi$ 视为固定对象，只评估这个策略；不搜索最优策略，不进行贪心改进，也不运行价值迭代。

<a id="self-check"></a>

## 自测

1. 两个回合从同一个状态出发、遵循同一个随机策略，分别产生回报 $-2$ 与 $6$。其中某个数必须等于 $v_\pi(s)$ 吗？
2. 为什么两个策略可以给同一个物理状态赋予不同价值？
3. 如果最后一次转移奖励为 $3$，并进入价值为零的终止状态，那么在计入更早时刻的折扣之前，这个一步目标是多少？

::: details 核对答案
1. 不必。它们只是回报分布中的两个样本；状态价值是该分布的条件期望。
2. 两个策略会诱导不同的未来动作概率，从而诱导不同的未来回报分布。
3. 贡献是 $3+\gamma(0)=3$。
:::

<a id="chapter-links"></a>

## 继续学习第二章

接下来推导 [Bellman 方程](./bellman-equation)，把期望回报改写为一步递推关系。

第二章先导版页面：[概览](/zh-Hans/learn/ch02/) · [状态价值](/zh-Hans/learn/ch02/state-values) · [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation) · [矩阵形式](/zh-Hans/learn/ch02/matrix-form) · [策略评估](/zh-Hans/learn/ch02/policy-evaluation) · [动作价值](/zh-Hans/learn/ch02/action-values) · [检查点](/zh-Hans/learn/ch02/checkpoint) · [实验](/zh-Hans/labs/bellman-grid)
