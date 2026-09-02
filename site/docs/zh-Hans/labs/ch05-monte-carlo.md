---
id: exp-ch05-monte-carlo
translation_key: exp-ch05-monte-carlo
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.1-5.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Monte Carlo 回合实验
description: 使用带种子的回合复现回报估计，比较访问策略，并观察 MC Basic、探索性起点和 epsilon-greedy 控制。
aside: false
outline: deep
---

# Monte Carlo 回合实验

本实验让第五章的模型无关边界可检查。Rust/Wasm 在 Worker 中生成或重放回合；Vue 展示实际轨迹、反向回报账本、访问次数、运行均值、策略概率和重放元数据。学习器的更新不会使用转移概率表。

::: info 原创伴读实验
环境预设、控件、轨迹格式、问题和下方的备用计算均为原创伴读材料。它们引用上游章节主题，但不再分发原书正文、图、表、示例、问题或代码。
:::

::: warning 模型无关边界
环境可以是随机的（包括可选风扰动），但 MC 更新只接收实际状态和奖励。它不能乘上隐藏概率，也不能在看到结果后再取最大动作。
:::

<MonteCarloLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript；但下方仍提供回合格式、回报递推、访问规则、epsilon 公式和手工审计方法。
</noscript>

<a id="experiment-question"></a>

## 实验问题

样本使用方式和动作选择规则如何改变模型无关学习器能够获得的证据？保持环境、折扣因子、回合上限和种子不变，每次只改变一个因素：

1. **MC Basic**、**MC Exploring Starts**、**MC ε-greedy**；
2. initial（初始）、first-visit（首次）和 every-visit（每次）记账；
3. 无风环境与可选的 20% 风扰动预设。

最后一项改变实际回合的分布，但不会把该分布暴露给估计器。

<a id="environment"></a>

## 回合环境与控件

默认环境是前几章共享的有限 4×4 Grid World。状态按行优先编号，状态 0 是起点，状态 15 是终止目标，状态 6 和 9 是危险格。动作是上、右、下、左、等待。环境在每次转移发出即时奖励，并在到达目标或达到显式时间上限时结束；进入危险格会得到危险奖励，但**不会**终止回合。

实验控件都刻意保持显式：

| 控件 | 基线 | 含义 |
| --- | ---: | --- |
| 算法模式 | MC Basic | 回报估计器与策略调度 |
| 访问策略 | initial | 哪些出现会收到回报样本 |
| 折扣 $\gamma$ | 0.9 | 回报权重 |
| $\varepsilon$ | 0.2 | ε-greedy 模式下的策略柔性 |
| 回合数 | 100 | 样本预算 |
| 最大步数 | 40 | 区分自然终止与时间截断 |
| 种子 | `5eed` | 确定性重放键（十六进制） |
| 风扰动 | 关闭 | 可选随机方向结果 |

Worker 和 Rust/Wasm 引擎会执行与 UI 相同的范围校验。无效输入应返回可恢复的消息，而不是静默截断科学参数。

<a id="trace-contract"></a>

## 一条轨迹记录什么

每个回合至少应展示：

| 字段 | 为什么重要 |
| --- | --- |
| 回合索引和种子 | 重放与比较 |
| 起始状态/动作 | 区分普通起点与探索性起点 |
| 步列表 $(s_t,a_t,r_{t+1},s_{t+1})$ | 每次实际转移的证据 |
| terminated/truncated 标记 | 定义回报时间范围 |
| 后缀回报 $G_t$ | 把访问连接到样本 |
| credited 标记 | 核对 initial/first/every 过滤 |
| 计数和运行均值 | 检查估计更新 |
| 策略概率与 ε | 区分利用和探索 |

禁用 JavaScript 时，下面的静态说明仍定义了如何重建这些字段。

<a id="algorithm-modes"></a>

## 三种模式，共享回报原语

| 模式 | 起点协议 | 策略更新 | 典型观察 |
| --- | --- | --- | --- |
| MC Basic | 确定性字典序 75 对扫描 | 每个完整回合后贪心 | 使用 `initial` 时每回合记入一个回报 |
| MC Exploring Starts | 带种子的 75 个合法对排列，显式强制起点对 | 每个完整回合后贪心 | 使用 `first`/`every` 时计数更广 |
| MC ε-greedy | 普通状态起点 | 围绕当前 $Q$ 最大值构造 ε-greedy | 非贪心动作持续被访问 |

策略更新的确切时机属于轨迹的一部分。只有模式名称不足以重放运行。

<a id="return-calculation"></a>

## 回报计算

对于奖励 $R_1,\ldots,R_T$ 的回合，Worker 从末端反向扫描：

