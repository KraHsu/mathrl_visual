---
id: ch02-overview
translation_key: ch02-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.1-2.10"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 第二章：状态价值与 Bellman 方程
description: 通过期望回报、Bellman 方程、矩阵形式、同步扫描和动作价值，评估一个给定策略。
outline: deep
---

# 第二章：状态价值与 Bellman 方程

第一章描述了单条轨迹及其回报。第二章要问另一个问题：在轨迹尚未发生时，从某个状态出发并一直使用一个给定策略，未来的期望回报是多少？答案就是状态价值。Bellman 方程让不同状态的价值通过一步转移保持自洽。

::: info 内容边界
本站是非官方原创伴读。本章仅参照原书的主题顺序，不复制原书正文、图、表、示例、问答或代码。主题定位基于[固定上游版本](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%202%20State%20Values%20and%20Bellman%20Equation.pdf)。
:::

::: tip 两种互补的实验视图
现在的[共享 4×4 策略评估实验](/zh-Hans/labs/ch02-policy-evaluation)已经使用第一、三、四章相同的模型评估全部 16 个状态。原有的[四状态 Bellman 脚手架](/zh-Hans/labs/bellman-grid)保留为逐项审计单次备份的紧凑预演。两种视图都保持策略固定；在完成中英双语人工审核前，本章仍是草稿预览。
:::

<a id="scope"></a>

## 本章的范围边界

本章始终评估一个**给定且固定的策略** $\pi$。我们将定义 $v_\pi$ 与 $q_\pi$，推导它们的 Bellman 期望方程，并求出对应价值。本章不引入最优价值函数、贪心策略改进或价值迭代。它们要回答的是“怎样选择或改进策略”，属于后续章节。

这条边界也能避免常见的命名错误：反复应用固定策略的 Bellman 算子叫作**迭代策略评估**，不是价值迭代。

<a id="learning-goals"></a>

## 学习目标

完成本章后，你应该能够：

1. 区分一次采样得到的回报 $G_t$ 与条件期望 $v_\pi(s)$；
2. 把第一步奖励与后续回报分开，推导 Bellman 期望方程；
3. 从固定策略与环境模型构造 $r_\pi$ 和 $P_\pi$；
4. 把 $v_\pi=r_\pi+\gamma P_\pi v_\pi$ 改写成线性方程组；
5. 执行一次同步 Bellman 扫描，并解释 Bellman 残差；
6. 定义 $q_\pi(s,a)$，再按 $\pi$ 对动作价值求平均以还原 $v_\pi(s)$；
7. 在每个计算中准确说出正在评估哪个策略。

<a id="concept-thread"></a>

## 从回报走向价值的一条主线

```text
一条轨迹产生一个回报 G_t
  └─ 给定 S_t=s，并在未来遵循固定策略 π
       └─ 对所有可能未来求平均，得到 v_π(s)
            └─ 拆出一步，得到 Bellman 方程
                 ├─ 把所有状态方程收集为矩阵形式
                 ├─ 用精确方法或同步扫描求不动点
                 └─ 先固定第一个动作，得到 q_π(s,a)
```

关键变化是从一个已经实现的数值走向期望。同一状态出发的两次运行可能产生不同回报，而只要策略和环境不变，状态价值仍是这组回报分布的期望。

<a id="learning-path"></a>

## 学习路径

| 单元 | 要回答的问题 | 核心对象 |
| --- | --- | --- |
| [状态价值](./state-values) | 随机未来尚未采样时，一个状态能预测什么？ | $v_\pi(s)$ |
| [Bellman 方程](./bellman-equation) | 怎样用一步结果与后继状态价值表示长程期望？ | $T_\pi v$ |
| [矩阵形式](./matrix-form) | 怎样把所有状态方程组合成一个线性系统？ | $(I-\gamma P_\pi)v_\pi=r_\pi$ |
| [策略评估](./policy-evaluation) | 同步扫描怎样逼近不动点？如何量化误差？ | Bellman 残差 |
| [动作价值](./action-values) | 如果第一个动作单独固定，期望回报是什么？ | $q_\pi(s,a)$ |
| [章节检查点](./checkpoint) | 能否评估一个新模型的固定策略，而不越界到优化？ | 综合检查 |
| [共享 4×4 策略评估实验](/zh-Hans/labs/ch02-policy-evaluation) | 能否在给定策略下评估全部 16 个状态？ | Rust/Wasm 实验 |
| [四状态 Bellman 脚手架](/zh-Hans/labs/bellman-grid) | 能否检查紧凑计算中的每一项？ | Rust/Wasm 预演 |

<a id="notation"></a>

## 全章统一记号

对于折扣回合任务，

$$
G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\cdots,
\qquad 0\leq\gamma<1,
$$

固定策略下的状态价值函数是

$$
v_\pi(s)=\mathbb E_\pi[G_t\mid S_t=s].
$$

下标 $\pi$ 不是装饰，它记录了未来动作由哪个决策规则产生。即使环境不变，改变策略通常也会改变未来回报的分布，因而改变状态价值。

<a id="read-next"></a>

## 从期望开始

继续阅读[状态价值](./state-values)，或打开[共享 4×4 策略评估实验](/zh-Hans/labs/ch02-policy-evaluation)，边阅读边对照一次扫描的计算。

第二章页面：[概览](/zh-Hans/learn/ch02/) · [状态价值](/zh-Hans/learn/ch02/state-values) · [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation) · [矩阵形式](/zh-Hans/learn/ch02/matrix-form) · [策略评估](/zh-Hans/learn/ch02/policy-evaluation) · [动作价值](/zh-Hans/learn/ch02/action-values) · [检查点](/zh-Hans/learn/ch02/checkpoint) · [共享 4×4 实验](/zh-Hans/labs/ch02-policy-evaluation) · [四状态脚手架](/zh-Hans/labs/bellman-grid)
