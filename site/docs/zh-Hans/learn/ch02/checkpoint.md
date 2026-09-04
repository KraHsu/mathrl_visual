---
id: ch02-checkpoint
translation_key: ch02-checkpoint
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.9-2.10"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 第二章综合检查点
description: 通过 Bellman 方程、矩阵方程、迭代更新、动作价值和残差检查，评估同一个固定策略。
outline: deep
---

# 第二章综合检查点

这个检查点从头到尾使用同一个小型原创模型。你需要保持策略不变，推导它的 Bellman 方程，用矩阵形式求解同一个评估问题，复算若干次迭代更新，最后把状态价值与动作价值联系起来。

::: info 原创伴读练习
本页的场景、模型、数值、问题与答案均为本站原创伴读内容。它只使用原书涉及的主题范围，不复制原书正文、图、表、问题或代码。
:::

::: warning 策略评估边界
每道题都只评估给定策略 $\pi$。不要替换它的概率，也不要用算出的价值修改它；策略的选择与改变不在这个检查点的范围内。
:::

<a id="scenario"></a>

## 场景：夜间文档队列

一个文档服务有两个非终止状态：

- $Q$：文档正在队列中等待；
- $R$：文档正在审核。

状态 $T$ 是终止状态。折扣因子为 $\gamma=0.5$，并约定 $v_\pi(T)=0$。给定每个动作后，下一状态和奖励都是确定的。固定策略与环境模型如下：

| 当前状态 | 动作 | $\pi(a\mid s)$ | 下一状态 | 奖励 |
| --- | --- | ---: | --- | ---: |
| $Q$ | 暂存 | $0.50$ | $Q$ | $-1$ |
| $Q$ | 转交 | $0.50$ | $R$ | $+1$ |
| $Q$ | 检查 | $0$ | $T$ | $+2$ |
| $R$ | 退回 | $0.25$ | $Q$ | $0$ |
| $R$ | 复核 | $0.25$ | $R$ | $-2$ |
| $R$ | 提交 | $0.50$ | $T$ | $+4$ |

“检查”在 $Q$ 是可用动作，尽管这个特定策略给它的概率为零。下面所有计算都针对这里给出的同一个策略和模型。

<a id="model-audit"></a>

## 1. 审查给定模型

1. 策略概率在两个非终止状态是否都构成合法分布？
2. 一个状态下的动作已知后，还剩下哪种不确定性？
3. 按非终止状态顺序 $(Q,R)$，计算策略诱导的期望即时奖励向量 $\boldsymbol r_\pi$。
4. 当列只包含 $(Q,R)$ 时，计算策略诱导的转移矩阵 $P_\pi$。为什么这个矩阵的一行之和可以小于 1？

::: details 查看参考答案
在 $Q$，概率之和为 $0.50+0.50+0=1$；在 $R$，概率之和为 $0.25+0.25+0.50=1$。每一项都非负，因此两个策略行都合法。

动作一旦确定，表格给出的下一状态与奖励就是确定的。因此，在策略 $\pi$ 下，一步中剩余的不确定性来自策略会抽到哪个动作。

期望即时奖励为

$$
\begin{aligned}
r_\pi(Q)&=0.50(-1)+0.50(1)+0(2)=0,\\
r_\pi(R)&=0.25(0)+0.25(-2)+0.50(4)=1.5.
\end{aligned}
$$

所以

$$
\boldsymbol r_\pi=
\begin{bmatrix}0\\1.5\end{bmatrix},
\qquad
P_\pi=
\begin{bmatrix}
0.50&0.50\\
0.25&0.25
\end{bmatrix}.
$$

第二行之和为 $0.50$，因为省略的另外 $0.50$ 概率从 $R$ 转移到终止状态 $T$。这个约简矩阵只记录非终止状态之间的转移；若完整矩阵包含 $T$，这部分概率就会保留在终止状态对应的列中。
:::

<a id="bellman-equations"></a>

## 2. 写出 Bellman 方程

从

