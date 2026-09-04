---
id: ch05-exploring-starts
translation_key: ch05-exploring-starts
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "MC Exploring Starts：用足每个回合的访问"
description: 复用首次访问或每次访问的回报，逐回合更新策略，并明确覆盖假设。
outline: deep
---

# MC Exploring Starts：用足每个回合的访问

MC Basic 刻意只把回合归给起点状态—动作对。Exploring Starts 保留模型无关的回报估计器，同时追求两种效率：让回合从不同状态—动作对开始，并复用回合内部出现的访问。它仍然是基于样本的控制方法，而不是隐藏的动态规划备份。

::: info 原创伴读说明
下面的轨迹、计数表和实现建议均为原创。它们解释上游探索性起点主题，但不复制原书正文、伪代码、图或示例。
:::

<a id="learning-goals"></a>

## 学习目标

完成本单元后，你应该能够：

1. 说明探索性起点的覆盖条件；
2. 区分初始访问、首次访问和每次访问更新；
3. 通过从回合末端反向扫描高效计算回报；
4. 解释逐回合策略改进为何符合广义策略迭代；
5. 识别表面表现良好但仍有未访问动作的运行。

<a id="coverage-condition"></a>

## “探索性起点”要求什么

探索性起点方案选择初始状态—动作对，使每个合法对都有正概率成为回合起点。在足够长的运行中，每个对都应得到足够多的回报样本，均值才有信息量。这是覆盖条件，不是说有限调度已经访问了所有对。

这个条件容易表述，却难以在物理环境中执行：智能体可能不能瞬移到任意状态，某个动作也可能不适合作为第一步。本浏览器实验的调度器使用带种子的 75 个非终止状态—动作对排列，因此每轮都会选中每个对一次，同时保持顺序可复现。这是实验明确提供的探索性起点机制，不是自然起点假设。MC Basic 使用独立的字典序扫描；它默认的 **initial（初始）** 过滤器只记入起点对，而本模式通常与 **first（首次）** 或 **every（每次）** 记账比较。

<a id="visit-strategies"></a>

## 三种利用访问的方式

假设一个回合包含以下状态—动作键：

```text
(A, east), (B, north), (A, east), (C, wait)
```

一个键对应的回报，是从该次出现开始的后缀回报。三种策略的区别如下：

| 策略 | 本回合纳入的出现 | 信息成本 |
| --- | --- | --- |
| initial（初始） | 只有第一个键 $(A,\mathrm{east})$ | 最低，其余信息丢弃 |
| first-visit（首次） | 每个不同键的第一次出现 | 每个键每回合一个样本 |
| every-visit（每次） | 四次出现都纳入，包括两次 $(A,\mathrm{east})$ | 复用最多，样本可能相关 |

“首次”指**每个状态—动作对**的第一次出现，不是回合中的第一个对。“每次”指每一次出现，即使同一个对因循环再次出现。轨迹应记录策略名称，才能核对计数。

<a id="backward-return"></a>

## 为什么要反向扫描

对奖励 $R_1,\ldots,R_T$ 的回合，在终止边界初始化 $G\leftarrow0$，并按 $t=T-1,T-2,\ldots,0$ 扫描：

$$
G\leftarrow R_{t+1}+\gamma G.
$$

在每个访问键 $(S_t,A_t)$ 处，根据访问过滤器决定是否纳入；若纳入，则

$$
N(S_t,A_t)\leftarrow N(S_t,A_t)+1,
\qquad
Q(S_t,A_t)\leftarrow Q(S_t,A_t)+
\frac{G-Q(S_t,A_t)}{N(S_t,A_t)}.
$$

反向过程用 $O(T)$ 时间计算所有后缀回报，避免反复求和重叠的奖励尾部，也让终止约定保持清晰：$R_T$ 之后不凭空产生奖励；时间上限截断必须标记，不能当作自然终止奖励。

<a id="worked-episode"></a>

## 一个回合与计数示例

取 $\gamma=0.5$，使用下列四步轨迹：

