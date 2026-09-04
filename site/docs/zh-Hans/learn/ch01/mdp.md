---
id: ch01-mdp
translation_key: ch01-mdp
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 有限马尔可夫决策过程
description: 把状态、动作、联合结果与折扣组合成 MDP，并检查状态表示是否满足马尔可夫性质。
---

# 有限马尔可夫决策过程

马尔可夫决策过程（MDP）是一份对序贯决策问题的明确约定：智能体能观察什么、可以选择哪些动作，以及环境会怎样响应。只有先写清这份约定，我们才能在不暗中改变任务的前提下比较不同策略。

<a id="finite-mdp-tuple"></a>

## 一种紧凑的有限 MDP 约定

本站把有限折扣 MDP 写成

$$
\mathcal M=
(\mathcal S,\{\mathcal A(s)\}_{s\in\mathcal S},\mathcal R,p,\gamma).
$$

各部分含义如下：

- 有限状态空间 $\mathcal S$；
- 每个状态 $s$ 对应的有限可选动作集合 $\mathcal A(s)$；
- 可能出现的即时奖励所组成的有限集合 $\mathcal R$；
- 联合结果模型 $p(s',r\mid s,a)$；
- 回报目标使用的折扣因子 $\gamma$。

要让一个回合式任务可以复现，还需说明初始化规则与终止语义。有些教材会在元组中分别列出状态转移核和奖励函数，有些还会加入初始状态分布或终止状态集合。只要逐一说明符号含义，这些记号约定可以表达兼容的模型。

<a id="joint-outcome-model"></a>

## 联合描述下一状态与奖励

联合结果模型写作

$$
p(s',r\mid s,a)
=\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a).
$$

对每个有效的 $(s,a)$，这一行必须满足

$$
p(s',r\mid s,a)\geq 0,
\qquad
\sum_{s'\in\mathcal S}\sum_{r\in\mathcal R}p(s',r\mid s,a)=1.
$$

这种表示不假设下一状态与奖励在给定状态和动作后条件独立。我们可以由它推出状态转移模型与期望即时奖励：

$$
P(s'\mid s,a)=\sum_r p(s',r\mid s,a),
$$

$$
\bar r(s,a)=\sum_{s',r}r\,p(s',r\mid s,a).
$$

两个结果可能到达同一下一状态，却发出不同奖励；过早把它们合并可能丢失信息。

<a id="markov-state-sufficiency"></a>

## 状态必须足以预测下一步

用 $H_t$ 表示时刻 $t$ 以前观察到的全部历史。如果状态表示对当前任务满足马尔可夫性质，那么

$$
\Pr(S_{t+1},R_{t+1}\mid H_t,S_t,A_t)
=p(S_{t+1},R_{t+1}\mid S_t,A_t).
$$

这句话的含义是：已知当前状态与动作后，更多历史信息不应继续改善对下一状态和奖励的预测。

马尔可夫性质属于所选的**状态表示**，而不只属于物理系统。如果电机过热会改变下一步状态转移，但状态中省略了 `motor_status`，那么两个看起来相同的状态可能拥有不同未来。把相关状态加入表示，才可能恢复充分性。

<a id="model-vs-policy"></a>

## 模型与策略有不同归属

MDP 模型 $p(s',r\mid s,a)$ 描述执行动作后环境怎样响应。策略

$$
\pi(a\mid s)=\Pr(A_t=a\mid S_t=s)
$$

描述智能体怎样选择动作。把两者组合后，可以得到该策略下的一步行为：

$$
\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s)
=\sum_{a\in\mathcal A(s)}\pi(a\mid s)p(s',r\mid s,a).
$$

改变策略，会改变各动作被请求的频率，却不会重写环境模型；改变环境模型则定义了另一个任务，即使策略表完全不变。

<a id="worked-example"></a>

## 原创例子：位于岔路口的室内配送车

采用下面的状态表示：

$$
s=(\text{位置},\text{包裹状态},\text{电机状态}).
$$

配送车位于东侧岔路口、携带包裹且电机温度正常时，执行 `向东` 动作会产生以下结果：

| 下一状态 | 奖励 | 概率 |
| --- | ---: | ---: |
| 储物柜、已送达、温度正常 | $4$ | $0.6$ |
| 岔路口、携带中、温度正常 | $-1$ | $0.3$ |
| 岔路口、携带中、电机过热 | $-3$ | $0.1$ |

所有概率都非负且总和为 $1$，所以这一行构成当前状态—动作对的有效联合结果分布。注意，电机状态属于下一状态。如果后续移动受温度影响，状态却只保存位置与包裹状态，那么这个表示会隐藏预测下一步所需的信息，通常无法通过马尔可夫性质检查。

某个策略可以用 $0.8$ 的概率请求“向东”，以 $0.2$ 的概率请求“等待”。这些概率属于 $\pi$，不属于上面的环境结果表。

[状态转移单元](./transitions)研究这份约定的一部分，[回报单元](./returns)解释 $\gamma$ 怎样评价产生的轨迹，[Grid World 概念实验](/zh-Hans/labs/ch01-gridworld)则允许你检查一个更小的确定性或随机实例。

<a id="self-check"></a>

## 自检

1. 一台机器每逢第三次移动失败就增加额外惩罚，但状态中没有失败次数。这个状态通常满足马尔可夫性质吗？
2. 如果两个联合结果的概率分别是 $0.55$ 和 $0.25$，第三个也是最后一个结果的概率应是多少？
3. 改变 $\pi(a\mid s)$ 会改变 $p(s',r\mid s,a)$ 吗？

::: details 查看答案
这个状态通常不满足马尔可夫性质，因为被省略的失败次数会改变下一奖励的规律；加入相关计数或相位可以修复。最后一个概率必须是 $0.20$。改变策略不会改变环境的联合结果模型。
:::
