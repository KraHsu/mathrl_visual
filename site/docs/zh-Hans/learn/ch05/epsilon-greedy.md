---
id: ch05-epsilon-greedy
translation_key: ch05-epsilon-greedy
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "MC ε-greedy：让策略变柔性"
description: 推导 epsilon-greedy 动作概率，移除强制起点，并准确表述固定 epsilon 下的最优性。
outline: deep
---

# MC ε-greedy：让策略变柔性

探索性起点通过控制回合从哪里开始来解决覆盖问题。另一种更柔性的办法，是控制策略在每个访问状态上怎么行动。MC ε-greedy 用一个分布替代确定性的贪心选择：仍然偏向当前估计最好的动作，同时给每个合法动作非零概率。

::: info 原创伴读说明
下面的概率表、采样器和并列讨论均为原创。它们沿用上游 ε-greedy 主题，但不复制原书正文、公式排版、图、伪代码或示例。
:::

<a id="learning-goals"></a>

## 学习目标

完成本单元后，你应该能够：

1. 定义柔性策略和 ε-greedy 策略；
2. 在“均匀探索可能再次选中贪心动作”的约定下推导概率；
3. 正确采样动作，避免给贪心动作分配错误概率；
4. 解释 ε 如何移除探索性起点要求；
5. 准确说明 ε 固定为正时“最优”所指的范围。

<a id="soft-policy"></a>

## 柔性策略提供覆盖

如果在每个非终止状态的每个合法动作上都有正概率，策略就是**柔性的**：

$$
\pi(a\mid s)>0\quad\text{for all }a\in A(s).
$$

柔性策略让足够长的回合有机会访问许多状态—动作对，即使起点来自单一的普通分布。它不保证覆盖很快：很小的概率仍可能需要很长运行。它移除了瞬移到每个对的需要，却没有移除收集数据的需要。

<a id="formula"></a>

## 推导 ε-greedy 分布

令 $a^*(s)$ 是 $Q(s,\cdot)$ 最大动作中的一个代表，$m=|A(s)|$，且 $\varepsilon\in[0,1]$。使用以下采样器：

1. 以 $1-\varepsilon$ 的概率采取 $a^*(s)$；
2. 以 $\varepsilon$ 的概率在全部 $m$ 个合法动作中均匀抽样（可能再次抽到贪心动作）。

得到的概率为

$$
\pi_\varepsilon(a\mid s)=
\begin{cases}
1-\varepsilon+\dfrac{\varepsilon}{m}, & a=a^*(s),\\[6pt]
\dfrac{\varepsilon}{m}, & a\ne a^*(s).
\end{cases}
$$

换一种写法，贪心动作的概率为 $1-\frac{m-1}{m}\varepsilon$，其余 $m-1$ 个动作各为 $\varepsilon/m$；总和为一。有些库把探索定义为“只在非贪心动作中均匀选择”，那是不同的约定，因此应在轨迹中记录约定。

<a id="four-action-example"></a>

## 四动作示例

设 $A(s)=\{\mathrm{up},\mathrm{right},\mathrm{down},\mathrm{left}\}$，且 $Q(s,\mathrm{right})$ 唯一最大，$\varepsilon=0.2$。在上述约定下：

| 动作 | 概率 |
| --- | ---: |
| right（贪心） | $1-0.2+0.2/4=0.85$ |
| up | $0.05$ |
| down | $0.05$ |
| left | $0.05$ |

当 $\varepsilon=0$ 时策略是贪心的；当 $\varepsilon=1$ 时策略均匀。$0<\varepsilon\le1$ 时每个动作都可被发现。不要把这个策略概率与环境的风概率混淆：前者是智能体的选择，后者是动作选定后环境产生的结果。

<a id="sampling"></a>

## 避免概率采样错误

一种实现先采样 $u\in[0,1)$，再使用累积区间：

```text
u < 1 − ε + ε/m       → 选择贪心代表
否则                  → 按动作顺序选择剩余区间
```

