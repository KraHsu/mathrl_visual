---
id: ch03-contraction
translation_key: ch03-contraction
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.3.3-3.3.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 压缩映射与唯一不动点
description: 在最大范数下证明 Bellman 最优算子的压缩性，并从残差得到可审计误差界。
outline: deep
---

# 压缩映射与唯一不动点

Bellman 最优方程是非线性的，但它并非不可控制。最大化动作可能切换，两个价值向量经过同一次最优备份后，最远分量之间的距离仍至多变成原来的 $\gamma$ 倍。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 定义不动点与压缩映射；
2. 陈述压缩映射定理的存在性、唯一性和迭代结论；
3. 使用“两个最大值之差”的不等式证明 $T_*$ 的压缩性；
4. 区分相邻轮最大更新量、Bellman 残差与真实价值误差；
5. 从残差计算对 $v_*$ 的保守误差上界。

<a id="fixed-points"></a>

## 不动点与最大范数

若映射 $F$ 满足 $F(x_*)=x_*$，则 $x_*$ 是它的不动点。对状态价值向量，使用最大范数

$$
\|v\|_\infty=\max_s|v(s)|.
$$

它直接回答“误差最大的状态偏离多少”，也与概率加权平均自然配合：对任意概率分布 $p$，

$$
\left|\sum_i p_i x_i\right|
\leq\sum_i p_i|x_i|
\leq\|x\|_\infty.
$$

<a id="contraction-theorem"></a>

## 压缩映射定理

如果在完备空间中存在常数 $c<1$，使任意 $x,y$ 满足

$$
\|F(x)-F(y)\|\leq c\|x-y\|,
$$

则：

1. $F$ 有且只有一个不动点 $x_*$；
2. 从任意有限初值 $x_0$ 出发，$x_{k+1}=F(x_k)$ 都收敛到 $x_*$；
3. 误差满足 $\|x_k-x_*\|\leq c^k\|x_0-x_*\|$。

有限维空间 $\mathbb R^{|\mathcal S|}$ 在最大范数下是完备的。相邻项还满足

$$
\|x_{k+1}-x_k\|
\leq c^k\|x_1-x_0\|,
$$

其几何级数尾和保证序列是 Cauchy 序列。这里的 $c$ 是上界；实际一次更新可能压缩得更多，甚至直接把两个向量映到同一点。

<a id="max-lemma"></a>

## 一个关于最大值的小引理

对两组同索引实数 $\{x_a\}$ 与 $\{y_a\}$，有

$$
\left|\max_a x_a-\max_a y_a\right|
\leq\max_a|x_a-y_a|.
$$

设 $a_x$ 是第一组的最大索引，则

$$
\max_a x_a-\max_a y_a
=x_{a_x}-\max_a y_a
\leq x_{a_x}-y_{a_x}
\leq\max_a|x_a-y_a|.
$$

交换两组即可控制相反方向。这个引理不要求两组最大值由同一个动作取得，因此正好处理贪心动作随价值向量切换的情况。

<a id="operator-proof"></a>

## $T_*$ 的压缩性

令

$$
q_u(s,a)=\sum_{s',r}p(s',r\mid s,a)[r+\gamma u(s')]
$$

并类似定义 $q_v$。对任一状态 $s$，先用最大值引理，再使用概率归一化：

$$
\begin{aligned}
|(T_*u)(s)-(T_*v)(s)|
&\leq\max_a|q_u(s,a)-q_v(s,a)|\\
&=\max_a\left|
\gamma\sum_{s',r}p(s',r\mid s,a)[u(s')-v(s')]
\right|\\
&\leq\gamma\|u-v\|_\infty.
\end{aligned}
$$

再对状态取最大值，得到

$$
\boxed{
\|T_*u-T_*v\|_\infty
\leq\gamma\|u-v\|_\infty
}.
$$

即时奖励在差中抵消；环境结果的概率平均不会放大最大分量差；动作最大化也不会放大所有动作中最大的差。

<a id="consequences"></a>

## 对 Bellman 最优方程的结论

因为 $0\leq\gamma<1$，压缩映射定理立即给出：

- $v=T_*v$ 有唯一解 $v_*$；
- 对任意有限 $v^{(0)}$，同步更新 $v^{(k+1)}=T_*v^{(k)}$ 都趋近 $v_*$；
- 真实误差满足

$$
\|v^{(k)}-v_*\|_\infty
\leq\gamma^k\|v^{(0)}-v_*\|_\infty;
$$

- 迭代点的残差满足

$$
\|T_*v^{(k+1)}-v^{(k+1)}\|_\infty
\leq\gamma
\|T_*v^{(k)}-v^{(k)}\|_\infty.
$$

“至多缩小为 $\gamma$ 倍”不能改写成“每轮恰好乘 $\gamma$”。动作切换、终止状态和模型结构都可能产生更快收缩。

<a id="residual-bound"></a>

## 用 Bellman 残差审计近似解

候选向量 $v$ 的最优性残差定义为

$$
\delta(v)=\|T_*v-v\|_\infty.
$$

利用三角不等式与压缩性：

$$
\begin{aligned}
\|v-v_*\|_\infty
&\leq\|v-T_*v\|_\infty
 +\|T_*v-T_*v_*\|_\infty\\
&\leq\delta(v)+\gamma\|v-v_*\|_\infty.
\end{aligned}
$$

所以

$$
\boxed{
\|v-v_*\|_\infty
\leq\frac{\delta(v)}{1-\gamma}
}.
$$

残差是把**当前向量重新备份**后的不一致程度。同步更新时，它等于下一轮与当前轮的最大差，但它不是未知的真实误差；上式只提供可计算的保守上界。

<a id="boundaries"></a>

## 适用边界与运行状态

- $\gamma=0$ 时，$T_*$ 的压缩常数为零，价值只由最大期望即时奖励决定。
- $\gamma=1$ 时，上述常数不小于一，不能用本定理声称唯一性或收敛。理论范围是 $0\leq\gamma<1$；为给界面校验和运行时间留出明确上限，第三章实验接受 $[0,0.99]$。
- 达到最大扫描数但残差仍高于容差叫作**截断**，不是收敛。
- 浮点计算应同时报告容差、残差与扫描数，不能只显示“完成”。
- 对异步更新或近似函数情形，需要另行分析；本节结论针对完整表格上的精确同步 $T_*$。

<a id="self-check"></a>

## 自测

若 $\gamma=0.8$，两个初始向量的距离至多为 $5$，且某候选向量的残差为 $0.03$：

1. 一次最优备份后的距离上界是多少？
2. 三次备份后的距离上界是多少？
3. 残差给出怎样的价值误差证书？

::: details 核对答案
一次后至多为 $0.8(5)=4$；三次后至多为 $0.8^3(5)=2.56$；残差证书为 $0.03/(1-0.8)=0.15$。这些都是上界，实际距离可以更小。
:::

<a id="chapter-links"></a>

## 继续学习第三章

唯一不动点确定后，下一节说明怎样恢复[贪心最优策略](./greedy-policies)。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
