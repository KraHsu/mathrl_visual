---
id: ch02-bellman-equation
translation_key: ch02-bellman-equation
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.4-2.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Bellman 方程
description: 从回报的一步分解推导固定策略的 Bellman 期望方程。
outline: deep
---

# Bellman 方程

Bellman 方程是期望回报的自洽条件。它要求一个状态的价值等于“第一步转移的奖励，加上后续状态的折扣价值”的期望；求期望时要覆盖固定策略与环境允许的全部动作和结果。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 把回报分成第一步奖励与剩余回报；
2. 使用条件期望推导 Bellman 期望方程；
3. 把一个状态的价值展开为可审计的概率加权项；
4. 区分 Bellman 方程与一次采样的轨迹更新。

<a id="return-decomposition"></a>

## 把现在与以后分开

回报满足恒等式

$$
G_t=R_{t+1}+\gamma G_{t+1}.
$$

把它代入状态价值定义：

$$
v_\pi(s)
=\mathbb E_\pi[R_{t+1}+\gamma G_{t+1}\mid S_t=s].
$$

第一次转移到达 $S_{t+1}=s'$ 后，根据马尔可夫性质并继续使用同一个策略，有

$$
\mathbb E_\pi[G_{t+1}\mid S_{t+1}=s']=v_\pi(s').
$$

因此，使用全期望公式，就能把随机的剩余回报替换为每个可能后继状态的价值。

<a id="bellman-expectation-equation"></a>

## 对动作与联合结果求平均

令 $p(s',r\mid s,a)$ 表示环境中下一状态与奖励的联合分布。对于固定策略 $\pi$，

$$
\boxed{
v_\pi(s)
=\sum_a\pi(a\mid s)
\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_\pi(s')\right]
}
$$

从内向外阅读这个计算：

1. $r+\gamma v_\pi(s')$ 给出一种可能的第一步结果价值；
2. $p(s',r\mid s,a)$ 对动作 $a$ 之后的环境结果求平均；
3. $\pi(a\mid s)$ 对固定策略选择的动作求平均。

这个方程没有假设奖励与下一状态条件独立。联合结果模型能够完整保留二者之间的关系。

<a id="policy-induced-form"></a>

## 汇总策略诱导量

定义策略 $\pi$ 下的一步期望奖励与转移概率：

$$
r_\pi(s)
=\sum_a\pi(a\mid s)\sum_{s',r}p(s',r\mid s,a)r,
$$

$$
P_\pi(s,s')
=\sum_a\pi(a\mid s)\sum_r p(s',r\mid s,a).
$$

同一个方程就可以写成

$$
v_\pi(s)
=r_\pi(s)+\gamma\sum_{s'}P_\pi(s,s')v_\pi(s').
$$

在策略评估期间，$r_\pi$ 和 $P_\pi$ 都不会改变。如果策略变了，就必须先重新构造这些策略诱导量，再评估新策略。

<a id="worked-expansion"></a>

## 一个原创的单状态展开

假设固定策略与环境共同决定了状态 $x$ 的两种结果：

- 以 $0.25$ 的概率获得奖励 $3$ 并终止；
- 以 $0.75$ 的概率获得奖励 $-1$ 并到达状态 $y$。

令 $\gamma=0.8$、$v_\pi(y)=2$，并把终止状态价值设为零，则

$$
\begin{aligned}
v_\pi(x)
&=0.25[3+0.8(0)]
  +0.75[-1+0.8(2)]\\
&=0.75+0.45\\
&=1.20.
\end{aligned}
$$

每个方括号都是一个一步目标，外面的系数是结果概率。按这种方式展开，可以直接发现缺失的概率、奖励或后继状态价值。

<a id="fixed-point-view"></a>

## 一个联立的不动点

定义固定策略 Bellman 算子

$$
(T_\pi v)(s)
=r_\pi(s)+\gamma\sum_{s'}P_\pi(s,s')v(s').
$$

真实价值函数满足

$$
v_\pi=T_\pi v_\pi.
$$

右侧的价值可以互相依赖，甚至依赖当前状态自身。因此，这个方程并不是说状态一定能按时间顺序逐个求解；它是一组同时成立的方程，其解需要保持自洽。

<a id="common-errors"></a>

## 常见错误

- **漏掉策略平均：**这会悄悄把某个动作当成必然被选择的动作。
- **把即时奖励也折扣：**正确目标是 $r+\gamma v(s')$，不是 $\gamma[r+v(s')]$。
- **重复计算终止奖励：**进入终止状态的奖励属于 $r$，终止后的延续价值为零。
- **在同步扫描中途读取刚更新的价值：**这样会改变更新方案。
- **用一个样本替代期望：**一次转移可以估计某一项，但不是完整的基于模型的方程。
- **在动作上取最大值：**这会从固定策略评估越界到最优性方程，不属于本章。

<a id="self-check"></a>

## 自测

某个状态的策略诱导模型以 $0.4$ 的概率到达 $u$ 并获得奖励 $2$，或以 $0.6$ 的概率到达 $w$ 并获得奖励 $-1$。令 $\gamma=0.5$、$v(u)=3$、$v(w)=1$。

$$
(T_\pi v)(s)
=0.4[2+0.5(3)]+0.6[-1+0.5(1)]=1.1.
$$

核对算术，再指出策略评估中哪些数保持固定，哪些数属于当前价值估计。

::: details 核对答案
第一项为 $0.4(3.5)=1.4$，第二项为 $0.6(-0.5)=-0.3$，合计 $1.1$。概率、奖励和 $\gamma$ 是固定的模型或配置数据；$v(u)$ 与 $v(w)$ 是当前价值估计中的条目。
:::

<a id="chapter-links"></a>

## 继续学习第二章

接下来把所有状态方程收集成[矩阵形式](./matrix-form)，也可以在[共享 4×4 策略评估实验](/zh-Hans/labs/ch02-policy-evaluation)中检查全部 16 个状态。

第二章先导版页面：[概览](/zh-Hans/learn/ch02/) · [状态价值](/zh-Hans/learn/ch02/state-values) · [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation) · [矩阵形式](/zh-Hans/learn/ch02/matrix-form) · [策略评估](/zh-Hans/learn/ch02/policy-evaluation) · [动作价值](/zh-Hans/learn/ch02/action-values) · [检查点](/zh-Hans/learn/ch02/checkpoint) · [实验](/zh-Hans/labs/bellman-grid)