| $t$ | 状态—动作 | 下一步奖励 |
| ---: | --- | ---: |
| 0 | $(A,\mathrm{east})$ | 1 |
| 1 | $(B,\mathrm{north})$ | 0 |
| 2 | $(A,\mathrm{east})$ | 2 |
| 3 | $(C,\mathrm{wait})$ | -1 |

后缀回报为 $G_3=-1$、$G_2=2+0.5(-1)=1.5$、$G_1=0+0.5(1.5)=0.75$，以及 $G_0=1+0.5(0.75)=1.375$。计数贡献如下：

| 策略 | 记入的键 | 记入的回报 |
| --- | --- | --- |
| initial | $(A,\mathrm{east})$ | $1.375$ |
| first-visit | $(C,\mathrm{wait})$、$(A,\mathrm{east})$、$(B,\mathrm{north})$ | $-1, 1.375, 0.75$ |
| every-visit | 四次出现全部记入 | $-1, 1.5, 0.75, 1.375$ |

计算时表格按反向顺序产生，展示键时却按正向排列；展示顺序不能改变时间步与回报的对应关系。

<a id="online-improvement"></a>

## 每个回合后改进

Exploring Starts 可以在纳入回报后立即改进策略。在状态 $s$，依据估计 $Q(s,\cdot)$ 选择

$$
\arg\max_a Q(s,a)
$$

的确定性代表，或为了分析保留完整并列集合。每个回合后都更新，意味着下一个回合可能只依据少量样本；这并不矛盾，而是带有近似评估的广义策略迭代调度。

轨迹应记录策略改进发生在每次记账访问后、每个回合结束后，还是一批回合结束后。这些数据依赖不同，即使最终箭头相似也不能混称。

<a id="algorithm"></a>

## 可复现的探索性起点循环

```text
为每个合法 (s, a) 初始化 Q 和 count
初始化策略 π，以及覆盖所有状态—动作对的起点调度器
对每个回合：
  从确定性的探索性起点调度器选择 (s0, a0)
  按 π 生成轨迹，并在 t=0 强制 a0
  G ← 0
  对 t=T−1 到 0：
    G ← reward[t] + γG
    若访问过滤器纳入 (state[t], action[t])：
      count[state[t], action[t]] += 1
      更新该键的运行均值 Q
      在本回合记账后对受影响状态改进 π
```

确定性的起点计划便于测试，但不等于无控制环境的自然起点分布。轨迹中应同时保存请求的起点和实际发生的第一步转移。

<a id="failure-modes"></a>

## 覆盖与相关性的失败模式

探索性起点不会自动让每个估计都变好：

- 短运行可能留下计数为零的状态—动作对；
- 稀有对的回报均值可能方差很高；
- 单条轨迹中的每次访问样本可能相关；
- 策略变化过快会改变后续回报的分布。

正确做法是公开覆盖和采样假设，而不是用模型答案填充缺失值。若实验提供“覆盖审计”，它只是计数报告，不是最优性的证明。

<a id="lab-connection"></a>

## 在实验中观察

打开 [Monte Carlo 实验](/zh-Hans/labs/ch05-monte-carlo)，选择 **MC Exploring Starts**，在同一随机种子和回合预算下比较 **first-visit** 与 **every-visit**。每次访问应在轨迹中至少记入同样多的出现；但每次访问不保证有限样本误差更低，因为回报可能相关。先记录无风基线，再开启风扰动预设，这样估计变化可以同时归因于采样动力学和种子元数据。

<a id="check-yourself"></a>

## 自测

一个回合访问 $(X,a)$ 三次、$(Y,b)$ 一次。每个状态—动作对纳入多少样本？

| 策略 | $(X,a)$ | $(Y,b)$ |
| --- | ---: | ---: |
| initial（若第一个键是 $(X,a)$） | 1 | 0 |
| first-visit | 1 | 1 |
| every-visit | 3 | 1 |

如果轨迹标注“first-visit”却记录了三个 $(X,a)$ 回报，则标签或记账至少有一个错误。

<a id="read-next"></a>

## 继续

探索性起点条件很有力，却难以在真实部署环境中保证。阅读 [MC $\varepsilon$-greedy](./epsilon-greedy)，了解如何用保持动作可发现的柔性策略替代强制起点。
