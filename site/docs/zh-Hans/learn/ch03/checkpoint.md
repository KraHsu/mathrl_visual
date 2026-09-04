---
id: ch03-checkpoint
translation_key: ch03-checkpoint
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.6-3.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 第三章检查点
description: 在原创队列模型中完成策略改进、Bellman 最优方程、压缩检查、残差审计和贪心策略恢复。
outline: deep
---

# 第三章检查点

这组练习沿用一个完整的项目原创模型，从第二章的固定策略价值出发，一直走到第三章的最优价值、策略与误差证据。先独立计算，再展开答案。

::: info 原创伴读练习
本页的场景、模型、数值、问题和答案都是项目原创内容，仅覆盖原书对应章节的数学主题，不复制原书示例、图表、证明或问答。
:::

<a id="scenario"></a>

## 场景：夜间文档队列

非终止状态为等待队列 $Q$ 与审核中 $R$，$T$ 为终止状态，$v(T)=0$，折扣因子 $\gamma=0.5$。动作后的下一状态和奖励都是确定的：

| 状态 | 动作 | 下一状态 | 奖励 |
| --- | --- | --- | ---: |
| $Q$ | `hold` | $Q$ | $-1$ |
| $Q$ | `forward` | $R$ | $+1$ |
| $Q$ | `inspect` | $T$ | $+2$ |
| $R$ | `return` | $Q$ | $0$ |
| $R$ | `recheck` | $R$ | $-2$ |
| $R$ | `submit` | $T$ | $+4$ |

第二章给定的策略为

$$
\pi(\cdot\mid Q)=(0.5,0.5,0),
\qquad
\pi(\cdot\mid R)=(0.25,0.25,0.5),
$$

并已求得

$$
v_\pi(Q)=0.6,
\qquad
v_\pi(R)=1.8.
$$

<a id="policy-improvement"></a>

## 1. 从 $q_\pi$ 提出一次策略改进

1. 计算两个状态的全部 $q_\pi(s,a)$。
2. 写出一个对 $q_\pi$ 贪心的确定性策略 $\pi_1$。
3. 直接求出 $v_{\pi_1}$。
4. 判断 $\pi_1$ 是否已经最优，并用一次新的动作价值比较说明理由。

::: details 展开答案
在 $Q$：

$$
q_\pi(Q,\cdot)=
\left(-1+0.5(0.6),\ 1+0.5(1.8),\ 2\right)
=(-0.7,1.9,2).
$$

在 $R$：

$$
q_\pi(R,\cdot)=
\left(0.5(0.6),\ -2+0.5(1.8),\ 4\right)
=(0.3,-1.1,4).
$$

所以 $\pi_1$ 在 $Q$ 选择 `inspect`，在 $R$ 选择 `submit`。两个动作都直接终止，故

$$
v_{\pi_1}=(2,4).
$$

它比原策略好，但还不是最优。在 $v_{\pi_1}$ 下，

$$
q_{\pi_1}(Q,\text{forward})=1+0.5(4)=3
>q_{\pi_1}(Q,\text{inspect})=2.
$$

一次相对于旧策略的贪心改进不保证已经到达全局最优。
:::

<a id="optimality-equations"></a>

## 2. 写出并求解 Bellman 最优方程

1. 为 $Q,R$ 写出标量 Bellman 最优方程。
2. 提出一个候选解并逐动作核对。
3. 列出最优动作集合。

::: details 展开答案
方程为

$$
v(Q)=\max\{-1+0.5v(Q),\ 1+0.5v(R),\ 2\},
$$

$$
v(R)=\max\{0.5v(Q),\ -2+0.5v(R),\ 4\}.
$$

候选解 $(v(Q),v(R))=(3,4)$。代回后：

$$
Q:\quad\max\{0.5,3,2\}=3,
$$

$$
R:\quad\max\{1.5,0,4\}=4.
$$

所以候选确实是不动点；压缩性保证它是唯一的 $v_*=(3,4)$。最大动作集合为

$$
\mathcal A_*(Q)=\{\text{forward}\},
\qquad
\mathcal A_*(R)=\{\text{submit}\}.
$$
:::

<a id="sweeps"></a>

## 3. 从零向量应用最优算子

令 $v^{(0)}=(0,0)$，同步计算 $v^{(1)}=T_*v^{(0)}$、$v^{(2)}=T_*v^{(1)}$ 和每个向量的 Bellman 残差

$$
\delta(v)=\|T_*v-v\|_\infty.
$$

::: details 展开答案
第一轮只比较即时奖励：

$$
v^{(1)}=(2,4).
$$

第二轮为

$$
v^{(2)}=(3,4).
$$

再次备份不再变化。残差依次是

$$
\delta(v^{(0)})=4,
\qquad
\delta(v^{(1)})=1,
\qquad
\delta(v^{(2)})=0.
$$

