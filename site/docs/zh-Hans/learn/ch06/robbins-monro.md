---
id: ch06-robbins-monro
translation_key: ch06-robbins-monro
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Robbins–Monro：用带噪观测寻找根"
description: 刻画黑盒求根问题，跟踪 Robbins–Monro 更新，并把步长假设变成可检查的量。
outline: deep
---

# Robbins–Monro：用带噪观测寻找根

假设有一个被实验包裹起来的有用函数。你选择输入 $w$，得到一次带噪测量，并希望找到底层响应为零的输入。Robbins–Monro（RM）把这种黑盒交互变成增量更新。

::: info 原创伴读说明
下面的残差例子、轨迹和诊断项都是原创。它们介绍上游 RM 主题，但不复制原文、定理排版、图或数值示例。
:::

<a id="learning-goals"></a>

## 学习目标

完成本单元后，你应该能够：

1. 区分未知的平均响应与观测噪声；
2. 写出并解释 RM 递推；
3. 说明残差符号为什么会把估计推向根；
4. 检查递减步长序列的两个经典级数条件；
5. 识别均值估计是 RM 的一个特例。

<a id="black-box"></a>

## 黑盒求根问题

设 $g:\mathbb R\to\mathbb R$ 是未知响应，目标解 $w^*$ 满足

$$
g(w^*)=0.
$$

在查询 $w_k$ 时，实验返回

$$
\widetilde g(w_k,\eta_k)=g(w_k)+\eta_k,
$$

其中 $\eta_k$ 是测量噪声。学习器看到 $w_k$ 和 $\widetilde g_k$，不必知道 $g$ 或其导数的闭式表达式。可以把它想成一个传感器：目标一侧读数为正，另一侧读数为负。

<a id="update"></a>

## Robbins–Monro 更新

递推式为

$$
w_{k+1}=w_k-a_k\widetilde g(w_k,\eta_k),
\qquad a_k>0.
$$

这里的步是修正，而不是替换。早期较大的残差会带来较大移动；较小的步长则避免一次带噪读数在后期占据主导。更新只需要输入、观测到的残差和一个调度。

<a id="sign"></a>

## 先看符号，再看曲线

取简单响应 $g(w)=w-10$，从 $w_1=20$ 开始，使用 $a_k=0.5$，并令噪声为零。残差为正，因此减法会向左移动：

| $k$ | $w_k$ | $g(w_k)$ | $w_{k+1}$ |
| ---: | ---: | ---: | ---: |
| 1 | 20.000 | 10.000 | 15.000 |
| 2 | 15.000 | 5.000 | 12.500 |
| 3 | 12.500 | 2.500 | 11.250 |
| 4 | 11.250 | 1.250 | 10.625 |

如果 $w_k<10$，残差为负，同一个减法会向右移动。加入噪声后，单步符号可能判断错误；希望是无偏扰动在步长缩小时相互抵消。

<a id="step-conditions"></a>

## 为什么会出现两个步长级数

经典 RM 条件是

$$
\sum_{k=1}^{\infty}a_k=\infty,
\qquad
\sum_{k=1}^{\infty}a_k^2<\infty.
$$

它们表达了两个相反要求：

- 第一个级数必须发散，初值很远时才有足够的总移动量；
- 平方和必须收敛，有限方差噪声的总影响才会受到控制。

调和选择 $a_k=1/k$ 同时满足二者。常数步长保持了快速适应性，却不满足平方和条件，因此通常只会在噪声邻域内稳定。衰减过快的调度则可能还没到达根就冻结。实验会报告有限前缀的级数和；这些是诊断，不是无限级数证明。

<a id="convergence-lens"></a>

## 收敛陈述需要什么

一个标准的标量定理还会加入如下假设：

1. $g$ 在解附近单调，其斜率有上界且远离零；
2. 上述两个步长级数条件成立；
3. 条件噪声均值为零，二阶矩有界。

在这些条件下，无限 RM 序列可以以概率一收敛到根。“几乎必然”不表示每条有限轨迹都单调，也不保证偏置噪声、多重根、或被意外截断的步长仍满足结论。

<a id="mean-special-case"></a>

## 均值估计是 RM 的实例

要估计 $\mathbb E[X]$，定义

$$
g(w)=w-\mathbb E[X],
\qquad
\widetilde g(w,x)=w-x.
$$

RM 更新变成

$$
w_{k+1}=w_k-a_k(w_k-x_{k+1})
       =w_k+a_k(x_{k+1}-w_k),
$$

这正是一般的在线均值更新。未知期望只出现在不可见的函数中；样本提供了带噪残差。

<a id="lab-audit"></a>

## 把实验当作假设审计

在[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)中，先比较零噪声的线性根，再加入对称噪声，最后换成常数步长。每次运行记录：

| 字段 | 要问的问题 |
| --- | --- |
| 残差 | 符号是否指向目标？ |
| 步长 | 实际使用的 $a_k$ 是否等于配置？ |
| 噪声 | 观测前缀中的扰动是否居中？ |
| $\sum a_k$、$\sum a_k^2$ | 哪个长期条件正在被近似？ |
| 停止标记 | 是由容差、预算还是溢出终止？ |

改变随机种子应该改变带噪路径，而不应改变声明的更新规则。

<a id="check-yourself"></a>

## 自测

若观测残差为 $-4$ 且 $a_k=0.1$，更新增量是 $-a_k(-4)=+0.4$。如果求根器移动到 $w_k-0.4$，就把符号反了。若你的残差采用另一种定义，请记录这个约定，而不要默默改变公式。

<a id="read-next"></a>

## 继续阅读

[Dvoretzky 收敛](./dvoretzky)提供一个可复用的误差过程论证，解释衰减修正为何能够克服噪声。第一次阅读可以跳过证明；条件和误差分解才是后续强化学习算法需要的部分。
