---
id: ch03-optimal-values
translation_key: ch03-optimal-values
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 最优状态价值与最优策略
description: 用逐状态价值支配定义最优性，并区分唯一的最优价值与可能不唯一的策略。
outline: deep
---

# 最优状态价值与最优策略

“平均起点表现最好”与“从每个状态出发都最好”不是同一个标准。本章采用后一种更强的逐状态定义，使最优性不依赖某个特定初始状态分布。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 用价值函数的逐分量比较定义策略优劣；
2. 定义 $v_*$ 和 $q_*$；
3. 解释策略之间为何可能无法按此标准比较；
4. 区分最优价值的唯一性与最优策略的非唯一性。

<a id="definitions"></a>

## 最优性的定义

若两个策略满足

$$
v_{\pi_1}(s)\geq v_{\pi_2}(s)
\qquad\text{对所有 }s\in\mathcal S,
$$

则称 $\pi_1$ 在价值意义上不差于 $\pi_2$。若策略 $\pi_*$ 对任意策略 $\pi$ 都满足

$$
v_{\pi_*}(s)\geq v_\pi(s)
\qquad\text{对所有 }s,
$$

则 $\pi_*$ 是最优策略。它的价值函数记为

$$
v_*(s)=\max_\pi v_\pi(s).
$$

这里的最大值不是为每个状态各挑一个彼此冲突的“未来策略”。在有限折扣 MDP 中，Bellman 最优方程会证明存在一个平稳策略，可以同时实现所有状态的这些最大值。

<a id="policy-order"></a>

## 逐状态支配是预序而非简单排行榜

逐状态支配在策略本身上通常是**预序**：它满足自反性与传递性，但两个不同策略可能产生完全相同的价值函数，从而彼此支配，不满足反对称性。若把价值函数相同的策略视为同一等价类，等价类上的关系才是偏序。

可能出现

$$
v_{\pi_A}(x)>v_{\pi_B}(x),
\qquad
v_{\pi_A}(y)<v_{\pi_B}(y).
$$

这时两个策略按逐状态标准不可比。给某个起点分布加权后可以排出平均名次，但结果会随分布改变。最优策略的定义要求一个更强结论：它必须逐状态支配所有其他策略，而不是只赢得某一组起点的平均分。

这个定义也说明奖励单位的重要性。价值比较只在同一个 MDP、同一奖励规则、同一折扣和同一终止语义中有意义。

<a id="existence-questions"></a>

## 定义留下的四个问题

单凭定义还不能保证目标可达，需要回答：

1. **存在性：**是否真有一个策略同时实现所有状态的最大值？
2. **价值唯一性：**不同最优策略会不会给出不同的 $v_*$？
3. **策略唯一性：**每个状态是否只有一个最优动作？
4. **随机性：**最优策略必须是确定性的还是可以随机化？

后面的算子分析将给出答案：在本章的有限折扣假设下，$v_*$ 存在且唯一；至少存在一个确定性平稳最优策略；若有动作并列，则最优策略可以有多个，也可以在并列动作之间随机化。

<a id="optimal-action-values"></a>

## 最优动作价值

固定第一步动作 $a$，之后始终作出最优决策，得到

$$
q_*(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_*(s')\right].
$$

因此

$$
v_*(s)=\max_a q_*(s,a).
$$

比较 $q_*$ 时，环境随机性已经在求和内部平均。若请求向右可能被风改成上、右、下或左，这四种结果都属于同一个“请求向右”的动作价值；智能体只能在发出请求之前选择动作。

$q_\pi$ 与 $q_*$ 的区别可以概括为：

| 对象 | 第一步 | 第一步之后 |
| --- | --- | --- |
| $q_\pi(s,a)$ | 固定为 $a$ | 使用给定策略 $\pi$ |
| $q_*(s,a)$ | 固定为 $a$ | 始终选择最优后续决策 |

<a id="self-check"></a>

## 自测

判断下列说法：

1. 若 $v_*$ 唯一，则恰好只有一个最优策略。
2. 一个只在指定起点最好的策略必然在所有状态都达到 $v_*$。
3. 动作集有限时，$v_*(s)=\max_a q_*(s,a)$。
4. 在 $q_*(s,a)$ 中，第一步和以后每一步都被强制为动作 $a$。

::: details 核对答案
依次为错、错、对、错。并列最大动作可以产生多个最优策略；只对起点最优弱于逐状态最优；有限动作下最大关系成立；$q_*(s,a)$ 只固定第一步动作，以后的行为保持最优。
:::

<a id="chapter-links"></a>

## 继续学习第三章

下一节把这些定义写成 [Bellman 最优方程](./optimality-equation)。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