$$
v_\pi(s)=\sum_a\pi(a\mid s)
\left[r(s,a)+\gamma v_\pi(s'(s,a))\right]
$$

出发，分别为 $Q$ 和 $R$ 写出一个标量 Bellman 方程。化简两个方程，但先不要求解。

::: details 查看参考答案
在 $Q$，概率为零的动作不对状态价值的平均产生贡献：

$$
\begin{aligned}
v_\pi(Q)
&=0.50[-1+0.5v_\pi(Q)]
 +0.50[1+0.5v_\pi(R)]
 +0[2+0.5v_\pi(T)]\\
&=0.25v_\pi(Q)+0.25v_\pi(R).
\end{aligned}
$$

在 $R$，

$$
\begin{aligned}
v_\pi(R)
&=0.25[0+0.5v_\pi(Q)]
 +0.25[-2+0.5v_\pi(R)]
 +0.50[4+0.5v_\pi(T)]\\
&=1.5+0.125v_\pi(Q)+0.125v_\pi(R).
\end{aligned}
$$

进入 $T$ 的那次转移所产生的即时奖励仍然保留；只有这次转移之后的延续价值为零。
:::

<a id="matrix-solution"></a>

## 3. 建立并求解矩阵方程

使用按 $(Q,R)$ 排列的价值向量

$$
\boldsymbol v_\pi=
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}
$$

以及练习 1 得到的量。

1. 写出 $\boldsymbol v_\pi=\boldsymbol r_\pi+\gamma P_\pi\boldsymbol v_\pi$。
2. 把它整理为 $(I-\gamma P_\pi)\boldsymbol v_\pi=\boldsymbol r_\pi$。
3. 求出两个状态价值，再代回两个标量方程检查。

::: details 查看参考答案
矩阵方程为

$$
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}
=
\begin{bmatrix}0\\1.5\end{bmatrix}
+0.5
\begin{bmatrix}
0.50&0.50\\
0.25&0.25
\end{bmatrix}
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}.
$$

把延续项移到左边，得到

$$
\begin{bmatrix}
0.75&-0.25\\
-0.125&0.875
\end{bmatrix}
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}
=
\begin{bmatrix}0\\1.5\end{bmatrix}.
$$

第一行给出 $v_\pi(R)=3v_\pi(Q)$。代入第二行可得

$$
\boxed{v_\pi(Q)=0.6,
\qquad
v_\pi(R)=1.8.}
$$

检查两个标量方程：

$$
0.25(0.6)+0.25(1.8)=0.6,
$$

以及

$$
1.5+0.125(0.6)+0.125(1.8)=1.8.
$$

两个方程都能复现这组候选值。
:::

<a id="iterative-evaluation"></a>

## 4. 复算迭代策略评估

初始化

$$
\boldsymbol v^{(0)}=
\begin{bmatrix}0\\0\end{bmatrix},
$$

再进行同步更新

$$
\boldsymbol v^{(k+1)}
=\boldsymbol r_\pi+\gamma P_\pi\boldsymbol v^{(k)}.
$$

计算 $\boldsymbol v^{(1)}$、$\boldsymbol v^{(2)}$ 和 $\boldsymbol v^{(3)}$。同步更新时，两个新分量都必须只使用上一个向量中的数值。

::: details 查看参考答案
前三次更新为

$$
\begin{aligned}
\boldsymbol v^{(1)}
&=\begin{bmatrix}0\\1.5\end{bmatrix},\\[4pt]
\boldsymbol v^{(2)}
&=\begin{bmatrix}0.375\\1.6875\end{bmatrix},\\[4pt]
\boldsymbol v^{(3)}
&=\begin{bmatrix}0.515625\\1.7578125\end{bmatrix}.
\end{aligned}
$$

例如第三次更新是

$$
\begin{aligned}
v^{(3)}(Q)
&=0.25(0.375)+0.25(1.6875)=0.515625,\\
v^{(3)}(R)
&=1.5+0.125(0.375)+0.125(1.6875)=1.7578125.
\end{aligned}
$$

这些向量正在趋近闭式解 $(0.6,1.8)^\mathsf T$。它们是经过指定次数更新后的近似，而不是另一套价值定义。
:::

<a id="action-values"></a>

## 5. 从动作价值还原状态价值

使用练习 3 的精确状态价值，计算 $Q$ 的每个动作价值：

