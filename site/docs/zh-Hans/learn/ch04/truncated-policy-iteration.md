---
id: ch04-truncated-policy-iteration
translation_key: ch04-truncated-policy-iteration
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Truncated Policy Iteration：一条调度连续谱"
description: 限制内层策略评估深度，说明两端如何对应 Value Iteration 与 Policy Iteration，并诚实报告近似。
outline: deep
---

# Truncated Policy Iteration：一条调度连续谱

Policy Iteration 的内层评估可以在有限轮后停止。这个过程常称为 Truncated Policy Iteration、Modified Policy Iteration 或有限深度策略迭代。名称不是关键，关键是明确做了多少轮固定策略更新，以及这些更新从哪一个向量开始。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 写出 Truncated PI 的内外层循环；
2. 解释它与 Value Iteration、Policy Iteration 的端点关系；
3. 识别有限深度向量何时只是近似；
4. 选择固定或自适应的内层深度，而不把深度误当成收敛；
5. 按工作量和信息量比较调度，而不只看迭代编号。

<a id="inner-loop"></a>

## 有限的内层评估

在外层第 $k$ 轮固定 $\pi_k$，从明确命名的向量 $u_0$ 开始，应用

$$
u_{j+1}=T_{\pi_k}u_j,
\qquad j=0,1,\ldots,j_{\mathrm{eval}}-1
$$

然后令 $v_k=u_{j_{\mathrm{eval}}}$，并用

$$
q_k(s,a)=B_{v_k}(s,a),
\qquad
\pi_{k+1}(\cdot\mid s)\subseteq
\arg\max_a q_k(s,a)
$$

改进策略。

“截断”指停止**内层**固定策略序列，并不是从模型中删除随机结果。每一轮内层扫描仍须对完整结果行求和。

<a id="endpoints"></a>

## 两个端点及其成立条件

深度轴可以这样理解：

| 内层深度 | 调度 | 限定条件 |
| ---: | --- | --- |
| $j_{\mathrm{eval}}=1$ | 类似 Value Iteration | 只有在初始向量与前一轮匹配、且策略由前一向量贪心构造时，这一次备份才等同于 $T_*$；任意初始化可能产生不同轨迹 |
| 有限 $j_{\mathrm{eval}}>1$ | Truncated PI | 每次外层改进前传播更多固定策略信息，但未单独收敛时向量仍是近似 |
| $j_{\mathrm{eval}}\to\infty$ | Policy Iteration | 在压缩假设下内层极限为 $v_{\pi_k}$ |

所以“Value Iteration 是深度为一的 Truncated PI”是带有匹配调度条件的说法，不能给每个一步更新都改名。可复现轨迹必须显示初始向量及何时形成贪心策略。

<a id="algorithm"></a>

## 内外层伪代码

```text
输入：已知模型、初始策略 π0、内层深度 J
令 v ← 明确的初始向量
重复，直到外层停止条件触发：
    old_policy ← π
    对 j = 1 … J：
        执行同步固定策略备份 Tπ(v)
    对每个非终止状态 s：
        对所有动作计算 q[s,a]
        π ← 支持在 argmax_a q[s,a] 上的策略
    记录内层残差、策略变化掩码和 v
返回 π、v，以及 stable 或 truncated 状态
```

实现可以把内层向量重置为上一外层向量、继续沿用它，或使用直接求解。这些选择会改变轨迹，必须写入实验配置。本实验采用沿用向量的方式，使改变 $J$ 只改变内层工作量。

<a id="monotonicity"></a>

## 有限评估保证什么、不保证什么

如果内层从上一策略的精确价值开始，并根据该价值贪心选出新策略，那么在通常的逐状态序关系下，每次固定策略备份都不会低于上一轮价值。这是一个有用的解释条件，不是所有近似实现的无条件性质。

若从任意近似向量开始，有限扫描可能使某个坐标下降；后续轮次仍可能恢复。它不一定表示程序错误，但轨迹必须报告初始化、内层残差和外层策略变化，不能只画一条上升的“分数线”。

有限深度向量通常不等于 $v_{\pi_k}$：

$$
\|v_k-v_{\pi_k}\|_\infty
\leq \gamma^{j_{\mathrm{eval}}}
\|u_0-v_{\pi_k}\|_\infty
$$

这个固定策略压缩界说明额外内层工作为何有帮助，但它不规定一个普适的最佳深度。

<a id="tradeoffs"></a>

## 比较工作量，而不只是外层轮数

若有 $K$ 个外层轮次、每轮 $J$ 次内层扫描、$n$ 个状态、每个状态 $m$ 个动作、每个动作 $d$ 个结果，主要模型查询量约为 $O(KJnd)$（固定策略评估）加上 $O(Knmd)$（贪心改进）。外层轮数少的 Policy Iteration 可能比外层轮数多的 Value Iteration 做更多模型工作。

| 问题 | 较小 $J$ | 较大 $J$ |
| --- | --- | --- |
| 多久重新考虑一次策略？ | 更频繁 | 更少 |
| 每个价值向量精度 | 较低 | 较高 |
| 每轮内层工作 | 较少 | 较多 |
| 适合情形 | 动作选择变化快 | 固定策略传播结构有价值 |

当贪心集合不稳定时增加 $J$、内层残差很小时减少 $J$，都属于自适应 Truncated PI。自适应规则必须成为记录中的算法版本。

<a id="stopping"></a>

## 两层停止条件

规划器应分别公开：

- **内层测试：** $\|T_{\pi_k}u_j-u_j\|_\infty$ 是否低于内层容差，还是先达到固定深度？
- **外层测试：** 贪心策略/集合是否不再改变，还是先达到外层预算？

如果用户指定固定深度，提前达到内层容差是有价值的信息，但除非配置声明“自适应”，不能悄悄增加扫描。反之，外层预算耗尽而最后一次更新很小，仍应标记为 truncated，只要策略稳定性测试尚未通过。

<a id="lab"></a>

## 在规划实验中扫过深度

打开[规划实验](/zh-Hans/labs/ch04-planning-grid)，选择 **Truncated PI**，在同一初始策略和模型下比较 $J=1$、$J=2$、$J=8$。保持模型和停止容差不变。表格应显示外层轮次、内层扫描、策略变化、本轮最大更新量、最优性残差和总模型备份数。然后开启 20% 风扰动；这检验的是动力学敏感性，而不是隐藏的调度变化。

<a id="read-next"></a>

## 下一步：给共同模式命名

这条深度连续谱是[广义策略迭代](./generalized-policy-iteration)的一种实例：价值估计与策略估计在相互作用中改进。下一节还会划清已知模型、基于模型学习和模型无关学习的边界。
