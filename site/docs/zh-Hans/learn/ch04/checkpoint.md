---
id: ch04-checkpoint
translation_key: ch04-checkpoint
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 第四章检查点
description: 在原创有限 MDP 上比较三种迭代，再把同样的审计问题迁移到共享 Grid World。
outline: deep
---

# 第四章检查点

本检查点先用一个每个数字都能手算的原创小模型，再把同样的问题迁移到 4×4 规划实验。做题时始终保留模型、初始化、并列规则和停止测试。

::: info 原创伴读练习
本页的场景、模型、数字、问题和解释均为原创伴读内容，只参照本章主题范围，不复制上游正文、证明、图、表、示例、问答或代码。
:::

::: warning 模型边界
下面三种计算都直接得到完整的确定性模型。它们是规划过程，不证明智能体从经验中学会了转移。
:::

<a id="scenario"></a>

## 场景与模型

有两个非终止状态 $X$、$Y$，以及终止状态 $T$。折扣因子为 $\gamma=0.5$。下表每行显示的结果概率均为 1。

| 状态 | 动作 | 下一状态 | 奖励 |
| --- | --- | --- | ---: |
| $X$ | wait（等待） | $X$ | $0$ |
| $X$ | route（转送） | $Y$ | $+1$ |
| $X$ | exit（退出） | $T$ | $+0.5$ |
| $Y$ | back（返回） | $X$ | $0$ |
| $Y$ | wait（等待） | $Y$ | $0$ |
| $Y$ | finish（完成） | $T$ | $+2$ |

初始策略 $\pi_0$ 在两个状态都选择 **wait**。为便于复现，状态顺序取 $(X,Y,T)$，初始向量为 $v_0=(0,0,0)$。

<a id="audit"></a>

## 1. 审计一步模型

1. 哪些行是决策行，哪一行是终止边界条件？
2. 写出六个状态—动作对的 $B_v(s,a)$。
3. 为什么在 $X$ 比较动作前必须完成三个完整备份？

::: details 查看答案
$X$、$Y$ 是决策状态；$T$ 没有动作行，后续价值固定为零。由于结果确定，

$$
\begin{array}{lll}
B_v(X,\mathrm{wait})=0+0.5v(X), &
B_v(X,\mathrm{route})=1+0.5v(Y), &
B_v(X,\mathrm{exit})=0.5,\\
B_v(Y,\mathrm{back})=0+0.5v(X), &
B_v(Y,\mathrm{wait})=0+0.5v(Y), &
B_v(Y,\mathrm{finish})=2.
\end{array}
$$

最大值必须位于动作备份之外。若换成随机模型，每个备份仍要先对结果概率求和；看到结果后再选动作会额外泄露信息。
:::

<a id="value-iteration"></a>

## 2. 做两轮 Value Iteration

从 $v_0=(0,0)$ 开始，计算 $v_1=T_*v_0$ 与 $v_2=T_*v_1$，并记录每个状态的贪心动作集合。

::: details 查看答案
在 $v_0$ 处，按表中动作顺序有

$$
q_0(X)=(0,1,0.5),
\qquad q_0(Y)=(0,0,2)
$$

因此

$$
v_1=(1,2),
\qquad
\operatorname{greedy}_1(X)=\{\mathrm{route}\},
\quad
\operatorname{greedy}_1(Y)=\{\mathrm{finish}\}
$$

针对 $v_1$，

$$
q_1(X)=(0.5,2,0.5),
\qquad
q_1(Y)=(0.5,1,2)
$$

所以 $v_2=(2,2)$，贪心动作不变；再扫描一轮仍为 $(2,2)$。第一向量是算子迭代点，第二向量恰好是本模型的最优不动点。
:::

<a id="policy-iteration"></a>

## 3. 从 $\pi_0$ 做 Policy Iteration

1. 精确评估初始的 wait/wait 策略；
2. 用评估值改进策略；
3. 评估改进后的策略并检查稳定性。

::: details 查看答案
对于 $\pi_0$，

$$
v_{\pi_0}(X)=0.5v_{\pi_0}(X),
\qquad
v_{\pi_0}(Y)=0.5v_{\pi_0}(Y)
$$

因此 $v_{\pi_0}=(0,0)$。第一次贪心改进在 $X$ 选 route、在 $Y$ 选 finish。评估新策略得到

