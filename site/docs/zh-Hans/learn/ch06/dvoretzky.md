---
id: ch06-dvoretzky
translation_key: ch06-dvoretzky
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Dvoretzky 型收敛：用误差过程观察"
description: 阅读收敛论证背后的标量随机递推，理解有限索引扩展如何预示表格型强化学习证明。
outline: deep
---

# Dvoretzky 型收敛：用误差过程观察

如果把误差动力学单独拿出来，Robbins–Monro 定理就更容易复用。令 $\Delta_k$ 表示当前迭代量到目标的距离，一个宽泛的标量模板是

$$
\Delta_{k+1}=(1-\alpha_k)\Delta_k+\beta_k\eta_k.
$$

第一项收缩旧误差，第二项注入噪声。Dvoretzky 型结果给出条件，说明长期来看收缩能够胜过噪声。

::: info 原创伴读说明
下面的分解、证明提纲和有限索引解释都是原创解释材料。它们引用上游收敛主题，但不复制原书定理证明或充满记号的页面。
:::

<a id="learning-goals"></a>

## 学习目标

完成本单元后，你应该能够：

1. 在随机递推中识别漂移项与噪声项；
2. 说明条件均值和方差界的作用；
3. 解释为什么收缩和需要发散而噪声能量和需要有限；
4. 跟随平方误差的证明思路；
5. 理解有限个相互作用坐标为何需要基于范数的更强陈述。

<a id="scalar-template"></a>

## 从标量模板开始

假设 $\alpha_k,\beta_k\geq0$，令 $\mathcal H_k$ 表示抽取 $\eta_k$ 之前的历史信息。一组有代表性的假设是：

$$
\sum_k\alpha_k=\infty,
\qquad
\sum_k\alpha_k^2<\infty,
\qquad
\sum_k\beta_k^2<\infty,
$$

并且

$$
\mathbb E[\eta_k\mid\mathcal H_k]=0,
\qquad
\mathbb E[\eta_k^2\mid\mathcal H_k]\leq C.
$$

在合适的可测性和有界性细节下，这些条件会推出 $\Delta_k\to0$ 几乎必然成立。这个定理是一个模板，而不是只检查轨迹中某一行的许可：如果系数是随机的，级数条件本身也是随机陈述。

<a id="drift-noise"></a>

## 分开漂移与噪声

当噪声条件均值为零时，条件于历史信息的一步期望变化是

$$
\mathbb E[\Delta_{k+1}-\Delta_k\mid\mathcal H_k]
=-\alpha_k\Delta_k.
$$

所以漂移指向零。注入项的条件方差与 $\beta_k^2$ 成正比；要求平方和有限，就限制了累计噪声能量。

这一区分在调试时很有用：

| 观察到的现象 | 可能的问题 |
| --- | --- |
| 平均增量始终偏离零 | 噪声有偏或目标错误 |
| 增量从不变小 | 步长或残差没有衰减 |
| 估计偶尔爆炸 | 方差/曲率界不成立或符号错误 |
| 估计停在一个带状区域 | 常数步长或不消失的噪声系数 |

<a id="squared-error"></a>

## 为什么要把误差平方

令 $H_k=\Delta_k^2$。展开一次更新会得到三类项：

$$
H_{k+1}-H_k
=-\alpha_k(2-\alpha_k)\Delta_k^2
  +\beta_k^2\eta_k^2
  +2(1-\alpha_k)\beta_k\Delta_k\eta_k.
$$

对 $\mathcal H_k$ 取条件期望后，如果噪声条件均值为零，交叉项消失。只要收缩系数处于稳定范围，第一项非正；第二项由方差界和 $\sum\beta_k^2<\infty$ 控制。随后可以用超鞅或拟鞅收敛论证说明 $H_k$ 有限并收敛，而发散的 $\sum\alpha_k$ 迫使极限为零。

这是一种证明模式，不是有限样本误差条。浏览器可以显示展开式中的各项，却不能从几百次迭代建立一个无限实验的几乎必然事件。

<a id="rm-application"></a>

## 把透镜应用到 Robbins–Monro

对根 $g(w^*)=0$，令 $\Delta_k=w_k-w^*$。中值展开给出

$$
g(w_k)-g(w^*)=g'(\xi_k)\Delta_k
$$

其中 $\xi_k$ 位于两点之间。因此 RM 更新具有形式

$$
\Delta_{k+1}
=\bigl(1-a_kg'(\xi_k)\bigr)\Delta_k-a_k\eta_k.
$$

有效的收缩系数依赖当前迭代量，所以允许随机 $\alpha_k$ 的结果比只处理固定序列的证明更有用。对斜率的上下界则把这个移动系数转化为可控漂移。

<a id="finite-index"></a>

## 从一个坐标到多个坐标

表格型强化学习在每个状态或状态—动作对上都有一个误差。对有限索引集 $\mathcal S$，可以使用如下示意扩展：

$$
\Delta_{k+1}(s)=\bigl(1-\alpha_k(s)\bigr)\Delta_k(s)+\beta_k(s)\eta_k(s).
$$

条件必须对每个 $s$ 成立，而不只是当前误差最大的坐标。如下的最大范数陈述

$$
\|\mathbb E[\eta_k\mid\mathcal H_k]\|_\infty
\leq\gamma\|\Delta_k\|_\infty,
\qquad 0<\gamma<1,
$$

允许少量依赖状态的偏差，只要它被当前全局误差控制。方差界可以随 $\|\Delta_k\|_\infty$ 增长，但必须以受控方式增长。这正是之后分析多个相互作用价值估计时会用到的形状。

<a id="lab-interpretation"></a>

## 负责任地解读实验

[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)可以绘制 $\Delta_k$、有符号残差以及 $\sum a_k$、$\sum a_k^2$ 的有限前缀。用这些图提问：

1. 平均而言漂移是否指向目标？
2. 多个种子下扰动是否居中？
3. 选定调度后增量是否变小？
4. 哪个定理假设没有被有限 UI 表示？

最后一个问题最重要：有限图表不能证明几乎必然收敛，被裁剪或重置的运行也可能已经不再遵循声明的递推。

<a id="check-yourself"></a>

## 自测

若 $\Delta_k=2$、$\alpha_k=0.1$、$\beta_k=0.05$、$\eta_k=-4$，则

$$
\Delta_{k+1}=0.9(2)+0.05(-4)=1.6.
$$

确定性收缩贡献 $-0.2$，噪声贡献也是 $-0.2$。把全部变化都标成“噪声”会掩盖更新的一半。

<a id="read-next"></a>

## 继续阅读

现在在[随机梯度下降](./stochastic-gradient-descent)中把梯度重新解释为带噪根观测。同一个漂移/噪声分解会解释：离最优点很远时 SGD 往往移动很快，接近最优点时却更明显地游走。
