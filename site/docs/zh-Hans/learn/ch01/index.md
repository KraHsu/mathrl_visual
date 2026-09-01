---
id: ch01-overview
translation_key: ch01-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.1-1.9"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 第一章：从交互走向决策模型
description: 建立状态、动作、转移、策略、奖励、回报、回合和 MDP 的概念地图。
outline: deep
---

# 第一章：从交互走向决策模型

强化学习研究的是一个持续闭环：智能体观察当前情形，选择动作，环境产生下一状态与奖励，智能体再据此继续决策。第一章的任务不是求出“最佳动作”，而是先把这个闭环描述清楚。

::: info 内容边界
本站是非官方原创伴读。本章仅参照原书第一章的主题顺序，不复制原书正文、图、表、问答或代码。主题定位基于[固定上游版本](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%201%20Basic%20Concepts.pdf)。
:::

<a id="learning-goals"></a>

## 学习目标

完成本章后，你应该能够：

1. 用状态空间 $\mathcal S$ 和动作集合 $\mathcal A(s)$ 描述一个有限任务；
2. 区分环境的转移规律 $p(s'\mid s,a)$ 与智能体的策略 $\pi(a\mid s)$；
3. 解释即时奖励为什么不等于长期目标；
4. 从轨迹计算普通回报与折扣回报；
5. 说明轨迹、回合、目标状态和终止状态之间的差别；
6. 检查一个状态表示是否满足马尔可夫性质；
7. 把上述元素组合成一个有限马尔可夫决策过程（MDP）。

<a id="concept-map"></a>

## 一条主线串起所有概念

```text
当前状态 s_t
  └─ 策略 π(a|s) 选择动作 a_t
       └─ 环境模型产生下一状态 s_{t+1} 与奖励 r_{t+1}
            └─ 多步连接成轨迹
                 └─ 奖励按时间累积成回报 G_t
                      └─ 终止规则把轨迹划分为回合
```

这条链里有两类对象不能混淆：

- **决策规则**属于智能体，例如策略 $\pi(a\mid s)$；
- **响应规律**属于环境，例如转移分布 $p(s'\mid s,a)$ 和奖励规则。

环境可能随机，策略也可能随机，但两种随机性的来源不同。后续所有算法都建立在这条边界上。

<a id="learning-path"></a>

## 当前学习路径

| 单元 | 现在要回答的问题 | 状态 |
| --- | --- | --- |
| [状态与动作](./state-action) | 什么信息足以描述“此刻”？智能体能做什么？ | 已实现 |
| [状态转移](./transitions) | 执行动作后，环境如何产生下一状态？ | 已实现 |
| [策略](./policies) | 怎样把选择规则写成动作概率？ | 已实现 |
| [奖励](./rewards) | 如何设计反馈而不诱导短视行为？ | 已实现 |
| [轨迹与回报](./returns) | 怎样评价一串跨时间的结果？ | 已实现 |
| [回合与终止](./episodes) | 轨迹在何处结束，目标是否一定终止？ | 已实现 |
| [MDP 与马尔可夫性质](./mdp) | 怎样把完整任务写成可验证模型？ | 已实现 |
| [章节检查点](./checkpoint) | 能否把所有概念用于一个新任务？ | 已实现 |

你可以按表格顺序阅读，也可以随时进入 [Grid World 概念实验](/zh-Hans/labs/ch01-gridworld)，在世界、转移、策略、奖励、回报、回合、马尔可夫和审计视图之间切换。实验使用独立设计的 4×4 地图，并由 Rust/Wasm 在浏览器本地计算。

<a id="checkpoint"></a>

## 进入实验前的检查

考虑“室内配送机器人”任务。下面哪些信息应该进入状态？

- 机器人的网格位置；
- 如果电量会影响下一步移动，则还需要电量；
- 如果门的开关会改变可达区域，则还需要门的状态；
- 已经过去的步数只有在它会改变未来规则时才有必要加入。

判断标准不是“信息是否容易记录”，而是：已知当前状态和动作后，预测下一步是否仍然需要额外历史。