这里恰好两轮到达不动点是模型结构造成的，不是一般有限折扣 MDP 的固定轮数保证。
:::

<a id="contraction"></a>

## 4. 用两条轨迹检查压缩上界

取

$$
u^{(0)}=(0,0),
\qquad
w^{(0)}=(10,10).
$$

计算两次 $T_*$，并在每轮记录

$$
d_k=\|u^{(k)}-w^{(k)}\|_\infty.
$$

验证 $d_{k+1}\leq0.5d_k$。

::: details 展开答案
第一轮：

$$
u^{(1)}=(2,4),
\qquad
w^{(1)}=(6,5).
$$

所以 $d_0=10$，$d_1=4\leq5$。第二轮：

$$
u^{(2)}=(3,4),
\qquad
w^{(2)}=(3.5,4),
$$

所以 $d_2=0.5\leq2$。两轮的实际比率分别为 $0.4$ 与 $0.125$，都小于理论上界 $\gamma=0.5$；压缩因子不是必须达到的等式。
:::

<a id="residual"></a>

## 5. 用残差审计一个近似值

给定候选向量 $\tilde v=(2.8,4)$：

1. 计算 $T_*\tilde v$ 与残差；
2. 用残差给出 $\|\tilde v-v_*\|_\infty$ 的上界；
3. 与已经知道的实际误差比较。

::: details 展开答案

$$
T_*\tilde v=(3,4),
$$

因为 $Q$ 的三个备份为 $(0.4,3,2)$，$R$ 的三个备份为 $(1.4,0,4)$。因此

$$
\delta(\tilde v)=0.2.
$$

理论上界为

$$
\|\tilde v-v_*\|_\infty
\leq\frac{0.2}{1-0.5}=0.4.
$$

实际误差为 $\max\{|2.8-3|,|4-4|\}=0.2$。残差界是可靠但可能保守的上界，不能把残差直接标成真实误差。
:::

<a id="ties"></a>

## 6. 制造并正确处理并列动作

只把 `inspect` 的奖励从 $2$ 改为 $3$，其他内容不变。

1. $v_*$ 是否改变？
2. $Q$ 有哪些最大动作？
3. 写出一个随机最优策略。

::: details 展开答案
在 $v_*=(3,4)$ 下，$Q$ 的备份变为 $(0.5,3,3)$，所以价值不变，`forward` 与 `inspect` 并列。比如

$$
\pi(\text{forward}\mid Q)=0.25,
\qquad
\pi(\text{inspect}\mid Q)=0.75
$$

并在 $R$ 确定选择 `submit`，就是一个随机最优策略。任何给 `hold` 正概率的策略都不再对 $v_*$ 贪心。
:::

<a id="factors"></a>

## 7. 折扣与奖励平移的边界

分别分析以下改动，不把不同因素混在一起：

1. 当 $R$ 可最优选择奖励为 $4$ 的 `submit` 时，`inspect` 的奖励 $2$ 与 `forward` 在什么 $\gamma$ 下并列？
2. 把全部奖励乘 $10$ 会怎样改变价值与最大动作？
3. 继续型无限折扣约定下，每个奖励都加 $\beta$ 会怎样改变价值？
4. 夜间队列采用可变长度终止约定时，同一奖励平移是否一定保持策略？
5. 若 `forward` 有概率把文档带惩罚地送回 $Q$，动作比较应怎样修改？

::: details 展开答案
`forward` 的价值为 $1+4\gamma$，与 `inspect` 的 $2$ 并列时 $\gamma=0.25$。正比例乘 $10$ 会把所有价值乘 $10$ 并保持最大动作。

继续型无限折扣约定下，统一平移给每个策略价值增加 $\beta/(1-\gamma)$。夜间队列是可变长度的终止任务，常数出现次数依策略与终止时间而变，因此这里不保证策略不变。若转移变随机，必须先把 `forward` 的全部联合结果按概率加权，再与即时检查比较。
:::

<a id="integrated-check"></a>

## 8. 综合判断

判断下列说法并说明理由：

1. $v_*$ 唯一，所以 $\pi_*$ 也唯一。
2. 有风时，应对每个实际滑移动作分别取最大结果。
3. 残差低于容差说明按指定数值标准收敛，但不等于误差为零。
4. 达到扫描上限就可以显示“已收敛”。
5. $\gamma=1$ 时仍可直接引用本章的压缩证明。

::: details 展开答案
全部依次为：错、错、对、错、错。动作并列会产生多个最优策略；风结果必须先在一个请求动作内求期望；残差只给出误差上界；扫描上限对应截断；$\gamma=1$ 不能提供严格小于一的压缩因子。
:::

<a id="chapter-links"></a>

## 把推导带入实验

打开 [Bellman 最优性实验](/zh-Hans/labs/bellman-optimality-grid)，在共享 16 状态 Grid World 中核对每个动作备份、并列箭头、残差与参数变化。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
