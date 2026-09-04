---
id: exp-ch02-grid-policy-evaluation
translation_key: exp-ch02-grid-policy-evaluation
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.3-2.8"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 共享 4×4 Grid World 策略评估实验
description: 在全部 16 个状态上评估给定固定策略，观察同步 Bellman 期望备份、矩阵形式与精确参考解。
aside: false
outline: deep
---

# 共享 4×4 Grid World 策略评估实验

这是第二章的完整伴读实验。它在与第一、三、四章**相同的 4×4 Grid World** 上评估一个给定策略。Rust/Wasm 在浏览器 Worker 中负责 Bellman 数值计算；Vue 展示 16 状态热图、选中状态的项、策略诱导矩阵，以及每个稠密视图的数值表。

::: info 固定策略边界
策略是评估的输入，不是评估的输出。实验不会在动作之间取最大值、改进策略或执行价值迭代。独立的[四状态 Bellman 脚手架](/zh-Hans/labs/bellman-grid)仍保留为阅读一步备份账本的紧凑预演。
:::

<GridPolicyEvaluationLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但下面仍保留完整的 16 状态模型、第一轮同步向量、矩阵方程和纸笔操作流程。
</noscript>

<a id="shared-model"></a>

## 跨章节共享的一份模型

状态按行优先编号：

$$
s=4r+c,\qquad r,c\in\{0,1,2,3\}.
$$

状态 $0$ 是起点，状态 $15$ 是终止目标，状态 $6$ 和 $9$ 是危险格。走出边界会停留在原地并产生边界奖励；进入危险格产生危险奖励；进入状态 $15$ 产生目标奖励并结束回合，转移之后的延续价值为零。

对于请求动作 $a$，共享环境先形成

$$
p(s'\mid s,a),
$$

其中包含可选的风概率。默认固定策略在五个动作上均匀分布：

$$
\pi(a\mid s)=\frac15\quad(s\ne15),
\qquad
\pi(a\mid15)=0.
$$

可选的“朝向目标”预设同样在评估开始前固定。它可以帮助比较两个策略诱导的价值函数，但不会被实验学习。

<a id="operator"></a>

## 16 状态 Bellman 期望算子

同时对给定策略和环境取平均，定义

$$
r_\pi(s)=\sum_a\pi(a\mid s)\sum_{s'}p(s'\mid s,a)r(s,a,s'),
$$

$$
P_\pi(s,s')=\sum_a\pi(a\mid s)p(s'\mid s,a).
$$

固定策略方程为

$$
\boxed{v_\pi=r_\pi+\gamma P_\pi v_\pi}.
$$

对于选中的状态，实时账本保留未聚合的各项：

$$
(T_\pi V)(s)=\sum_a\sum_{s'}\pi(a\mid s)p(s'\mid s,a)
\left[r(s,a,s')+\gamma V(s')\right].
$$

每一项都显示策略概率、转移概率、奖励、旧的后继价值和合并贡献，因此可以把标量方程与矩阵行逐项核对。

<a id="first-sweep"></a>

## 第一轮 golden 向量

令 $V_0=0$，使用默认奖励和无风设置，执行一次**同步**扫描。由于 $V_0$ 中每个延续价值都是零，第一轮向量就是策略诱导的即时奖励向量：

$$
\begin{aligned}
V_1={}&(-0.424,\,-0.232,\,-0.424,\,-0.424,\\
&-0.232,\,-0.424,\,-0.232,\,-0.424,\\
&-0.424,\,-0.232,\,-0.424,\,-0.024,\\
&-0.424,\,-0.424,\,-0.024,\,0)^{\mathsf T}.
\end{aligned}
$$

例如，状态 $0$ 有两个边界结果（上、左）、两个普通移动结果（右、下）和一个停留结果。均匀策略下，五个奖励为 $-1,-0.04,-0.04,-1,-0.04$，平均值为 $-0.424$。状态 $15$ 没有终止后的行，因此保持为零。

16 个价值都从同一个冻结的 $V_0$ 计算，再一起提交。如果在计算另一状态时读取刚显示的新值，就会无意中变成异步算法。

<a id="matrix-and-reference"></a>

## 矩阵形式与独立参考解

矩阵页展示全部 16 列，包括终止状态列。移项得到

$$
(I-\gamma P_\pi)v_\pi=r_\pi.
$$

Rust 评估器使用带部分主元的高斯消元求解这个 16×16 方程组。在默认配置下，精确参考向量约为

$$
\begin{aligned}
v_\pi\approx(&-3.345201,-3.096646,-3.256641,-3.295713,\\
&-3.096646,-3.119565,-2.831253,-2.810181,\\
&-3.256641,-2.831253,-2.422653,-1.509235,\\
&-3.295713,-2.810181,-1.509235,0)^{\mathsf T}.
\end{aligned}
$$

迭代向量和直接解是同一固定策略的两种视图。它们相互吻合可以检查实现，但不是策略改进步骤。

<a id="residual-and-truncation"></a>

## 残差、收敛与诚实截断

实时残差始终针对当前向量计算：

$$
\delta_k=\lVert T_\pi V_k-V_k\rVert_\infty.
$$

在 $0\le\gamma<1$ 且模型有限、有界时，$T_\pi$ 在无穷范数下是压缩映射。只有 $δ_k\le\varepsilon$ 时界面才报告**收敛**；如果先达到扫描上限，则报告**截断**，即使颜色看上去已经稳定。风会改变 $P_\pi$；切换策略预设会同时改变 $r_\pi$ 与 $P_\pi$。

<a id="observation-tasks"></a>

## 观察任务

1. 保持均匀策略和无风。执行一轮并核对 golden 向量的每个条目。
2. 选中状态 $0$，把五个策略加权项与矩阵页的第 0 行比较。
3. 开启 20% 风扰动并重置，解释为什么同一个请求动作现在会贡献多个实际动作行，而策略仍未改变。
4. 比较当前残差与某个选中状态的绝对更新量。它们分别是全局量与局部量，不必相等。
5. 设置严格容差并令“最大扫描轮数 = 1”，运行到上限，确认截断不会被称作收敛。
6. 切换到朝向目标的固定策略并重置。解释为什么新的不动点不表示评估器优化了策略。

<a id="no-javascript"></a>

## 没有 JavaScript 时的纸笔流程

枚举全部非终止状态和动作，读取共享转移行，把每行乘以 $π(a\mid s)$，再把相同后继状态聚合成 $P_\pi$。然后：

1. 将 16 个 $V_0$ 条目都设为零；
2. 使用同一个旧向量计算 $r_\pi+\gamma P_\pi V_k$ 的每一行；
3. 一次性替换整 个向量；
4. 取目标向量与当前向量差的绝对值最大者作为 $δ_k$；
5. 只在达到容差或明确报告扫描上限时停止。

矩阵表和选中状态账本为每个视觉元素提供数值替代，因此密集箭头和颜色深浅不会成为唯一信息源。

<a id="chapter-links"></a>

## 把实验连接到第二章

通过[状态价值](/zh-Hans/learn/ch02/state-values)理解正在估计的期望，通过 [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation)理解一步分解，通过[矩阵形式](/zh-Hans/learn/ch02/matrix-form)理解线性系统，再通过[迭代策略评估](/zh-Hans/learn/ch02/policy-evaluation)理解压缩映射与残差。
