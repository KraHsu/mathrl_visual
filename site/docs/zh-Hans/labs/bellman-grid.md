---
id: exp-ch02-bellman-grid
translation_key: exp-ch02-bellman-grid
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_sections: "2.3-2.8"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Bellman 策略评估实验
description: 在原创四状态模型中检查同步 Bellman 扫描、价值传播与残差收敛。
aside: false
outline: deep
---

# Bellman 策略评估实验

这个实验在一个完全可检查的小模型中评估固定策略。Rust/Wasm 在浏览器 Worker 中完成数值计算；Vue 则把同一份状态呈现为价值网格、更新明细、转移表与残差历史。

::: warning 先导模型
这个四状态模型用于隔离并逐项检查 Bellman 机制；它还不是项目计划中从共享 4×4 Grid World 派生出的跨章节 Bellman 视图。
:::

<BellmanLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但下面的文字仍完整保留模型、Bellman 方程、第一轮扫描和手工观察步骤。
</noscript>

<a id="model"></a>

## 原创四状态模型

实验使用独立设计的策略诱导马尔可夫奖励过程，而不是原书中的图或示例：

- $s_0$ 是分岔状态，以相同概率通向路径状态 $s_1$ 或 $s_2$；
- $s_1$ 是通往完成状态的较可靠路径，但也可能回到 $s_0$；
- $s_2$ 是通往完成状态的较不可靠路径，同样可能回到 $s_0$；
- $s_3$ 是零奖励吸收终止状态。

**依赖关系**视图中的转移数值表列出了全部下一状态概率与奖励。该表是视觉连线的数据来源；读者无需通过线宽或位置猜测概率。

动作选择的细节已经在一个固定策略下求过平均，因此实验直接使用 $P_\pi$ 与 $r_\pi$。它不选择动作，不改进策略，不使用贪心规则，也不执行价值迭代。

<a id="controls"></a>

## 参数与控件

默认配置为

$$
\gamma=0.9,
\qquad
\varepsilon=10^{-3},
\qquad
K_{\max}=200.
$$

- **折扣因子 $\gamma$：**接受 $0\leq\gamma<1$，控制后继状态价值的权重。
- **容差 $\varepsilon$：**接受 $0<\varepsilon\leq1$，规定当前残差何时算作收敛。
- **最大扫描轮数 $K_{\max}$：**接受 $1$ 到 $10{,}000$ 的整数；它限制工作量，但不会把截断伪装成收敛。
- **执行一轮：**从当前价值向量的冻结副本计算一次更新。
- **运行到容差：**重复同一条扫描路径，直到收敛或达到轮数上限。
- **重置：**把四个价值和扫描计数恢复为零，同时保留已应用的配置。

切换语言时会保留已应用的配置和已完成扫描轮数。所有实验状态都留在浏览器本地。

<a id="synchronous-sweep"></a>

## 怎样阅读同步扫描

第 $k+1$ 轮中的每个状态更新都读取同一个旧向量 $v_k$：

$$
v_{k+1}(s)
=\sum_{s'}P_\pi(s,s')
\left[r(s,s')+\gamma v_k(s')\right].
$$

更新明细把每条转移拆成四个可审计字段：概率、即时奖励、旧的后继状态价值与加权贡献。只有四个新状态价值全部算完后，引擎才会一次性提交新向量。

从 $v_0=(0,0,0,0)^\mathsf T$ 出发并令 $\gamma=0.9$，第一轮必须得到

$$
v_1=(-0.10,\ 0.78,\ 0.56,\ 0)^\mathsf T.
$$

由于 $v_0$ 中所有后继状态价值都是零，第一个向量只包含一步期望奖励。第二轮开始，延续价值才会沿状态图传播。

<a id="residual"></a>

## 不只看颜色，还要读残差

界面显示的 Bellman 残差始终针对**当前**向量计算：

$$
\delta_k
=\lVert T_\pi v_k-v_k\rVert_\infty.
$$

