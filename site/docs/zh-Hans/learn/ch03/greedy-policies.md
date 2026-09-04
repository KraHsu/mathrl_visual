---
id: ch03-greedy-policies
translation_key: ch03-greedy-policies
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 从最优价值恢复贪心策略
description: 用最优动作集合恢复确定性或随机最优策略，并解释价值唯一而策略可以不唯一。
outline: deep
---

# 从最优价值恢复贪心策略

Bellman 最优方程先求出唯一的 $v_*$。策略不是第二个需要同时猜测的未知量：一旦 $v_*$ 已知，只需重新计算每个状态的动作备份并记录最大动作。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 从 $v_*$ 构造每个非终止决策状态的最优动作集合；
2. 恢复一个确定性最优策略；
3. 证明仅支持于并列最大动作的随机策略同样最优；
4. 解释 $v_*$ 唯一而 $\pi_*$ 可能不唯一。

<a id="recover-policy"></a>

## 先算 $q_*$，再取 $\arg\max$

由 $v_*$ 定义

$$
q_*(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_*(s')\right].
$$

每个非终止决策状态的最大动作集合为

$$
\mathcal A_*(s)
=\operatorname*{arg\,max}_{a\in\mathcal A(s)}q_*(s,a).
$$

选择任意 $a_*(s)\in\mathcal A_*(s)$，即可构造确定性策略

$$
\pi_*(a\mid s)
=\begin{cases}
1,&a=a_*(s),\\
0,&a\neq a_*(s).
\end{cases}
$$

每个这样的动作集有限且非空，所以最大集合也非空。终止状态没有后续决策行，其后续价值按约定固定为零，不需要为它构造策略概率。于是，在本章假设下至少存在一个确定性平稳最优策略。

<a id="optimality-proof"></a>

## 为什么这个贪心策略是最优的

若 $\pi_*$ 在每个非终止决策状态只支持最大动作，则这些状态满足

$$
T_{\pi_*}v_*
=T_*v_*
=v_*.
$$

固定策略 Bellman 算子 $T_{\pi_*}$ 也有唯一不动点，而该不动点按定义是 $v_{\pi_*}$，所以

$$
v_{\pi_*}=v_*.
$$

还需确认没有其他策略能超过它。对任意 $\pi$，动作平均不会超过最大动作：

$$
T_\pi v_*\leq T_*v_*=v_*.
$$

从 $v_*$ 反复应用单调的 $T_\pi$，极限是 $v_\pi$，因此

$$
v_\pi\leq v_*.
$$

于是 $v_*$ 确实逐状态支配所有策略价值，而任何对 $v_*$ 贪心的策略都实现它。

<a id="ties"></a>

## 并列意味着策略可以不唯一

如果 $\mathcal A_*(s)$ 有多个动作，则以下选择都保持同一个最优备份：

- 选定其中任意一个动作；
- 换成另一个并列动作；
- 在并列动作之间任意随机化。

更精确地，随机策略最优的充分构造是

$$
\pi(a\mid s)>0
\Longrightarrow
a\in\mathcal A_*(s).
$$

若给一个严格次优动作正概率，则该状态的动作价值凸组合会严格低于 $v_*(s)$。界面若只为展示而按固定次序画一根箭头，仍必须另外列出完整并列集合，不能暗示这根箭头是唯一答案。

<a id="queue-solution"></a>

## 原创队列模型的完整解

上一节得到夜间文档队列的不动点

$$
v_*(Q)=3,
\qquad
v_*(R)=4.
$$

动作价值为

$$
\begin{array}{c|ccc}
&\text{hold}&\text{forward}&\text{inspect}\\\hline
Q&0.5&3&2
\end{array}
$$

以及

$$
\begin{array}{c|ccc}
&\text{return}&\text{recheck}&\text{submit}\\\hline
R&1.5&0&4.
\end{array}
$$

所以唯一最大动作分别是 `forward` 与 `submit`。若把 `inspect` 的奖励从 $2$ 改为 $3$，$Q$ 的 `forward` 和 `inspect` 都达到 $3$：最优价值仍为 $(3,4)$，但在 $Q$ 可以确定性选择任一动作，也可以在两者之间随机化。

<a id="chapter-four-boundary"></a>

## 与第四章的边界

本章已经说明“若得到 $v_*$，怎样恢复策略”以及“反复应用 $T_*$ 为何趋近 $v_*$”。第四章才把这些操作组织成完整 Value Iteration，并将它与“完整评估一个策略后再改进”的 Policy Iteration、只做有限评估的 Truncated Policy Iteration 比较。

因此第三章实验中的“应用一次 $T_*$”是数学算子观察，不替代后续算法的伪代码、停止策略、复杂度和实现变体。

<a id="self-check"></a>

## 自测

状态 $s$ 的高精度计算为

$$
q_*(s,\cdot)=(2.0000000,1.9999999,1.4).
$$

1. 宣布前两个动作并列前，还需要什么信息？
2. 若它们确实并列，最优策略能否给第三个动作 $0.1$ 概率？
3. 从 $v_*$ 构造贪心策略后，应核对什么等式？

::: details 核对答案
需要数值容差以及计算值的误差界；显示舍入相同不能证明并列。若第三个动作严格次优，它必须得到零概率。应核对 $T_{\pi_g}v_*=T_*v_*=v_*$，或评估恢复出的策略并验证 $v_{\pi_g}=v_*$。
:::

<a id="chapter-links"></a>

## 继续学习第三章

接着研究[折扣、奖励与环境模型](./factors)怎样改变这些最大动作。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