$$
v_{\pi_1}(Y)=2,
\qquad
v_{\pi_1}(X)=1+0.5v_{\pi_1}(Y)=2
$$

在 $(2,2)$ 下，route 仍是 $X$ 的唯一最佳动作，finish 仍是 $Y$ 的唯一最佳动作。策略稳定，因此最优。Policy Iteration 的评估求解直接暴露精确值，而 Value Iteration 先暴露 $(1,2)$。
:::

<a id="truncated"></a>

## 4. 插入有限内层深度

从 $\pi_0$ 和 $v_0=(0,0)$ 开始，运行沿用价值向量的 $J=1$ Truncated PI。

1. 对 $\pi_0$ 的第一次内层评估返回什么？
2. 第一次改进后是什么策略？
3. 改进策略的价值达到 $(2,2)$ 前需要多少次内层扫描？
4. 为什么这条轨迹不等同于前面的两轮 Value Iteration？

::: details 查看答案
wait/wait 把 $(0,0)$ 映射到 $(0,0)$，所以第一次有限评估不变，随后策略改为 route/finish。下一外层轮的一次扫描把 $(0,0)$ 映射到 $(1,2)$，再下一次映射到 $(2,2)$。因此策略改变后需要两次内层扫描才能得到精确值。

Value Iteration 在同一轮中选择贪心策略并更新价值；这条截断轨迹则先评估旧策略、再改进。只有初始化和时序匹配时，深度一才会与 Value Iteration 重合。
:::

<a id="comparison"></a>

## 5. 比较工作量记账

根据计算填写：

| 过程 | 达到稳定的外层轮数 | 固定策略扫描数 | 第一个非零价值向量 | 最终价值 |
| --- | ---: | ---: | --- | --- |
| Value Iteration |  |  |  |  |
| Policy Iteration |  |  |  |  |
| Truncated PI，$J=1$ |  |  |  |  |

::: details 一种记账方式
从 $v_0$ 计 Value Iteration 扫描，首个非零向量是 $(1,2)$，第二个是 $(2,2)$。Policy Iteration 有一次 $\pi_0$ 评估和一次 $\pi_1$ 评估；后者若用线性系统求解就是精确的。$J=1$ 的 Truncated PI 先有一次零向量评估，策略改变后再做两次单轮评估，价值才到 $(2,2)$。若“外层轮数”的定义不同，计数也会不同，所以轨迹必须写出计数约定。
:::

<a id="shared-grid"></a>

## 6. 把审计迁移到共享 Grid World

打开[规划实验](/zh-Hans/labs/ch04-planning-grid)，选择无风基线，不要只依赖颜色检查：

1. Value Iteration 首轮是否包含 16 状态向量

   $$
   (-0.04,-0.04,-0.04,-0.04,-0.04,-0.04,-0.04,-0.04,
   -0.04,-0.04,-0.04,1,-0.04,-0.04,1,0)
   $$

2. 状态 15 是否作为无策略行的终止边界保持不变？
3. 动作并列时，表格是否保留全部最大动作？
4. 开启 20% 风预设后，什么发生了改变？

入门的[转移分布/马尔可夫实验](/zh-Hans/labs/ch01-gridworld)提供单独引导：先检查无风转移分布，再按提示开启风。在两个实验中，风都先改变结果概率，规划器或观察者随后才解释这些结果。

::: details 查看答案
基线首轮就是上面的向量，因为从 $v_0=0$ 出发时只能看到即时奖励。状态 15 是终止状态，后续价值保持零。并列集合由完整动作账本决定，而非箭头颜色。开启风会改变受影响请求动作的结果行（20% 滑移时，名义方向概率为 $0.85$，三个替代方向各为 $0.05$）；最大值仍在每行求期望后才取得。
:::

<a id="reflection"></a>

## 7. 反思问题

每题用一两句话回答：

- 你的表格中哪个数字是 Bellman 残差，哪个只是更新量？
- 如果模型概率来自数据估计，哪一条结论必须削弱？
- 什么证据能区分内层截断与外层截断？
- 为什么不同的并列打破策略可以有相同最终价值？

<a id="read-next"></a>

## 继续审计

对照[总结](./summary)和[问答](./q-and-a)，再回到[规划实验](/zh-Hans/labs/ch04-planning-grid)，每次只改变一个因素并复现运行。保留第一章的风扰动引导，让用户先理解随机转移，再比较算法调度。
