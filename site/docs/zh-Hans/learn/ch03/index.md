---
id: ch03-overview
translation_key: ch03-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.1-3.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第三章：最优状态价值与 Bellman 最优方程"
description: 从固定策略评估走向最优价值、Bellman 最优算子、压缩映射与贪心最优策略。
outline: deep
---

# 第三章：最优状态价值与 Bellman 最优方程

第二章回答了“给定策略有多好”。第三章把决策重新放回问题：如果每个状态都能选择动作，怎样定义“最好”，怎样把所有眼前选择与长期后果写进同一个方程，又怎样确认求出的价值与策略确实是最优的？Bellman 最优方程用逐状态最大化回答这些问题。

::: info 内容边界
本站是非官方原创伴读。本章仅参照原书的主题范围，不复制原书正文、证明、图、表、示例、问答或代码。主题定位基于[固定上游版本](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%203%20Optimal%20State%20Values%20and%20Bellman%20Optimality%20Equation.pdf)。
:::

<a id="scope"></a>

## 本章边界

本章研究**有限、折扣、模型已知的 MDP**。重点是最优性的数学结构：动作备份、Bellman 最优算子、不动点、压缩性以及从最优价值恢复贪心策略。

我们会反复应用最优算子来观察不动点如何显现，但不会把它扩展为完整算法章。停止准则、实现变体、Value Iteration、Policy Iteration 与 Truncated Policy Iteration 的系统比较已移到[第四章](../ch04/)。这个边界也避免把“展示一个算子的不动点”误报为已经完成后续算法体系。

<a id="learning-goals"></a>

## 学习目标

完成本章后，你应该能够：

1. 用逐状态价值支配定义最优策略与最优状态价值；
2. 区分针对当前策略的 $q_\pi$ 与由最优价值构造的 $q_*$；
3. 从联合结果模型 $p(s',r\mid s,a)$ 写出动作备份；
4. 解释为什么先对环境结果求期望，再在请求动作之间取最大；
5. 写出 Bellman 最优方程 $v_*=T_*v_*$；
6. 在最大范数下证明 $T_*$ 至多按 $\gamma$ 压缩距离；
7. 利用残差给出近似价值的误差上界；
8. 从 $v_*$ 恢复全部贪心动作，并正确处理并列最优；
9. 说明折扣、奖励与转移模型如何改变最优策略；
10. 识别奖励平移不变性对继续型与终止型任务的不同边界。

<a id="concept-thread"></a>

## 从评估到最优性的概念主线

```text
给定策略 π 的价值 v_π
  └─ 计算 q_π(s,a)，发现可改进动作
       └─ 不再固定 π，比较每个请求动作的一步期望
            └─ (T_*v)(s)=max_a q_v(s,a)
                 ├─ 唯一不动点 v_*
                 ├─ argmax 给出一个或多个贪心动作
                 ├─ 压缩性保证从任意初值趋近 v_*
                 └─ γ、奖励与环境模型决定最大动作
```

最大值的位置至关重要。风扰动等环境随机性位于动作之后，所以每个请求动作必须先对其全部可能结果求期望；智能体不能在滑移结果已经发生后再倒过来挑选“实际动作”。

<a id="learning-path"></a>

## 学习路径

| 单元 | 要回答的问题 | 核心对象 |
| --- | --- | --- |
| [策略改进](./policy-improvement) | 当前策略的动作价值怎样暴露改进方向？ | $q_\pi$ |
| [最优价值](./optimal-values) | “对所有状态都不差”怎样形成最优性定义？ | $v_*,q_*$ |
| [Bellman 最优方程](./optimality-equation) | 怎样把动作选择和随机结果写进同一个算子？ | $T_*$ |
| [压缩映射](./contraction) | 为什么不动点存在、唯一且可逐步逼近？ | $\gamma$-压缩 |
| [贪心最优策略](./greedy-policies) | 怎样从唯一价值恢复可能不唯一的策略？ | $\arg\max$ |
| [影响因素](./factors) | 折扣、奖励和风扰动为何会改变最优动作？ | 参数敏感性 |
| [章节检查点](./checkpoint) | 能否在一个原创模型中走完整条推理链？ | 综合推导 |
| [Bellman 最优性实验](/zh-Hans/labs/bellman-optimality-grid) | 16 状态共享 Grid World 中每个最大值来自哪里？ | Rust/Wasm 实验 |

<a id="assumptions"></a>

## 数学假设

本章的主要结论采用以下明确边界：

- 状态集有限，每个非终止决策状态的动作集有限且非空；终止状态按固定零后续价值处理；
- 一步奖励有界；
- $0\leq\gamma<1$；
- $p(s',r\mid s,a)$ 对每个合法状态—动作对都是归一化联合分布；
- 终止状态的后续价值记为零，进入终止状态的即时奖励仍只计算一次；
- 环境模型在求解期间不变。

在这些条件下，最大值能够取得，$T_*$ 是最大范数下的压缩映射。若 $\gamma=1$，有些适当终止的任务仍可求解，但本章的压缩证明不再成立，因此实验会拒绝该配置。

<a id="read-next"></a>

## 从一次局部改进开始

先阅读[策略改进](./policy-improvement)，看看第二章同一个固定策略为何能被改进；也可以打开 [Bellman 最优性实验](/zh-Hans/labs/bellman-optimality-grid)，在共享 4×4 环境中逐项检查动作备份。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
