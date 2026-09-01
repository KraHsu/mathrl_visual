---
id: ch02-policy-evaluation
translation_key: ch02-policy-evaluation
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_sections: "2.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 迭代策略评估
description: 对固定策略执行同步 Bellman 扫描，并用 Bellman 残差衡量收敛。
outline: deep
---

# 迭代策略评估

闭式表达能够指出解，而反复执行 Bellman 扫描可以让不动点过程显现出来。从任意有限价值向量出发，对所有状态应用同一个固定策略 Bellman 算子，并持续衡量当前向量离自洽还有多远。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 执行一次同步 Bellman 扫描；
2. 解释同一轮中的全部更新为何要读取同一个旧向量；
3. 计算并解释无穷范数（最大范数）下的 Bellman 残差；
4. 准确陈述折扣情形下的收敛保证，同时不把这个方法误称为价值迭代。

<a id="bellman-operator"></a>

## 迭代同一个固定算子

对固定策略，定义

$$
T_\pi v=r_\pi+\gamma P_\pi v.
$$

迭代策略评估应用

$$
v_{k+1}=T_\pi v_k.
$$

策略、转移矩阵、奖励向量和折扣因子始终不变，只有价值估计发生变化。常见初始化是 $v_0=0$，但有限折扣模型的收敛并不要求必须从零开始。

<a id="synchronous-sweep"></a>

## 同步扫描只使用一个冻结输入

设旧向量为 $v_k$，一次同步扫描遵循以下数据流：

```text
冻结 old = v_k
对每个状态 s：
    next[s] = r_π(s) + γ Σ_s' P_π(s,s') old[s']
一次性提交 v_{k+1} = next
```

状态 $s_i$ 的更新不能读取同一轮中已经写入 `next[s_j]` 的新值。所有状态只读 `old`，等每一行都完成后再提交新向量。

如果立刻读取刚更新的条目，得到的是原地或异步方案。这类方案也可能有用，但其中间结果与追踪轨迹不同。只要界面写着“同步扫描”，就必须遵守冻结向量规则。

<a id="worked-sweeps"></a>

## 原创矩阵示例的三轮扫描

沿用[矩阵形式](./matrix-form)中的矩阵与奖励，从 $v_0=(0,0,0)^\mathsf T$ 出发，并保持 $\gamma=0.8$：

| $k$ | $v_k(a)$ | $v_k(b)$ | $v_k(z)$ |
| ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 |
| 1 | 0.8 | 1.5 | 0 |
| 2 | 1.52 | 2.10 | 0 |
| 3 | 1.808 | 2.34 | 0 |

第一轮中所有旧的后继状态价值都为零，所以只包含一步期望奖励。之后的扫描才通过固定转移图传播延续价值。这个序列逐渐逼近 $(2,2.5,0)^\mathsf T$。

<a id="bellman-residual"></a>

## 残差衡量自洽程度

对于当前估计 $v$，本章采用的 Bellman 残差定义为

$$
\delta(v)
=\lVert T_\pi v-v\rVert_\infty
=\max_s\left|(T_\pi v)(s)-v(s)\right|.
$$

它要问的是：如果再执行一次精确 Bellman 扫描，变化最大的状态会改变多少？在不考虑浮点舍入时，残差只在不动点处为零。

还要准确区分测量时刻。提交 $v_{k+1}$ 后，实验显示的是 $\delta(v_{k+1})$，概念上需要再计算 $T_\pi v_{k+1}$。它不一定等于生成 $v_{k+1}$ 时发生的最大变化。

当 $0\leq\gamma<1$ 时，残差还能给出误差上界：

$$
\lVert v-v_\pi\rVert_\infty
\leq \frac{\delta(v)}{1-\gamma}.
$$

因此，容差是关于自洽程度的停止规则，并不承诺显示出的每一位小数都等于精确解。

<a id="why-converges"></a>

## 折扣扫描为什么收敛

因为 $P_\pi$ 对向量条目求平均，

$$
\lVert P_\pi x-P_\pi y\rVert_\infty
\leq\lVert x-y\rVert_\infty.
$$

再乘以 $\gamma<1$，得到

$$
\lVert T_\pi x-T_\pi y\rVert_\infty
\leq\gamma\lVert x-y\rVert_\infty.
$$

所以 $T_\pi$ 在无穷范数下是压缩映射：应用一次后，两个估计之间的距离至多为原来的 $\gamma$ 倍。它只有一个不动点，反复同步应用就会收敛到该点。

当 $\gamma=1$ 时，这个压缩论证不再适用。要保证收敛需要更强假设，例如被评估策略是适当策略、非终止状态是暂态，并把终止状态价值固定为零。本章实验有意把 $\gamma$ 限制在 $[0,1)$。

<a id="stopping-rules"></a>

## 收敛、截断，还是仍在运行

实现应该区分三种情况：

- **已收敛：**当前 Bellman 残差不超过给定容差；
- **已截断：**达到最大扫描轮数，但尚未收敛；
- **进行中：**上述条件都不满足。

截断不等于收敛。它只给计算设置了有限工作量上限，同时保留真实残差来显示尚未完成的部分。

<a id="scope-check"></a>

## 准确命名算法

本节只评估一个给定策略，没有最大化、贪心动作选择或策略更新。因此，这个循环叫作**迭代策略评估**或**不动点迭代**。价值迭代使用另一种最优性算子，不属于第二章。

<a id="self-check"></a>

## 自测

1. 在一次同步扫描中，更新 $s_2$ 时可以读取刚算出的 $v(s_1)$ 新值吗？
2. 如果当前向量的残差是 $0.004$、容差是 $0.001$，它已经收敛了吗？
3. 如果计算只是因为达到扫描轮数上限而停止，应该报告什么状态？

::: details 核对答案
1. 不可以。同一轮中的每一行都要读取扫描开始前冻结的向量。
2. 没有。再应用一次 Bellman 算子时，仍有至少一个状态会变化超过容差。
3. 应报告“已截断”，不是“已收敛”，并继续显示残差。
:::

<a id="chapter-links"></a>

## 继续学习第二章

在 [Bellman 策略评估实验](/zh-Hans/labs/bellman-grid)中运行这个过程，再继续阅读[动作价值](./action-values)。

第二章先导版页面：[概览](/zh-Hans/learn/ch02/) · [状态价值](/zh-Hans/learn/ch02/state-values) · [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation) · [矩阵形式](/zh-Hans/learn/ch02/matrix-form) · [策略评估](/zh-Hans/learn/ch02/policy-evaluation) · [动作价值](/zh-Hans/learn/ch02/action-values) · [检查点](/zh-Hans/learn/ch02/checkpoint) · [实验](/zh-Hans/labs/bellman-grid)