只有在把剩余区间切成 $m-1$ 个宽度为 $\varepsilon/m$ 的片段时，这个简写才安全。更字面的两阶段采样器（贪心分支、均匀探索分支）通常更易审计，也更容易明确处理并列。

若存在多个贪心动作，可以为利用分支选择确定性代表，同时在元数据保留完整并列集合。也可以把利用质量分摊给所有并列最大动作；这是有效变体，却会改变声明的策略概率。轨迹应写明并列规则。

<a id="policy-improvement"></a>

## 改变策略改进步骤

MC Basic 和 MC Exploring Starts 可以做贪心改进：

$$
\pi_{k+1}(s)\in\arg\max_{\pi(\cdot\mid s)}
\sum_a\pi(a\mid s)Q_k(s,a).
$$

ε-greedy 变体把选择限制在给定探索率的策略族 $\Pi_\varepsilon$ 中：

$$
\pi_{k+1}(\cdot\mid s)\in\arg\max_{\pi\in\Pi_\varepsilon}
\sum_a\pi(a\mid s)Q_k(s,a).
$$

在上述采样约定下，选择最大代表就得到前面推导的分布。当估计与覆盖充分时，策略是在 $\Pi_\varepsilon$ **内部**最优；它不一定是所有 $\Pi$ 中最优的，因为强制探索有代价。

<a id="algorithm"></a>

## MC ε-greedy 循环

```text
为每个合法 (s, a) 初始化 Q 和 count
初始化柔性策略 π_ε 及可复现的随机生成器
对每个回合：
  从普通起点分布抽取状态（不要求强制状态—动作起点）
  按 π_ε 生成完整或明确标记为截断的回合
  反向扫描回合，更新所选访问的回报均值
  对每个更新过的状态：
    从 argmax_a Q(state, a) 选 a*
    围绕 a* 安装 ε-greedy 概率
```

改进后策略仍然柔性，因此当前看起来较差的动作以后仍可能被采样。如果随时间改变 $\varepsilon$，应记录调度以及每回合使用的值；最终策略为 $\varepsilon=0.1$，不等于从头到尾固定 $\varepsilon=0.1$ 的估计器。

<a id="claims-and-caveats"></a>

## 结论与限定

在样本足够且覆盖合适时，MC ε-greedy 可以接近固定 $\varepsilon$ 策略族中的最佳策略。需要注意三点：

- 有限计数会留下统计误差；
- 固定正 ε 有意牺牲一部分利用；
- 让 ε 逐渐趋近零可以改善最终策略，却会改变数据分布和收敛论证。

因此“运行收敛”应说明策略族、回合预算、随机种子、访问策略，以及 ε 是固定还是调度的。

<a id="lab-connection"></a>

## 在实验中观察

在 [Monte Carlo 实验](/zh-Hans/labs/ch05-monte-carlo) 中选择 **MC ε-greedy**，设 $\varepsilon=0.2$，查看某个状态的概率行。当一个动作唯一贪心时，四动作行应为 $0.85,0.05,0.05,0.05$。将 $\varepsilon$ 改为 $0$ 和 $1$ 检查端点，再在起点协议允许时，用同一种子与强制起点模式比较覆盖计数。

<a id="check-yourself"></a>

## 自测

有五个合法动作，其中两个并列为贪心动作。实现选择并列中第一个作为利用代表，探索阶段均匀抽样，并设 $\varepsilon=0.5$。

选中的代表概率为 $0.5+0.5/5=0.6$；其他每个动作概率为 $0.1$。在这个并列规则下，第二个并列动作不会自动得到 $0.6$。若要让两个并列动作共享利用质量，应声明另一种并列策略并重新计算概率行。

<a id="read-next"></a>

## 继续

阅读[探索与利用](./exploration-exploitation)，理解正 ε 的代价。然后用[检查点](./checkpoint)测试从样本均值到策略概率的完整模型无关链条。
