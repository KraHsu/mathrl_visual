---
id: ch04-generalized-policy-iteration
translation_key: ch04-generalized-policy-iteration
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.4-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 广义策略迭代与模型边界
description: 用价值—策略相互作用理解 GPI，并区分已知模型规划、基于模型学习和模型无关学习。
outline: deep
---

# 广义策略迭代与模型边界

广义策略迭代（Generalized Policy Iteration，GPI）用来描述两个目标之间的对话：价值估计逐渐与某个策略一致，策略估计逐渐相对于价值变得贪心。它是整理算法的视角，不是替代 Value Iteration 或 Policy Iteration 的第四个实现。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 把评估与改进描述为相互作用的两个算子；
2. 在同一图景中定位 Value Iteration、Policy Iteration 和 Truncated PI；
3. 解释 GPI 为什么允许多种调度与近似选择；
4. 区分已知模型规划、基于模型学习和模型无关学习；
5. 说明模型或更新近似时哪些收敛保证会失效。

<a id="gpi-loop"></a>

## 两个方向的作用力

令 $E$ 表示把 $v$ 推向当前策略价值的评估更新，令 $I$ 表示让 $\pi$ 相对于 $v$ 更贪心的策略更新：

```text
                 评估作用力
          v  <────────────────────────  vπ
          │                              │
          │                              │
          ▼                              ▲
       改进                           策略 π
          └────────────── I ─────────────┘
```

箭头是概念性的。实现可以精确评估、只做一轮扫描、使用有限批次，或更细粒度地交错更新。GPI 关注两种作用力是否朝着自洽的价值—策略对合作，不规定唯一时序或数据来源。

理想精确循环的不动点满足

$$
v=T_\pi v,
\qquad
\operatorname{supp}\pi(\cdot\mid s)\subseteq\arg\max_a B_v(s,a)
$$

第一个关系说价值属于该策略，第二个关系说策略对该价值是贪心的。在有限折扣假设下，二者共同推出 Bellman 最优不动点。

<a id="three-instances"></a>

## 一张图上的三种调度

| 算法 | 评估作用力 | 改进作用力 | 典型轨迹 |
| --- | --- | --- | --- |
| Value Iteration | 每次一次最优备份 $T_*$ | 每次备份后读取贪心动作 | 没有独立的内层策略评估 |
| Policy Iteration | 在改变策略前把 $v$ 推到 $v_\pi$ | 一次完整的贪心改进 | 内层块长，外层序列短 |
| Truncated PI | 有限块的 $T_\pi$ 扫描 | 扫描后进行贪心改进 | 内外层计数都重要 |

这张表是调度分类，不是所有实现中间值相同的保证。Value Iteration 的向量可能不是任何策略的价值，而精确评估的 Policy Iteration 向量是某个策略的价值。

<a id="model-boundary"></a>

## 本章所说的“基于模型”

第四章规划器接收每个合法状态—动作对的归一化一步模型

$$
p(s',r\mid s,a)
$$

它可以枚举结果并求期望，不必抽取轨迹。这是使用已知模型的动态规划。

下面三个说法很容易混淆：

| 场景 | $p$ 与奖励从哪里来 | 能审计什么 |
| --- | --- | --- |
| 已知模型规划（本章） | 题目直接提供 | 每个概率、奖励、备份和残差 |
| 基于模型的 RL | 从经验估计得到 $\hat p,\hat r$ | 估计模型及其规划结果，仍有模型误差 |
| 模型无关 RL | 不维护显式转移模型 | 采样回报或 TD 目标，不能逐行审计模型 |

称一个过程“基于模型”不表示模型精确；称一个过程“强化学习”也不表示它学习了模型。模型来源和数据来源应在可复现实验的元数据中分开记录。

<a id="approximation"></a>

## 近似会改变保证

若模型精确、更新同步、动作集有限、奖励有界且 $0\leq\gamma<1$，第三、四章的压缩与策略改进论证适用。若用 $\hat p,\hat r$ 替代真实模型，规划器求解的是估计问题：

$$
\hat T_*v(s)=\max_a\sum_{s',r}\hat p(s',r\mid s,a)
 [r+\gamma v(s')]
$$

相对于 $\hat T_*$ 的小残差，只能证明接近估计不动点，不能自动证明接近真实环境不动点。采样噪声、模型偏差、过期参数、异步写入和函数逼近都需要额外分析。

GPI 也允许近似策略改进。如果策略把概率放在“与最大值相差不超过容差”的动作上，结果可能是有用的近贪心策略，但精确的策略改进定理不再原样适用。容差、并列规则和模型版本应随结果一起保存。

<a id="schedules"></a>

## 同步是选择，不是定义

实验采用同步向量，使每个显示更新都有清楚的来源。其他 GPI 调度包括异步状态更新、优先级备份和交错批次。在适当条件下它们可能到达同一不动点，但轨迹、工作特征和证明不同。页面应明确写出调度，不能把“迭代”当作唯一原语。

Worker 分块让出事件循环时，必须保留同一份算法状态：模型版本、策略、价值向量、内外层计数及（若有）随机种子。中途以新的隐藏状态重启不是暂停，也不可复现。

<a id="chapter-boundary"></a>

## 与后续章节的交接

本章从模型出发进行规划。后续章节会替换其中一个或多个要素：

- Monte Carlo 从完整采样回合估计回报；
- 时序差分方法从采样的一步目标更新；
- 随机逼近分析带噪声、递减步长的更新；
- 基于值函数的方法把表格向量换成参数。

这些方法仍可能呈现 GPI 的模式——价值与策略相互影响——但不能仅因图形相似，就继承已知模型下的精确保证。

<a id="lab"></a>

## 在一个实验中看清边界

[规划实验](/zh-Hans/labs/ch04-planning-grid)带有模型审计面板。先运行无风配置，检查一整行转移，再开启 20% 风扰动。结果改变，是因为 $p(s',r\mid s,a)$ 改变；它仍是已知模型规划，没有采样轨迹，也没有学习转移模型。第一章的“转移分布/马尔可夫”入门实验也会单独提示开启风扰动；两处都要区分结果随机性与看到结果后的动作选择。

<a id="read-next"></a>

## 下一步：汇总三种算法

继续阅读[总结](./summary)进行紧凑比较，再用[问答](./q-and-a)和[检查点](./checkpoint)检验自己能否仅从轨迹判断调度与模型边界。
