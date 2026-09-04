---
id: ch04-policy-iteration
translation_key: ch04-policy-iteration
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Policy Iteration：先评估，再改进"
description: 分离固定策略评估与贪心改进，说明单调进展并定义稳定停止条件。
outline: deep
---

# Policy Iteration：先评估，再改进

Policy Iteration 改变的是 Value Iteration 的调度方式：它不在每次最优备份后立即前进，而是先承诺一个策略，把该策略评估出来，再询问“针对这些价值，是否有更好的动作”。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 写出固定策略的 Bellman 方程及其线性系统形式；
2. 区分精确策略评估与有限轮迭代近似；
3. 陈述策略改进不等式及其假设；
4. 解释为什么稳定的贪心策略满足最优方程；
5. 在近似评估下处理并列动作而不虚报收敛。

<a id="fixed-policy"></a>

## 固定策略

对动作备份先按策略求平均，再进行任何最大化：

$$
(T_\pi v)(s)=\sum_a\pi(a\mid s)
\sum_{s',r}p(s',r\mid s,a)[r+\gamma v(s')].
$$

它的状态价值是不动点

$$
v_\pi=T_\pi v_\pi
$$

若用策略诱导的期望奖励向量 $r_\pi$ 与转移矩阵 $P_\pi$ 表示，则有

$$
v_\pi=r_\pi+\gamma P_\pi v_\pi,
\qquad
(I-\gamma P_\pi)v_\pi=r_\pi
$$

线性系统是方便的描述，不要求浏览器真的求矩阵逆。直接求解、迭代扫描或稀疏方法都可以，只要公开容差和数值状态。

<a id="evaluation"></a>

## 评估子问题

“评估”有三种常见含义：

| 模式 | 计算 | 返回向量的状态 |
| --- | --- | --- |
| 直接 | 求解 $(I-\gamma P_\pi)u=r_\pi$ | 受线性求解误差影响的精确不动点近似 |
| 迭代 | $u_{j+1}=T_\pi u_j$，直到残差阈值 | 在声明压缩假设和容差时是有证书的近似 |
| 有限深度 | 恰好扫描 $j_{\mathrm{eval}}$ 轮 | 受工作预算限制的估计，不自动等于 $v_\pi$ |

外层算法可以采用直接或迭代评估，第三行自然属于 Truncated Policy Iteration。轨迹应同时保存外层下标 $k$（正在评估哪个策略）和内层下标 $j$（已经做了几轮评估）；把二者揉成一条计数会使调度无法审计。

<a id="improvement"></a>

## 用完整动作比较来改进

得到 $v_{\pi_k}$ 后，计算

$$
q_{\pi_k}(s,a)=B_{v_{\pi_k}}(s,a)
$$

新策略的支持集应包含在最大动作集合中：

$$
\mathcal A_k^+(s)=\arg\max_{a\in A(s)}q_{\pi_k}(s,a),
\qquad
\pi_{k+1}(a\mid s)>0\Rightarrow a\in\mathcal A_k^+(s)
$$

通常实现为每个状态选择一个确定性动作；实验仍会显示全部并列动作。终止状态没有策略行。

为什么这会有帮助？贪心选择满足

$$
(T_{\pi_{k+1}}v_{\pi_k})(s)
\geq(T_{\pi_k}v_{\pi_k})(s)=v_{\pi_k}(s)
$$

对所有状态成立。两个 $T_\pi$ 都是单调且按 $\gamma$ 压缩的算子。反复应用 $T_{\pi_{k+1}}$，得到逐状态不下降：

$$
v_{\pi_{k+1}}\geq v_{\pi_k}
$$

某处的一步严格优势可以在能够到达该处的状态上产生严格提升，但不保证所有状态都严格增加。

<a id="convergence"></a>

## 为什么稳定策略就是最优的

假设精确评估得到 $v_\pi$，且没有动作备份超过当前策略价值：

$$
\max_a B_{v_\pi}(s,a)=v_\pi(s)
\quad\text{对每个非终止 }s
$$

于是 $T_*v_\pi=v_\pi$。第三章的不动点唯一性说明这个向量就是 $v_*$。因此 Policy Iteration 不必枚举所有策略，只需找到一个相对于自身价值贪心的策略。

确定性策略配合确定性并列规则时，每个非终止状态的选择数是有限的。每次严格改进都会改变至少一个选择且不会降低价值，所以外层循环在有限次变化后停止。若并列动作每次随意选择，两个价值相同的策略可能来回切换。实现应保留并列集合、固定规范化规则，或在贪心**集合**不变时停止。

<a id="implementation"></a>

## 外层循环伪代码

```text
输入：已知模型、初始策略 π0
对 k = 0, 1, …：
    评估 πk：
        求解 vπk = Tπk vπk（直接求解或达到声明的内层容差）
    对每个非终止状态 s：
        对所有合法动作计算 qπk(s,a)
        greedy[s] ← argmax_a qπk(s,a)
    若 greedy 策略/集合与 πk 不变：
        返回 πk、vπk、stable
    πk+1 ← 支持在 greedy[s] 上的确定性或随机策略
若达到预算：返回最后诊断并标记 truncated
```

外层停止测试与内层评估测试必须分开报告。内层达到扫描上限不等于策略被精确评估；内层残差很小也不等于策略已经最优。

<a id="shared-grid"></a>

## 在共享 Grid World 中阅读调度

规划实验从零向量的贪心集合中选出一个可见的确定性代表（每个状态采用文档化动作编码中最小者），不会悄悄伪造终止动作。Policy Iteration 会先评估这份初始策略，完成后才比较移动动作。后续轮次中，靠近目标的状态通常会先得到明确的贪心选择，但这是特定模型的现象，不是所有空间图都必须满足的定理。

请先观察无风运行，再开启 20% 风扰动。策略评估与贪心比较接收的是同一份变化后的结果账本。风不是决策之后新增的动作，Policy Iteration 也不能为每个滑移结果重新选择动作。

<a id="stopping"></a>

## 三种诚实的停止状态

界面区分：

- **stable：** 策略的贪心集合未改变，且内层评估通过容差；
- **inner-truncated：** 内层预算耗尽，策略改进使用了近似价值；
- **outer-truncated：** 外层改进次数达到上限，尚未稳定。

如果近似评估使两个动作接近并列，应同时报告并列容差并保留歧义。不能只凭四舍五入后的表格宣告策略稳定。

<a id="pitfalls"></a>

## 常见调度错误

1. **把一次 $T_*$ 扫描叫作 Policy Iteration。** 若没有独立固定并评估策略，那是 Value Iteration。
2. **计算另一状态时使用 $v_{k+1}$。** 这会悄悄改变声明的同步评估方法。
3. **看到随机结果后再取最大。** 动作必须在模型揭示结果前选择。
4. **把并列打破当成数学事实。** 一个确定性代表是实现选择，最大集合才是数学对象。
5. **把策略稳定与数值精度混为一谈。** 内层残差和外层贪心检查都不可省略。

<a id="lab"></a>

## 在规划实验中观察

在[规划实验](/zh-Hans/labs/ch04-planning-grid)中选择 **Policy Iteration** 并打开轨迹表。每个外层行会显示策略、内层评估轮数、评估价值向量、每个状态的最佳动作以及策略是否改变。用同一初始条件运行 Value Iteration；两者的最终最优值应在容差内一致，但中间调度不同。

<a id="read-next"></a>

## 下一步：有意截断内层求解

当模型较大时，精确评估可能昂贵。[Truncated Policy Iteration](./truncated-policy-iteration) 保留外层的策略改进思想，但限制内层扫描次数，把 Value Iteration 与 Policy Iteration 放在同一条连续轴上。
