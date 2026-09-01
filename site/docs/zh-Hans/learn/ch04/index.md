---
id: ch04-overview
translation_key: ch04-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "第四章：Value Iteration 与 Policy Iteration"
description: 在已知模型中比较 Value Iteration、Policy Iteration、Truncated Policy Iteration 与广义策略迭代。
outline: deep
---

# 第四章：Value Iteration 与 Policy Iteration

第三章给出了压缩性与最优不动点。本章把这套数学结构变成可执行的规划过程。场景仍然有意保持清晰：有限、折扣的马尔可夫决策过程，而且一步转移与奖励模型已经已知。因为模型可用，浏览器能够逐项计算每个动作备份，而不必等待采样经验。

::: info 内容边界
本站是非官方原创伴读。页面只沿用原书的主题顺序，不复制原书正文、证明、图、表、示例、问答或代码。主题定位基于[固定上游版本](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%204%20Value%20Iteration%20and%20Policy%20Iteration.pdf)，其 SHA-256 已记录在本页元数据中。
:::

<a id="scope"></a>

## 本章边界

本章的三个算法都在交替使用两种动作：

1. **评估或更新价值**；
2. **改进或更新策略**。

Value Iteration 每次只做一轮 Bellman 最优备份；Policy Iteration 在改进之前把当前策略评估到不动点；Truncated Policy Iteration 则只做有限轮内部评估。广义策略迭代（Generalized Policy Iteration，GPI）描述的是更大的交替模式，而不是额外的单一算法。

这些算法都假定能够访问完整的一步联合模型 $p(s',r\mid s,a)$，所以在本章语境中它们属于动态规划。“基于模型的强化学习”是相关但不同的说法：基于模型的学习器会用数据估计这个模型。第五章才开始模型无关的路径；本章不采集经验，也不声称模型是从数据中学出来的。

<a id="learning-goals"></a>

## 学习目标

完成本章后，你应该能够：

1. 把 Bellman 最优算子写成同步的 Value Iteration 循环；
2. 解释 Value Iteration 的中间向量为什么不一定是任何策略的状态价值；
3. 区分策略评估、策略改进，并写出 Policy Iteration 的停止条件；
4. 理解精确、迭代和有限深度三种策略评估方式；
5. 把 Value Iteration 与 Policy Iteration 看作 Truncated Policy Iteration 的两个端点；
6. 使用 GPI 视角而不把它误称为一个具体算法；
7. 选择能区分“收敛”和“达到工作预算”的停止准则；
8. 审计并列动作、终止状态、随机结果、同步更新等细节；
9. 说清“已知模型”提供了什么，以及它没有证明什么。

<a id="concept-thread"></a>

## 从不动点到规划器的主线

```text
Bellman 最优方程 v*=T*v
  └─ 选择初始价值或初始策略
       ├─ Value Iteration：一次 T* 备份，再重复
       ├─ Policy Iteration：精确评估 π，再改进 π
       └─ Truncated PI：有限深度评估 π，再改进 π
            └─ 广义策略迭代：价值更新与策略更新相互作用
                 └─ 本章三个具体过程都需要已知的一步模型
```

这些箭头表示信息流，并不保证每一个中间数字都是某个策略的状态价值。这一点对 Value Iteration 和有限深度的策略评估尤其重要。

<a id="algorithm-map"></a>

## 算法地图

| 过程 | 外层对象 | 改进前的价值工作 | 常见停止信号 | 当前向量的含义 |
| --- | --- | ---: | --- | --- |
| [Value Iteration](./value-iteration) | $v_k$ | 一次最优备份 | Bellman 残差或更新量 | $T_*$ 的迭代点，不一定是 $v_\pi$ |
| [Policy Iteration](./policy-iteration) | $\pi_k$ | 求解 $v_{\pi_k}$ | 不再出现严格贪心改进 | 已评估策略的价值 |
| [Truncated Policy Iteration](./truncated-policy-iteration) | $(\pi_k,v_k)$ | $j_{\text{eval}}<\infty$ 轮固定策略扫描 | 外层残差或策略检查 | 内部未精确求解时只是近似 |
| [广义策略迭代](./generalized-policy-iteration) | 价值—策略对 | 任意可靠的部分评估/改进安排 | 取决于安排 | 取决于具体安排 |

同一份动作备份账本可以支撑三个具体算法；变化的是固定策略或最优算子应用多少次、何时读取策略，以及报告哪一种停止条件。

<a id="shared-model"></a>

## 共享的 4×4 实验模型

伴读实验复用第一章的 4×4 Grid World：状态 $0$ 位于左上角，状态 $15$ 是终止目标，状态 $6$ 和 $9$ 是危险格，动作是上/右/下/左/等待。基线无风，普通边界、危险和目标事件的奖励按前章定义为 $(-0.04,-1,-1,+1)$，折扣因子为 $\gamma=0.9$。

模型不会被箭头图隐藏。对每个请求动作，引擎列出所有实际结果、概率、后继状态、奖励和边界碰撞；规划器先对这些结果求期望，再比较请求动作。20% 风扰动预设改变的是结果账本，而不是决策发生的时机。

<a id="assumptions"></a>

## 假设与记号

除非单元另有说明，均假设状态集有限、非终止状态的动作集有限且非空、奖励有界、已知且归一化的一步联合分布 $p(s',r\mid s,a)$，以及 $0\leq\gamma<1$。按照本站的终止约定，终止状态的后续价值固定为零。

对候选向量 $v$，定义动作备份与两个算子：

$$
B_v(s,a)=\sum_{s',r}p(s',r\mid s,a)\,[r+\gamma v(s')],
\qquad
(T_*v)(s)=\max_a B_v(s,a),
$$

$$
(T_\pi v)(s)=\sum_a\pi(a\mid s)B_v(s,a)
$$

Value Iteration 应用 $T_*$；策略评估在固定 $\pi$ 时应用 $T_\pi$；策略改进从价值向量读取最大动作集合。把三种角色分开，实验轨迹才可逐项审计。

<a id="read-next"></a>

## 选择起点

如果想先看“一轮同步最优备份”如何成为完整循环，请从 [Value Iteration](./value-iteration) 开始。接着阅读 [Policy Iteration](./policy-iteration)，观察先把固定策略解出来为何能减少外层改进次数，再用 [Truncated Policy Iteration](./truncated-policy-iteration) 把两种过程放在同一条轴上。[规划实验](/zh-Hans/labs/ch04-planning-grid) 会在同一模型上运行三个调度。

第四章页面：[导览](/zh-Hans/learn/ch04/) · [Value Iteration](/zh-Hans/learn/ch04/value-iteration) · [Policy Iteration](/zh-Hans/learn/ch04/policy-iteration) · [Truncated PI](/zh-Hans/learn/ch04/truncated-policy-iteration) · [GPI 与模型边界](/zh-Hans/learn/ch04/generalized-policy-iteration) · [总结](/zh-Hans/learn/ch04/summary) · [问答](/zh-Hans/learn/ch04/q-and-a) · [检查点](/zh-Hans/learn/ch04/checkpoint) · [实验](/zh-Hans/labs/ch04-planning-grid)