$$
G\leftarrow0,
\qquad
G_t=R_{t+1}+\gamma G_{t+1}.
$$

当访问过滤器记入 $(S_t,A_t)$ 时，更新

$$
N(S_t,A_t)\leftarrow N(S_t,A_t)+1,
\qquad
Q(S_t,A_t)\leftarrow Q(S_t,A_t)+
\frac{G_t-Q(S_t,A_t)}{N(S_t,A_t)}.
$$

实现也可以保存回报和，但显示的均值必须与同一计数和记入回报一致。未访问对没有估计值，不能当作观察到的零。

<a id="epsilon-policy"></a>

## ε-greedy 策略检查

若状态有 $m$ 个合法动作且选择了一个贪心代表，实验使用

$$
\pi_\varepsilon(a\mid s)=
\begin{cases}
1-\varepsilon+\varepsilon/m, & a=a^*(s),\\[4pt]
\varepsilon/m, & a\ne a^*(s).
\end{cases}
$$

抽象的四动作示例在 $\varepsilon=0.2$ 时的概率行是 $0.85,0.05,0.05,0.05$。默认 Grid World 有五个动作（包括**等待**），因此唯一贪心时对应的概率行是 $0.84,0.04,0.04,0.04,0.04$。验证适用的概率和为一，并确认动作是在环境产生风或滑动结果**之前**采样的。

<a id="wind-protocol"></a>

## 风扰动协议

先运行无风基线并保存种子，再开启**20% 风扰动**。环境的方向结果概率成为采样过程的一部分；MC 学习器仍只看到实际转移。比较回报方差和访问覆盖，不要只看最终箭头图。

入门的[转移/马尔可夫实验](/zh-Hans/labs/ch01-gridworld)在用户理解确定性基线后，会单独引导开启风扰动。本实验假定这一步已经完成，并把风控件写入重放元数据。

<a id="audit-panel"></a>

## 审计面板问题

使用实时审计面板，然后回答：

1. 每个记入访问是否恰好有一个后缀回报？
2. first-visit 是否抑制同一回合中同键的后续出现？
3. every-visit 是否包含重复键，即使后缀不同？
4. `terminated` 与 `truncated` 是否不同？
5. 每个访问状态的 ε-greedy 行是否和为一？
6. 只改变种子时，有限估计是否可以改变而配置不变？
7. MC 更新内部是否使用了隐藏转移概率？

预期答案依次是“是、是、是、是、是、是、否”。失败项是有用的诊断，不是隐藏轨迹的理由。

<a id="comparison-table"></a>

## 比较工作表

每行重置并记录同一组字段：

| 运行 | 模式 | 访问 | ε | 风 | 回合数 | 已覆盖对 | 平均回报 | 截断回合 |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| A | MC Basic | initial | 0 | 关 |  |  |  |  |
| B | Exploring Starts | first | 0 | 关 |  |  |  |  |
| C | Exploring Starts | every | 0 | 关 |  |  |  |  |
| D | ε-greedy | every | 0.2 | 关 |  |  |  |  |
| E | ε-greedy | every | 0.2 | 开 |  |  |  |  |

不要只按平均回报给运行排序。覆盖、方差和策略生成规则都属于结果。

<a id="manual-check"></a>

## 无 JavaScript 手工检查

使用检查点中的小型轨迹：

```text
(X, go), 0, (Y, back), −0.2, (X, go), 0, (Y, finish), +1, terminal
```

取 $\gamma=0.5$ 时，反向回报为 $1$、$0.5$、$0.05$ 和 $0.025$。采用 every-visit，$(X,\mathrm{go})$ 的最终均值是 $(0.5+0.025)/2=0.2625$；$(X,\mathrm{quit})$ 仍未访问。抽象四动作 $\varepsilon=0.2$ 时手算 $(.85,.05,.05,.05)$；默认五动作 Grid World 则核对 $(.84,.04,.04,.04,.04)$。这些检查不需要动画或网络请求。

<a id="reproducibility"></a>

## 可复现说明

运行由算法模式、访问策略、折扣因子、ε 调度、起点协议、风设置、回合/步数上限、种子和引擎版本共同标识。导出回合轨迹比只导出最终热力图更有力。如果重放不同，应比较第一个不同的随机抽样或转移，而不是不断四舍五入最终均值直到一致。

<a id="read-next"></a>

## 继续

在改变实验控件时，回到 [MC Basic](../learn/ch05/mc-basic)、[Exploring Starts](../learn/ch05/exploring-starts) 和 [epsilon-greedy](../learn/ch05/epsilon-greedy)，每次只改变一个因素。最后完成[章节检查点](../learn/ch05/checkpoint)。
