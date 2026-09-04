---
id: ch05-checkpoint
translation_key: ch05-checkpoint
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.1-5.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第五章检查点"
description: 在打开 Monte Carlo 实验前，用一个小型回合任务审计回报、访问过滤器、覆盖和 epsilon-greedy 概率。
outline: deep
---

# 第五章检查点

本检查点使用一个刻意缩小的回合任务。先计算，再打开每个答案。始终保留样本键、回报时间范围、访问策略和随机协议；否则看似正确的平均值仍可能归到了错误的随机变量。

::: info 原创伴读练习
任务、轨迹、数字、问题和答案均为原创伴读材料。它们沿用第五章主题，但不复制上游正文、图、示例、问题或代码。
:::

::: warning 模型边界
下面直接给出轨迹，练习的是模型无关记账；它不是转移模型的替代品，也不是有限样本最优的证明。
:::

<a id="scenario"></a>

## 场景与回合规则

有两个非终止状态 $X$、$Y$ 和一个终止状态 $T$，折扣因子为 $\gamma=0.5$。可用动作如下：

| 状态 | 动作 | 下一状态 | 奖励 |
| --- | --- | --- | ---: |
| $X$ | go | $Y$ | $0$ |
| $X$ | quit | $T$ | $0.3$ |
| $Y$ | finish | $T$ | $1$ |
| $Y$ | back | $X$ | $-0.2$ |

学习器为每个合法对保存 $Q(s,a)$ 和访问次数。终止状态没有动作行。除非问题另有说明，进入 $T$ 时回合才结束。

<a id="return-ledger"></a>

## 1. 建立回报账本

考虑以下回合：

```text
(X, go), 0, (Y, back), −0.2, (X, go), 0, (Y, finish), +1, terminal
```

从最后一个决策向前反向计算每次访问的后缀回报。哪两次访问共享同一个状态—动作键？

::: details 查看答案
在终止边界设 $G=0$。更新为

$$
G_3=1,
\qquad
G_2=0+0.5(1)=0.5,
$$

$$
G_1=-0.2+0.5(0.5)=0.05,
\qquad
G_0=0+0.5(0.05)=0.025.
$$

键 $(X,\mathrm{go})$ 在 $t=0$ 和 $t=2$ 出现。两次后缀不同，是因为它们之后发生的未来不同。
:::

<a id="visit-counts"></a>

## 2. 应用三种访问过滤器

根据上面的账本，列出 **initial**、**first-visit** 和 **every-visit** 记账时的回报与计数增量。

::: details 查看答案

| 策略 | 按键记入的回报 | 计数增量 |
| --- | --- | --- |
| initial | $(X,\mathrm{go}):0.025$ | $N(X,\mathrm{go}){+}{=}1$ |
| first-visit | $(X,\mathrm{go}):0.025$；$(Y,\mathrm{back}):0.05$；$(Y,\mathrm{finish}):1$ | 每个列出的键加一 |
| every-visit | $(X,\mathrm{go}):0.025,0.5$；$(Y,\mathrm{back}):0.05$；$(Y,\mathrm{finish}):1$ | $(X,\mathrm{go})$ 加二，其余各加一 |

initial 只记入回合第一个对；first-visit 忽略第二次 $(X,\mathrm{go})$；every-visit 则纳入它。
:::

<a id="running-means"></a>

## 3. 更新运行均值

假设四个 $Q$ 表项都处于未访问状态。按**每次访问**的反向扫描顺序记入回报，并写出每个键的最终均值。

::: details 查看答案

| 键 | 记入回报 | 最终次数 | 最终 $Q$ |
| --- | --- | ---: | ---: |
| $(Y,\mathrm{finish})$ | $1$ | 1 | $1$ |
| $(X,\mathrm{go})$ | $0.5,0.025$ | 2 | $(0.5+0.025)/2=0.2625$ |
| $(Y,\mathrm{back})$ | $0.05$ | 1 | $0.05$ |

当所有回报都纳入时，精确算术平均不受更新顺序影响；若在更新之间交错策略改进，顺序就会影响后续策略。$(X,\mathrm{quit})$ 仍未访问，不能显示成观察到的零。
:::

<a id="coverage"></a>

## 4. 检查覆盖

假设探索性起点调度器发出序列

$$
(X,\mathrm{go}),\ (Y,\mathrm{finish}),\ (X,\mathrm{quit}),\ (Y,\mathrm{back}),
$$

然后重复。它满足正起点覆盖条件吗？两回合前缀能证明什么？

::: details 查看答案
四个合法对都在循环中出现，因此在该调度器下都有正频率。两回合前缀只覆盖前两个发出的对，不能证明剩余对已有有用估计。正选择概率是渐近/实验条件，不是每个有限前缀都具代表性的证书。
:::

<a id="epsilon-row"></a>

## 5. 构造 ε-greedy 行

某状态有四个合法动作，按 $(a_1,a_2,a_3,a_4)$ 排列的当前估计为 $(0.8,0.4,0.1,-0.2)$。采用均匀探索约定且 $\varepsilon=0.2$，写出策略行并验证总和。

::: details 查看答案
唯一贪心动作是 $a_1$，其概率为

$$
1-0.2+0.2/4=0.85,
$$

其他每个动作的概率为 $0.2/4=0.05$。策略行是 $(0.85,0.05,0.05,0.05)$，总和为一。只在非贪心动作中探索的约定会产生不同的行，应单独标注。
:::

<a id="model-boundary"></a>

## 6. 区分模型信息与经验

环境内部以 70% 概率沿请求方向移动，以 30% 概率向左滑动；学习器只收到实际后继状态和奖励。MC 回报更新可以乘以 $0.7$ 和 $0.3$ 吗？重放应保存哪些元数据？

::: details 查看答案
不可以。乘以这些概率是基于模型的期望备份；MC 更新只使用回合中实现的结果。重放应保存种子、配置、起点（以及强制动作，如有）、选择动作、实际状态/奖励、终止或截断标记、访问策略和更新顺序。隐藏概率可以作为环境文档，但不是这个学习器更新的输入。
:::

<a id="audit"></a>

## 7. 最终审计

接受运行前回答“是/否”：

1. 每个记入回报都有状态—动作键吗？
2. first-visit 计数排除了回合内重复出现吗？
3. 未访问对与观测到的零回报区分了吗？
4. 每次选动作时的 ε 都记录了吗？
5. 自然终止和时间上限截断区分了吗？
6. 种子和回合轨迹能复现显示的均值吗？

::: details 建议答案
六项都应为**是**。任何一项为“否”，运行仍可用于调试，但还不是可复现的 MC 估计。尤其是，稳定的策略箭头无法修复缺失计数或访问过滤器的隐式变化。
:::

<a id="lab-transfer"></a>

## 转移到实验

打开 [Monte Carlo 实验](/zh-Hans/labs/ch05-monte-carlo)。先复现无风、固定种子的基线，再切换 initial/first/every 并将账本与手算结果比较。最后尝试 ε-greedy 和可选风扰动预设。风改变实际样本，但不会改变“先选动作、再观察结果”的顺序。

<a id="read-next"></a>

## 继续

若计数不一致，回看[总结](./summary)和[问答](./q-and-a)。阅读下一章的随机逼近更新时，可把本检查点放在实时轨迹旁边。
