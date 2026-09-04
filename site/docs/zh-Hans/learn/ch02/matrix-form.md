---
id: ch02-matrix-form
translation_key: ch02-matrix-form
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Bellman 方程的矩阵形式
description: 把固定策略下的奖励、转移与状态价值组合成一个线性方程组。
outline: deep
---

# Bellman 方程的矩阵形式

逐状态书写 Bellman 方程，容易看清逻辑；把所有方程放在一起，则能看清背后的线性代数。对于有限状态空间和固定策略，策略评估就是一个线性方程组。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 按照声明的状态顺序构造奖励向量 $r_\pi$ 和转移矩阵 $P_\pi$；
2. 在逐状态 Bellman 方程与向量记号之间转换；
3. 通过代入验证一个候选价值向量；
4. 区分精确线性求解与迭代策略评估。

<a id="vector-assembly"></a>

## 先选定顺序，再处处保持一致

把有限状态空间排序为 $(s_0,s_1,\ldots,s_{n-1})$。定义

$$
v_\pi=
\begin{bmatrix}
v_\pi(s_0)\\
v_\pi(s_1)\\
\vdots\\
v_\pi(s_{n-1})
\end{bmatrix},
\qquad
r_\pi=
\begin{bmatrix}
r_\pi(s_0)\\
r_\pi(s_1)\\
\vdots\\
r_\pi(s_{n-1})
\end{bmatrix},
$$

并把从行状态 $s_i$ 转移到列状态 $s_j$ 的概率放在

$$
[P_\pi]_{ij}=P_\pi(s_i,s_j).
$$

如果显式保留一个零奖励吸收终止状态，$P_\pi$ 的每一行都非负且和为一：

$$
P_\pi\mathbf 1=\mathbf 1.
$$

如果删去终止状态，只在矩阵中保留非终止状态，那么概率可能流出所表示的集合，某些行之和可以小于一。两种约定都可行，但不能在同一个计算中混用。

<a id="matrix-equation"></a>

## 汇总全部 Bellman 方程

每一行的标量方程

$$
v_\pi(s_i)=r_\pi(s_i)+\gamma\sum_jP_\pi(s_i,s_j)v_\pi(s_j)
$$

可以合并为

$$
\boxed{v_\pi=r_\pi+\gamma P_\pi v_\pi}.
$$

把价值项移到同一侧：

$$
(I-\gamma P_\pi)v_\pi=r_\pi.
$$

对于 $0\leq\gamma<1$、$P_\pi$ 为随机矩阵的有限折扣问题，$I-\gamma P_\pi$ 可逆，因此

$$
v_\pi=(I-\gamma P_\pi)^{-1}r_\pi.
$$

这个逆矩阵首先是一个数学表达式，通常不意味着数值实现应该显式形成矩阵逆。直接使用线性方程求解器往往更合适。

<a id="worked-system"></a>

## 一个原创的三状态系统

考虑两个非终止状态 $a,b$ 和零奖励吸收终止状态 $z$。某个固定策略诱导出

$$
P_\pi=
\begin{bmatrix}
0 & 0.6 & 0.4\\
0 & 0.5 & 0.5\\
0 & 0 & 1
\end{bmatrix},
\qquad
r_\pi=
\begin{bmatrix}
0.8\\
1.5\\
0
\end{bmatrix},
\qquad
\gamma=0.8.
$$

不用求逆，也能检查下面的候选解：

$$
v_\pi=
\begin{bmatrix}
2\\
2.5\\
0
\end{bmatrix}
$$

$$
P_\pi v_\pi=
\begin{bmatrix}
1.5\\
1.25\\
0
\end{bmatrix},
\qquad
r_\pi+0.8P_\pi v_\pi
=
\begin{bmatrix}
2\\
2.5\\
0
\end{bmatrix}.
$$

这个结果经过 Bellman 算子后仍等于自身，所以 Bellman 残差为零。

<a id="matrix-audit"></a>

## 求解前先审计矩阵

依次检查：

1. **状态顺序：**$P_\pi$ 的行与列、$r_\pi$ 和 $v_\pi$ 全部采用同一顺序。
2. **形状：**若表示 $n$ 个状态，$P_\pi$ 应为 $n\times n$，两个向量的长度都应为 $n$。
3. **概率：**条目非负；所表示行的和符合选定的终止状态约定。
4. **奖励含义：**$r_\pi(s)$ 是离开 $s$ 后的一步期望奖励，不是长期回报。
5. **终止规则：**如果保留吸收终止状态，该行以概率一转移到自身，期望奖励为零。
6. **残差：**把解代回 $r_\pi+\gamma P_\pi v$ 后，应在数值容差内还原 $v$。

误把 $P_\pi$ 转置尤其常见。本站采用“行表示当前状态，列表示下一状态”的方向，因此 $P_\pi v$ 的每一行都是后继状态价值的概率加权和。

<a id="closed-vs-iterative"></a>

## 求同一个不动点的两种方法

精确线性求解直接求解 $(I-\gamma P_\pi)v=r_\pi$。迭代策略评估则反复应用

$$
v_{k+1}=r_\pi+\gamma P_\pi v_k.
$$

在上述有限折扣假设下，两种方法都以同一个 $v_\pi$ 为目标。下一节会解释迭代为何收敛，以及如何量化进度。两种方法都不会改变或改进固定策略。

<a id="self-check"></a>

## 自测

在上面的系统中，只用第二行求出 $v_\pi(b)$，再用第一行求出 $v_\pi(a)$。

::: details 核对答案
第二行给出 $v_\pi(b)=1.5+0.8[0.5v_\pi(b)]$，所以 $0.6v_\pi(b)=1.5$，得到 $v_\pi(b)=2.5$。因为 $v_\pi(z)=0$，第一行给出 $v_\pi(a)=0.8+0.8[0.6(2.5)]=2$。
:::

<a id="chapter-links"></a>

## 继续学习第二章

继续阅读[策略评估](./policy-evaluation)，把向量方程变成可观察的同步扫描。

第二章先导版页面：[概览](/zh-Hans/learn/ch02/) · [状态价值](/zh-Hans/learn/ch02/state-values) · [Bellman 方程](/zh-Hans/learn/ch02/bellman-equation) · [矩阵形式](/zh-Hans/learn/ch02/matrix-form) · [策略评估](/zh-Hans/learn/ch02/policy-evaluation) · [动作价值](/zh-Hans/learn/ch02/action-values) · [检查点](/zh-Hans/learn/ch02/checkpoint) · [实验](/zh-Hans/labs/bellman-grid)
