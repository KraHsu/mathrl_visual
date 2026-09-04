---
id: ch02-action-values
translation_key: ch02-action-values
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.8"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 给定策略下的动作价值
description: 定义 q_pi，按一次转移展开它，并把状态价值还原为给定策略下的动作价值加权平均。
---

# 给定策略下的动作价值

状态价值回答的是：已知当前状态并遵循一个给定策略时，预期回报是多少？**动作价值**问得更具体：如果连当前第一步动作也固定下来，之后再遵循同一个给定策略，预期回报是多少？

::: info 范围：只做策略评估
本页始终把策略 $\pi$ 视为已经给定且保持不变。下面的计算描述该策略以及各个可用首步动作的后果，不引入选择或修改策略的规则。
:::

<a id="action-value-definition"></a>

## 同时以状态和首步动作为条件

对于折扣回报 $G_t$ 和固定策略 $\pi$，动作价值函数定义为

$$
q_\pi(s,a)
=\mathbb E_\pi\!\left[G_t\mid S_t=s,A_t=a\right].
$$

这里应按操作性定义理解：先主动采取一次 $a$，之后再遵循 $\pi$。当 $\pi(a\mid s)=0$ 时，这不是对策略 $\pi$ 下实际发生的动作事件做普通条件化。

这个条件包含两部分：

- $S_t=s$ 固定当前状态；
- $A_t=a$ 固定当前时刻采取的动作。

从时刻 $t+1$ 开始，动作再由固定策略 $\pi$ 抽样。因此，$q_\pi(s,a)$ 评估的是“先指定一个动作，再照常延续 $\pi$”。只要模型和回报定义良好，它就能为每个可用的 $(s,a)$ 定义。

相比之下，

$$
v_\pi(s)=\mathbb E_\pi\!\left[G_t\mid S_t=s\right]
$$

没有指定某个首步动作；该动作由 $\pi(\cdot\mid s)$ 抽样。

<a id="one-step-decomposition"></a>

## 展开一次状态转移

先使用回报恒等式

$$
G_t=R_{t+1}+\gamma G_{t+1}.
$$

给定 $S_t=s$ 和 $A_t=a$ 后，从下一状态继续的价值为 $v_\pi(S_{t+1})$，所以

$$
q_\pi(s,a)
=\mathbb E\!\left[
R_{t+1}+\gamma v_\pi(S_{t+1})
\mid S_t=s,A_t=a
\right].
$$

若环境由一步联合模型

$$
p(s',r\mid s,a)
=\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a)
$$

描述，则期望可以展开为

$$
q_\pi(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_\pi(s')\right].
$$

若用 $p(s'\mid s,a)$ 表示转移概率，并单独用 $r(s,a,s')$ 表示期望即时奖励，同一个计算可写成

$$
q_\pi(s,a)
=\sum_{s'}p(s'\mid s,a)
\left[r(s,a,s')+\gamma v_\pi(s')\right].
$$

对于终止的下一状态，本页采用 $v_\pi(s_{\mathrm T})=0$ 的约定：进入终止状态的即时奖励仍然保留，但终止后不再有产生奖励的延续过程。

<a id="state-action-link"></a>

## 按策略对动作价值加权

在状态 $s$，固定策略给出首步动作的概率分布。应用全期望公式可得

$$
\boxed{
v_\pi(s)=\sum_{a\in\mathcal A(s)}\pi(a\mid s)q_\pi(s,a)
}.
$$

这是按策略概率计算的加权平均，不是等权平均。所用概率必须是该策略在当前状态实际采用的动作概率，并且在全部可用动作上求和为 1。

两种“一步展开”的视角彼此一致：

$$
\begin{aligned}
v_\pi(s)
&=\sum_a\pi(a\mid s)q_\pi(s,a)\\
&=\sum_a\pi(a\mid s)
  \sum_{s',r}p(s',r\mid s,a)
  \left[r+\gamma v_\pi(s')\right].
\end{aligned}
$$

外层求和描述策略对动作的随机选择，内层求和描述动作确定后环境的随机响应。

<a id="worked-example"></a>

## 手算例子：三个调度指令

考虑一个原创调度模型，当前状态为 $h$，可能转移到状态 $x$ 或 $y$。此前对固定策略的评估已经得到

$$
v_\pi(x)=2,
\qquad
v_\pi(y)=-1,
\qquad
\gamma=0.5.
$$

在 $h$ 有三个可用指令：

| 首步动作 | 一步模型 | $\pi(a\mid h)$ |
| --- | --- | ---: |
| 转送 | 以 $0.75$ 的概率到达 $x$、奖励为 $1$；以 $0.25$ 的概率到达 $y$、奖励为 $-2$ | $0.40$ |
| 排队 | 以概率 $1$ 到达 $x$、奖励为 $-1$ | $0.60$ |
| 检查 | 以概率 $1$ 到达 $y$、奖励为 $3$ | $0$ |

展开一步可得

$$
\begin{aligned}
q_\pi(h,\text{转送})
&=0.75[1+0.5(2)]
 +0.25[-2+0.5(-1)]\\
&=0.875,\\[4pt]
q_\pi(h,\text{排队})
&=-1+0.5(2)=0,\\[4pt]
q_\pi(h,\text{检查})
&=3+0.5(-1)=2.5.
\end{aligned}
$$

再按当前被评估的策略加权：

$$
\begin{aligned}
v_\pi(h)
&=0.40(0.875)+0.60(0)+0(2.5)\\
&=0.35.
\end{aligned}
$$

每个动作价值都固定首个指令，然后评估同一个延续策略；状态价值还要进一步对“该策略实际会发出哪个首个指令”求平均。

<a id="zero-policy-probability"></a>

## 策略概率为零不代表动作价值为零

在上例中，

$$
\pi(\text{检查}\mid h)=0
\qquad\text{但}\qquad
q_\pi(h,\text{检查})=2.5.
$$

这并不矛盾。概率 $\pi(a\mid s)$ 回答“固定策略在这里采取该动作的频率是多少”；价值 $q_\pi(s,a)$ 回答“如果现在固定采取该动作，之后继续采用该策略，回报是多少”。

策略概率为零，会让这一项在 $v_\pi(s)$ 的加权平均中不产生贡献；它**不会**乘进 $q_\pi(s,a)$ 的定义，也不会抹去环境对这个可用动作的模型。

<a id="self-check"></a>

## 自测

假设 $\gamma=0.8$、$v_\pi(u)=3$，动作 $a$ 会先产生奖励 $-1$，然后确定地转移到 $u$。

1. $q_\pi(s,a)$ 是多少？
2. 如果 $\pi(a\mid s)=0$，答案会改变吗？
3. 当 $\pi(a\mid s)=0$ 时，究竟哪一项会变成零？

::: details 核对答案
按一步展开式，

$$
q_\pi(s,a)=-1+0.8(3)=1.4.
$$

即使 $\pi(a\mid s)=0$，动作价值仍为 $1.4$，因为它的操作性定义把 $a$ 固定为首步动作。变成零的是该动作对状态价值加权平均的贡献：

$$
\pi(a\mid s)q_\pi(s,a)=0(1.4)=0.
$$
:::

<a id="chapter-navigation"></a>

## 第二章学习路径

[第二章总览](./) · [状态价值](./state-values) · [Bellman 方程](./bellman-equation) · [矩阵形式](./matrix-form) · [策略评估](./policy-evaluation) · [动作价值](./action-values) · [章节检查点](./checkpoint) · [Bellman 策略评估实验](/zh-Hans/labs/bellman-grid)
