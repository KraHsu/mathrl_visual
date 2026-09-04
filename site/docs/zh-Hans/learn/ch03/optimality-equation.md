---
id: ch03-optimality-equation
translation_key: ch03-optimality-equation
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.3-3.3.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Bellman 最优方程
description: 先计算每个请求动作的期望备份，再逐状态最大化，得到非线性的 Bellman 最优算子。
outline: deep
---

# Bellman 最优方程

固定策略的 Bellman 方程对策略动作求平均；Bellman 最优方程则比较动作并保留最大的期望。这个看似很小的变化，把线性策略评估变成了最优控制问题。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 从联合结果分布计算任意价值估计下的动作备份；
2. 正确放置期望与最大值；
3. 定义 Bellman 最优算子 $T_*$；
4. 解释随机策略最大化为什么可由确定性动作取得；
5. 说明最优方程为何不是第二章那样的单个线性系统。

<a id="action-backup"></a>

## 先对一个请求动作求期望

给定任意候选价值向量 $v$，定义动作备份

$$
q_v(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v(s')\right].
$$

$q_v$ 只是用当前候选向量进行的一步计算；除非 $v=v_*$，否则它还不是 $q_*$。

联合分布 $p(s',r\mid s,a)$ 保留了奖励与下一状态之间可能存在的关联。计算顺序是：

1. 为每个可能结果算 $r+\gamma v(s')$；
2. 按该请求动作的结果概率加权；
3. 得到这个请求动作的一个期望数值；
4. 对其他请求动作重复计算。

风把请求动作改成哪个实际方向属于第二步中的环境随机性。错误地对每个滑移结果单独取最大，相当于允许智能体看到随机结果之后重选动作。

<a id="optimality-operator"></a>

## Bellman 最优算子

逐状态保留最大的动作备份：

$$
\boxed{
(T_*v)(s)=\max_{a\in\mathcal A(s)}q_v(s,a)
}
$$

Bellman 最优方程是不动点条件

$$
\boxed{v_*=T_*v_*}.
$$

逐项展开就是

$$
v_*(s)
=\max_a\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_*(s')\right].
$$

最大值位于联合结果求和的外面，却位于不同状态方程的里面：每个状态可以有自己的最大动作。

<a id="why-deterministic"></a>

## 为什么最大值可由确定性动作取得

若在状态 $s$ 允许随机策略 $\mu(\cdot\mid s)$，其一步备份为

$$
\sum_a\mu(a\mid s)q_v(s,a).
$$

这是各动作备份的凸组合，因此不可能超过其中最大项：

$$
\sum_a\mu(a\mid s)q_v(s,a)
\leq \max_a q_v(s,a).
$$

把全部概率放在任一最大动作上即可达到等号。若有多个动作并列，把概率任意分配在这些最大动作之间也能达到同一个数值。于是确定性动作足以取得最大值，但不代表最优策略一定唯一。

<a id="matrix-view"></a>

## 动作备份的向量视图

对每个状态—动作定义期望即时奖励

$$
\bar r(s,a)=\sum_{s',r}p(s',r\mid s,a)r
$$

以及转移概率

$$
P_a(s,s')=\sum_r p(s',r\mid s,a).
$$

把所有 $q_v(s,a)$ 排成“状态 × 动作”表：

$$
B(v)_{s,a}=\bar r(s,a)+\gamma\sum_{s'}P_a(s,s')v(s').
$$

$T_*v$ 对该表的每一行取最大值。也可写为

$$
T_*v=\operatorname{rowmax}B(v)
=\max_\pi\left(r_\pi+\gamma P_\pi v\right),
$$

其中最后一个最大值是逐分量的；策略可以在每个状态选择不同动作。

<a id="nonlinearity"></a>

## 最大值带来的非线性

第二章固定 $\pi$ 后，$T_\pi v=r_\pi+\gamma P_\pi v$ 是仿射映射，可以整理为

$$
(I-\gamma P_\pi)v_\pi=r_\pi.
$$

最优算子会随 $v$ 改变获胜动作，因此没有一个预先固定的 $P_\pi$ 可直接求逆。$T_*$ 是若干仿射动作备份的逐状态上包络：连续、分段仿射，动作并列处可能不可微，但仍具有下一节所需的压缩性。

<a id="worked-sweep"></a>

## 原创队列模型的一轮备份

对夜间文档队列，从 $v^{(0)}(Q)=v^{(0)}(R)=0$ 开始。终止状态值为零：

$$
\begin{aligned}
(T_*v^{(0)})(Q)
&=\max\{-1,1,2\}=2,\\
(T_*v^{(0)})(R)
&=\max\{0,-2,4\}=4.
\end{aligned}
$$

所以 $v^{(1)}=(2,4)$。再应用一次：

$$
\begin{aligned}
(T_*v^{(1)})(Q)
&=\max\{0,3,2\}=3,\\
(T_*v^{(1)})(R)
&=\max\{1,0,4\}=4.
\end{aligned}
$$

得到 $v^{(2)}=(3,4)$，而下一次备份不再改变它，因此这是一个不动点。

<a id="self-check"></a>

## 自测

状态 $x$ 的三个完整动作备份在同一个候选向量下为 $1.2,0.7,1.2$。

1. $(T_*v)(x)$ 是多少？
2. 有哪些确定性贪心选择？
3. 哪些随机策略行达到相同备份？
4. 为什么不能对每个后继结果分别取最大？

::: details 核对答案
最优备份是 $1.2$。第一个或第三个动作都可作为确定性贪心选择；任何只支持这两个动作的概率分布也达到 $1.2$。逐结果最大化会让动作依赖于只有在动作选定后才揭示的环境随机性。
:::

<a id="chapter-links"></a>

## 继续学习第三章

下一节用[压缩映射](./contraction)证明这个不动点存在、唯一且可从任意初值逼近。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
