---
id: ch03-factors
translation_key: ch03-factors
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_sections: "3.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 什么会改变最优策略
description: 分析折扣、奖励和转移模型的影响，并限定奖励仿射不变性在终止任务中的适用范围。
outline: deep
---

# 什么会改变最优策略

最优策略不是环境地图上固定不变的箭头。它是奖励目标、时间偏好与转移规律共同定义出的解；改变其中任一项，都可能改变动作价值的排序。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 从 Bellman 最优方程定位影响策略的三类输入；
2. 用一个阈值例子解释 $\gamma$ 如何改变延迟奖励的吸引力；
3. 陈述继续型折扣 MDP 中的正仿射奖励不变性；
4. 给出奖励平移在可变长度终止任务中失败的反例；
5. 说明风扰动如何通过转移模型改变最优动作。

<a id="three-inputs"></a>

## 三类决定因素

观察

$$
(T_*v)(s)
=\max_a\sum_{s',r}p(s',r\mid s,a)
[r+\gamma v(s')].
$$

最优价值与最大动作由以下内容共同决定：

- **奖励：**什么结果被鼓励或惩罚；
- **折扣 $\gamma$：**较晚结果保留多少权重；
- **环境模型：**动作通向哪些联合结果及其概率。

策略本身不是第四个外部输入，而是对这三类输入求最优后得到的输出。

<a id="discount-example"></a>

## 原创例子：立即奖励还是延迟奖励

在状态 $x$ 有两个确定性动作：

- `early` 立即终止并得到奖励 $2$；
- `delayed` 当前奖励为 $0$ 并到达 $y$，下一步获得奖励 $3$ 后终止。

因此

$$
q(x,\text{early})=2,
\qquad
q(x,\text{delayed})=3\gamma.
$$

当 $\gamma<2/3$ 时立即奖励更好；$\gamma=2/3$ 时并列；$\gamma>2/3$ 时延迟奖励更好。转移图没有变化，改变的只是较晚奖励的当前权重。

$\gamma$ 变小不是让智能体“更害怕”某个动作，而是系统性降低较晚奖励在当前决策中的权重。$\gamma=0$ 时只比较期望即时奖励。

<a id="reward-effects"></a>

## 奖励改变排序与目标

提高目标奖励、加大危险惩罚或改变普通移动代价，都可能使动作价值曲线交叉。在共享 Grid World 中，危险奖励较轻时，较短但经过危险附近的路径可能占优；加重危险惩罚后，较长的安全路线可能成为最大动作。

奖励不是用于“告诉算法正确箭头”的标签。它定义优化目标。为得到想要的行为而改奖励，等于修改问题本身，因此应同时检查意外循环、终止时机和不同起点的价值。

<a id="affine-invariance"></a>

## 继续型折扣 MDP 的正仿射不变性

考虑每一步都持续产生奖励的折扣 MDP，包括所有状态的后续转移。若对每个一步奖励应用

$$
r'=\alpha r+\beta,
\qquad \alpha>0,
$$

且转移模型与 $\gamma$ 不变，则每条无限折扣回报都满足

$$
G'=\alpha G+\frac{\beta}{1-\gamma}.
$$

相应地，

$$
v_*'=\alpha v_*+\frac{\beta}{1-\gamma}\mathbf 1,
$$

所有动作的排序保持不变。这里需要每个策略的完整转移矩阵满足 $P_\pi\mathbf1=\mathbf1$，也就是每一步的常数平移都会一直出现。

例如单状态继续型任务中，动作 `work` 每步奖励 $1$，`idle` 每步奖励 $0$，$\gamma=0.5$。原最优价值为 $2$。变换 $r'=2r+3$ 后，最优价值为

$$
2(2)+\frac{3}{1-0.5}=10,
$$

`work` 仍优于 `idle`。

<a id="episodic-caveat"></a>

## 终止任务中的奖励平移反例

在可变回合长度的终止任务中，回合结束后不再产生奖励。常数 $\beta$ 出现的次数取决于终止时间，因此平移项不再对所有策略相同。

一个原创双路线反例可以直接显示差异。设 `short` 经过一次零奖励转移后终止，`long` 经过两次零奖励转移后终止。原来两者回报都是零。现在对每次实际产生的奖励都加 $+1$：

$$
G'(\text{short})=1,
\qquad
G'(\text{long})=1+\gamma>1
\quad(\gamma>0).
$$

原来并列的路线现在偏向较长路线。所以“奖励加常数不改变策略”不能无条件应用于本站默认的 `GoalMode::Terminate`。正比例缩放 $r'=\alpha r$、$\alpha>0$ 仍会把每条有限回报乘同一正数，因而保持排序。

<a id="dynamics"></a>

## 转移模型与风扰动

风扰动不改变请求动作集合，却改变 $p(s',r\mid s,a)$。无风时请求向右可能只有一个确定结果；风概率为 $w$ 时，请求方向概率为

$$
1-\frac{3w}{4},
$$

其余三个方向各为 $w/4$。因此 $w=0.2$ 时分别为 $0.85$ 和 $0.05$。同一请求动作的 $q_v$ 必须平均全部实际结果。靠近边界或危险格时，即使目标与奖励不变，风险概率也可能改变最大动作。

比较风前后的策略时，应同时公开：

- 每个请求动作的完整结果概率；
- 每个结果的奖励与后继价值；
- 概率加权贡献；
- 全部并列最大动作。

只看最终箭头无法判断变化来自奖励、价值传播还是随机转移。

<a id="detours"></a>

## 折扣与“无意义绕行”的条件

若所有中间奖励为零、最终有正奖励且 $0<\gamma<1$，把同一正奖励延后会乘上更多 $\gamma$，因此更短到达通常有更高回报。但这不是无条件定理：

- $\gamma=1$ 时纯延迟不会降低同一最终奖励；
- 途中有正负奖励时，路线排序取决于全部回报；
- 随机终止会改变到达概率与时间分布；
- 给终止型任务增加每步惩罚会改变目标，而非只做无害平移。

因此应从实际 Bellman 备份审计路线，而不是用“折扣总会避免绕行”替代计算。

<a id="self-check"></a>

## 自测

1. 为什么把全部奖励乘 $3$ 会保持动作排序？
2. 为什么在 `GoalMode::Terminate` 下加 $+1$ 可能不保持排序？
3. 当风概率 $w=0.4$ 时，请求方向与其余三个方向的概率分别是多少？

::: details 核对答案
正比例缩放会把每个定义良好的回报乘同一个正数。在可变长度终止回合中，加法平移会按路线相关的步数累积。$w=0.4$ 时，请求方向概率为 $1-3(0.4)/4=0.70$，其余三个方向各为 $0.10$。
:::

<a id="chapter-links"></a>

## 继续学习第三章

使用[章节检查点](./checkpoint)把定义、方程、压缩性、贪心恢复和参数边界串起来。

第三章草稿页面：[导览](/zh-Hans/learn/ch03/) · [策略改进](/zh-Hans/learn/ch03/policy-improvement) · [最优价值](/zh-Hans/learn/ch03/optimal-values) · [最优方程](/zh-Hans/learn/ch03/optimality-equation) · [压缩映射](/zh-Hans/learn/ch03/contraction) · [贪心策略](/zh-Hans/learn/ch03/greedy-policies) · [影响因素](/zh-Hans/learn/ch03/factors) · [检查点](/zh-Hans/learn/ch03/checkpoint) · [实验](/zh-Hans/labs/bellman-optimality-grid)
