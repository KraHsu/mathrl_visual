---
id: ch03-policy-improvement
translation_key: ch03-policy-improvement
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 从动作价值发现策略改进
description: 用当前策略的动作价值比较一次偏离，并区分局部贪心改进与全局最优。
outline: deep
---

# 从动作价值发现策略改进

策略评估给出 $v_\pi$，但价值本身不会改变决策。要寻找更好的策略，需要问一个反事实问题：在状态 $s$ 先执行另一个动作 $a$，随后再继续使用原策略 $\pi$，期望回报会是多少？这正是 $q_\pi(s,a)$。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 用 $v_\pi$ 计算一次偏离的动作价值；
2. 解释 $q_\pi(s,a)>v_\pi(s)$ 为什么提供改进证据；
3. 构造相对于 $q_\pi$ 的贪心策略；
4. 说明一次策略改进不一定已经得到全局最优策略。

<a id="queue-model"></a>

## 原创连续示例：夜间文档队列

沿用第二章检查点中的项目原创模型。非终止状态为等待队列 $Q$ 与审核中 $R$，$T$ 为终止状态，$\gamma=0.5$。动作后的结果是确定的：

| 状态 | 动作 | 下一状态 | 奖励 |
| --- | --- | --- | ---: |
| $Q$ | 暂存 `hold` | $Q$ | $-1$ |
| $Q$ | 转交 `forward` | $R$ | $+1$ |
| $Q$ | 直接检查 `inspect` | $T$ | $+2$ |
| $R$ | 退回 `return` | $Q$ | $0$ |
| $R$ | 复核 `recheck` | $R$ | $-2$ |
| $R$ | 提交 `submit` | $T$ | $+4$ |

固定策略 $\pi$ 在 $Q$ 以相同概率选择暂存或转交，在 $R$ 分别以 $0.25,0.25,0.50$ 选择退回、复核、提交；它从不直接检查。第二章已经求得

$$
v_\pi(Q)=0.6,
\qquad
v_\pi(R)=1.8,
\qquad
v_\pi(T)=0.
$$

<a id="fixed-policy-values"></a>

## 评估一次动作偏离

结果确定时，动作价值就是

$$
q_\pi(s,a)=r(s,a)+\gamma v_\pi(s'(s,a)).
$$

在 $Q$：

$$
\begin{aligned}
q_\pi(Q,\text{hold})&=-1+0.5(0.6)=-0.7,\\
q_\pi(Q,\text{forward})&=1+0.5(1.8)=1.9,\\
q_\pi(Q,\text{inspect})&=2+0.5(0)=2.
\end{aligned}
$$

在 $R$：

$$
\begin{aligned}
q_\pi(R,\text{return})&=0+0.5(0.6)=0.3,\\
q_\pi(R,\text{recheck})&=-2+0.5(1.8)=-1.1,\\
q_\pi(R,\text{submit})&=4+0.5(0)=4.
\end{aligned}
$$

注意，原策略概率为零的 `inspect` 仍有良好定义的动作价值。$q_\pi$ 固定第一步动作，然后才回到 $\pi$；它并不是“原策略实际采到该动作的平均值”。

<a id="greedy-improvement"></a>

## 对当前动作价值做贪心选择

令新策略 $\pi_1$ 在每个状态只选择最大的 $q_\pi$：它在 $Q$ 直接检查，在 $R$ 提交。于是

$$
v_{\pi_1}(Q)=2,
\qquad
v_{\pi_1}(R)=4.
$$

两个状态都不低于原来的 $(0.6,1.8)$。一般地，如果 $\pi'$ 只支持于 $q_\pi(s,\cdot)$ 的最大动作，那么

$$
(T_{\pi'}v_\pi)(s)
=\max_a q_\pi(s,a)
\geq v_\pi(s).
$$

对固定策略算子继续迭代并利用单调性，可得到 $v_{\pi'}\geq v_\pi$。这就是策略改进的核心关系。

<a id="local-not-global"></a>

## 一次改进不等于全局最优

$\pi_1$ 比 $\pi$ 好，却还不是最终答案。用 $v_{\pi_1}=(2,4)$ 再检查 $Q$：

$$
\begin{aligned}
q_{\pi_1}(Q,\text{hold})&=0,\\
q_{\pi_1}(Q,\text{forward})&=3,\\
q_{\pi_1}(Q,\text{inspect})&=2.
\end{aligned}
$$

由于审核状态现在价值更高，转交变成最佳动作。这个变化揭示两个容易混淆的对象：

- $q_\pi$ 只回答“偏离一步后继续用当前策略”的问题；
- $q_*$ 回答“偏离这一步后仍能一直作出最优决策”的问题。

第三章将直接刻画 $v_*$ 与 $q_*$。第四章再把交替评估和改进整理为 Policy Iteration 算法。

<a id="self-check"></a>

## 自测

设状态 $x$ 在旧策略下的三个动作价值为 $(-0.2,1.4,1.4)$，策略平均价值为 $0.8$。

1. 在 $x$ 有哪些确定性贪心策略？
2. 改进后的策略能否在第二、第三个动作之间随机化？
3. 动作并列是否意味着最优价值函数不唯一？

::: details 核对答案
第二或第三个动作都可作为确定性贪心选择。任何只支持这两个最大动作的概率混合都保持一步贪心值 $1.4$。并列可能使策略不唯一，但不意味着最优价值有多个；在本章折扣假设下，$v_*$ 是 $T_*$ 的唯一不动点。
:::

<a id="chapter-links"></a>

## 继续学习第三章

下一节将正式定义[最优状态价值与最优策略](./optimal-values)。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