它是全部状态中绝对自洽误差的最大值。在默认模型中，初始残差为 $0.78$；第一轮后的残差为 $0.603$。后者不只是生成 $v_1$ 时的最大更新量，而是在问：从 $v_1$ 再完整应用一次 Bellman 算子，最大会改变多少？

默认折扣下，线性方程组给出的精确参考值约为

$$
v_\pi=(0.664465,\ 0.899604,\ 0.799207,\ 0)^\mathsf T.
$$

这个参考值用于验证。学习目标是解释各项与残差怎样接近它，而不是只抄下这些数字。

<a id="tasks"></a>

## 观察任务

### 任务 A：解释第一轮

保留默认值，重置后执行一轮。逐状态解释后继状态价值为何贡献为零，并根据转移表中的概率与奖励还原四个显示结果。

### 任务 B：审计一个分岔状态

第二轮后，在更新明细中选择 $s_0$，手工相加它的两个加权贡献。确认两项都使用 $v_1$，即使界面此时也显示了刚提交的 $v_2$。

### 任务 C：区分更新量与当前残差

任选一个状态，记录最近一次 Rust 更新事件给出的绝对变化量，再记录提交后显示的残差。解释为什么局部状态更新与当前向量的全局残差是不同的量，不必相等。

### 任务 D：只改变折扣因子

比较 $\gamma=0$、$0.5$ 与 $0.9$。折扣为零时，一轮就得到一步期望奖励向量。随着 $\gamma$ 增大，解释路径的后续结果为什么更重要，以及收敛为什么可能需要更多轮。

### 任务 E：检验诚实截断

设置严格容差，并把最大扫描轮数设为一。运行到上限，确认只有残差真的满足容差时才报告收敛，否则应报告截断。

### 任务 F：用两种方法验证不动点

运行到容差，把迭代值与精确参考值比较，并检查最终残差。解释为什么线性求解与 Bellman 扫描互相吻合能够验证实现，却不会改变正在评估的策略。

<a id="no-javascript"></a>

## 没有 JavaScript 时的可读路径

如果交互组件不可用，仍然可以根据以下原创模型方程完整重建 Bellman 算子：

$$
\begin{aligned}
(T_\pi v)(s_0)
&=0.5[-0.1+\gamma v(s_1)]
 +0.5[-0.1+\gamma v(s_2)],\\
(T_\pi v)(s_1)
&=0.2[-0.1+\gamma v(s_0)]
 +0.8[1+\gamma v(s_3)],\\
(T_\pi v)(s_2)
&=0.4[-0.1+\gamma v(s_0)]
 +0.6[1+\gamma v(s_3)],\\
(T_\pi v)(s_3)
&=1[0+\gamma v(s_3)].
\end{aligned}
$$

先把四个价值设为零，在不改变旧向量的前提下计算每个右侧，再同时替换四个条目。反复执行即可在纸上模拟同步扫描。得到任意向量 $v$ 后，再计算一次所有方程右侧，并取最大的 $|(T_\pi v)(s)-v(s)|$，就得到残差。

这条文字路径保留了模型、算法、预期首轮结果和收敛判据；缺少的只有实时控件与视觉追踪。

<a id="chapter-links"></a>

## 把实验连接到本章

通过[状态价值](/zh-Hans/learn/ch02/state-values)理解正在计算的期望，通过 [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation)理解一步展开，通过[矩阵形式](/zh-Hans/learn/ch02/matrix-form)理解精确参考值，再通过[策略评估](/zh-Hans/learn/ch02/policy-evaluation)理解扫描与残差的保证。

第二章先导版页面：[概览](/zh-Hans/learn/ch02/) · [状态价值](/zh-Hans/learn/ch02/state-values) · [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation) · [矩阵形式](/zh-Hans/learn/ch02/matrix-form) · [策略评估](/zh-Hans/learn/ch02/policy-evaluation) · [动作价值](/zh-Hans/learn/ch02/action-values) · [检查点](/zh-Hans/learn/ch02/checkpoint) · [实验](/zh-Hans/labs/bellman-grid)
