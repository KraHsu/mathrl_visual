---
id: ch01-returns
translation_key: ch01-returns
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 轨迹与回报
description: 把多步状态转移写成轨迹，计算普通回报与折扣回报，并理解折扣因子。
---

# 轨迹与回报

一次状态转移告诉我们“下一步发生了什么”，轨迹记录“连续多步发生了什么”，**回报**再把轨迹上的奖励汇总成一个数。分清这三个层次，可以避免一个常见误解：某一步奖励很大，并不自动代表长期结果很好。

<a id="trajectory-record"></a>

## 轨迹是按时间排列的记录

从时刻 $t$ 开始的一条有限轨迹可以写成

$$
\tau_{t:T}=(s_t,a_t,r_{t+1},s_{t+1},a_{t+1},r_{t+2},\ldots,s_T).
$$

$r_{t+1}$ 的下标很重要：动作 $a_t$ 使系统从 $s_t$ 向 $s_{t+1}$ 转移后，智能体才观察到这个奖励。轨迹保留了每一步状态转移，但此时还没有决定怎样汇总奖励。

对有限轨迹，让每个奖励拥有相同权重，就得到回报在 $\gamma=1$ 时的特殊情形：

$$
G_t\big|_{\gamma=1}=\sum_{k=0}^{T-t-1} r_{t+k+1}.
$$

普通回报给轨迹中的每个奖励相同权重，无论它在下一步出现，还是在更久以后出现。

<a id="discounted-return"></a>

## 折扣改变时间权重

折扣回报使用折扣因子 $\gamma$：

$$
G_t
=\sum_{k=0}^{T-t-1}\gamma^k r_{t+k+1},
\qquad 0\leq\gamma\leq 1.
$$

- $\gamma=0$ 时只保留下一个奖励；
- $\gamma$ 越大，较晚奖励的影响越大；
- 对有限轨迹，$\gamma=1$ 就得到普通回报；
- 对无限延续的求和，选择 $\gamma<1$ 是防止有界奖励无限累积的一种常见做法，持续式任务也可以采用其他目标。

折扣因子改变的是怎样**评价**一条轨迹。它不会改变环境的状态转移概率，也不会凭空改变轨迹上已经观察到的奖励。

<a id="worked-example"></a>

## 手算例子：仓库配送

考虑一条原创的三步配送记录。一辆小车离开充电位时消耗能量，完成配送后获得奖励，最后安全停靠：

$$
(r_{t+1},r_{t+2},r_{t+3})=(-2,5,1).
$$

普通回报为

$$
G_t\big|_{\gamma=1}=-2+5+1=4.
$$

取 $\gamma=0.5$，每向后一个时间偏移，权重变为前一个的二分之一：

| 偏移 $k$ | 奖励 $r_{t+k+1}$ | 权重 $\gamma^k$ | 折扣贡献 |
| ---: | ---: | ---: | ---: |
| 0 | $-2$ | $1$ | $-2$ |
| 1 | $5$ | $0.5$ | $2.5$ |
| 2 | $1$ | $0.25$ | $0.25$ |

所以

$$
G_t=-2+2.5+0.25=0.75
\qquad(\gamma=0.5).
$$

两个结果都正确，只是回答了不同的评价问题。普通回报说明整条有限记录净得 $4$；折扣回报则说明，在这套时间权重下，后续收益抵消即时成本后只剩 $0.75$。

<a id="return-recursion"></a>

## 从下一时刻看同一个和

从下一时刻开始的回报是

$$
G_{t+1}=5+0.5(1)=5.5
\qquad(\gamma=0.5).
$$

把它代回第一步可得

$$
G_t=r_{t+1}+\gamma G_{t+1}
=-2+0.5(5.5)=0.75.
$$

这只是针对一条已记录奖励序列的算术恒等式。这里还没有引入状态价值、对不同未来求期望，也没有引入 Bellman 方程。

在 [Grid World 概念实验](/zh-Hans/labs/ch01-gridworld) 中，轨迹表会逐次状态转移展示同样的计算。改变 $\gamma$，再用相同种子重放相同动作，就能验证状态与奖励保持不变，而折扣回报会改变。

<a id="self-check"></a>

## 自检

1. 奖励序列为 $(3,-1,4)$、$\gamma=0.25$ 时，从第一步开始的折扣回报是多少？
2. 如果只改变 $\gamma$，再重放同一条确定性轨迹，它的下一状态应该改变吗？

::: details 查看答案
折扣回报为 $3+0.25(-1)+0.25^2(4)=3$。下一状态不应改变：$\gamma$ 属于评价规则，而不属于环境的状态转移模型。
:::