$$
q_\pi(Q,a)=r(Q,a)+0.5v_\pi(s'(Q,a)).
$$

然后验证

$$
v_\pi(Q)=\sum_a\pi(a\mid Q)q_\pi(Q,a).
$$

最后解释为什么 $\pi(\text{检查}\mid Q)=0$ 并不要求 $q_\pi(Q,\text{检查})=0$。

::: details 查看参考答案
三个动作价值为

$$
\begin{aligned}
q_\pi(Q,\text{暂存})
&=-1+0.5(0.6)=-0.7,\\
q_\pi(Q,\text{转交})
&=1+0.5(1.8)=1.9,\\
q_\pi(Q,\text{检查})
&=2+0.5(0)=2.
\end{aligned}
$$

按固定策略求平均可得

$$
0.50(-0.7)+0.50(1.9)+0(2)=0.6=v_\pi(Q).
$$

$q_\pi(Q,\text{检查})$ 的操作性定义是“现在主动采取一次检查，之后继续遵循 $\pi$”，所以即使该动作在策略下不会自然发生，它仍有良好定义且等于 $2$。策略概率为零只表示，在给定策略下，这个动作对 $v_\pi(Q)$ 的加权贡献为零。
:::

<a id="residual-check"></a>

## 6. 用 Bellman 残差审查近似结果

用 $T_\pi$ 表示固定策略的 Bellman 算子：

$$
T_\pi(\boldsymbol v)
=\boldsymbol r_\pi+\gamma P_\pi\boldsymbol v.
$$

对于 $\boldsymbol v^{(2)}=(0.375,1.6875)^\mathsf T$：

1. 计算 $T_\pi(\boldsymbol v^{(2)})-\boldsymbol v^{(2)}$。
2. 给出它的无穷范数。
3. 当 $\gamma=0.5$ 时，使用
   $$
   \|\boldsymbol v-\boldsymbol v_\pi\|_\infty
   \leq
   \frac{\|T_\pi(\boldsymbol v)-\boldsymbol v\|_\infty}{1-\gamma}
   $$
   给出误差上界，再用精确解计算实际无穷范数误差并比较。

::: details 查看参考答案
因为 $T_\pi(\boldsymbol v^{(2)})=\boldsymbol v^{(3)}$，所以

$$
T_\pi(\boldsymbol v^{(2)})-\boldsymbol v^{(2)}
=
\begin{bmatrix}
0.515625-0.375\\
1.7578125-1.6875
\end{bmatrix}
=
\begin{bmatrix}
0.140625\\
0.0703125
\end{bmatrix}.
$$

其无穷范数为 $0.140625$，所以残差给出的上界是

$$
\|\boldsymbol v^{(2)}-\boldsymbol v_\pi\|_\infty
\leq \frac{0.140625}{1-0.5}=0.28125.
$$

实际误差为

$$
\max\{|0.375-0.6|,|1.6875-1.8|\}
=\max\{0.225,0.1125\}
=0.225,
$$

确实小于这个上界。残差可以在不知道精确解时检查近似结果；这里有精确解，因此还能验证这个上界是保守的。
:::

<a id="completion-criteria"></a>

## 完成标准

不展开答案也能完成以下事项时，你就可以离开第二章：

- [ ] 区分策略概率与环境的状态转移、奖励；
- [ ] 从模型表推导两个标量 Bellman 方程；
- [ ] 解释为什么只包含非终止状态的转移矩阵可以出现行和小于 1；
- [ ] 建立并求解 $(I-\gamma P_\pi)\boldsymbol v_\pi=\boldsymbol r_\pi$；
- [ ] 执行同步策略评估更新，而且不混用新旧分量；
- [ ] 通过展开一次状态转移来定义并计算 $q_\pi(s,a)$；
- [ ] 用 $\sum_a\pi(a\mid s)q_\pi(s,a)$ 还原 $v_\pi(s)$；
- [ ] 解释为什么 $\pi(a\mid s)=0$ 不推出 $q_\pi(s,a)=0$；
- [ ] 使用 Bellman 残差审查一个近似价值向量。

<a id="chapter-navigation"></a>

## 第二章学习路径

[第二章总览](./) · [状态价值](./state-values) · [Bellman 方程](./bellman-equation) · [矩阵形式](./matrix-form) · [策略评估](./policy-evaluation) · [动作价值](./action-values) · [章节检查点](./checkpoint) · [Bellman 策略评估实验](/zh-Hans/labs/bellman-grid)
