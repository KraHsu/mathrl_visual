---
id: ch04-value-iteration
translation_key: ch04-value-iteration
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Value Iteration：一次最优备份"
description: 从同步 Bellman 最优备份推导 Value Iteration，审计中间向量并选择诚实的停止准则。
outline: deep
---

# Value Iteration：一次最优备份

Value Iteration 是把 Bellman 最优方程直接变成规划器的方式。维护一个候选价值向量，对这份冻结向量计算所有动作备份，在每个状态保留最大的备份，然后重复。

<a id="learning-goals"></a>

## 学习目标

完成本节后，你应该能够：

1. 用联合转移模型写出一次同步 Value Iteration 扫描；
2. 从同一批动作备份恢复贪心策略；
3. 解释中间的 $v_k$ 为什么不自动等于某个策略的状态价值；
4. 区分 Bellman 残差、更新量和扫描预算；
5. 识别原地更新或逐结果取最大值其实改变了算法。

<a id="operator"></a>

## 从 $T_*$ 到可执行递推

对冻结向量 $v_k$，计算

$$
q_k(s,a)=B_{v_k}(s,a)
 =\sum_{s',r}p(s',r\mid s,a)
 [r+\gamma v_k(s')].
$$

然后完成两次逻辑读取：

$$
a_k^*(s)\in\arg\max_{a\in A(s)}q_k(s,a),
\qquad
v_{k+1}(s)=\max_{a\in A(s)}q_k(s,a).
$$

第一个式子给出本轮的贪心策略，第二个式子正是

$$
v_{k+1}=T_*v_k
$$

如果多个动作并列，任取一个作为确定性代表都不改变价值向量。但可视化器仍应保留完整的最大动作集合；丢掉并列信息会损害可审计性。

对终止状态 $s_T$，本站使用固定的后续价值 $v(s_T)=0$，且不建立决策行。它不是五个价值为零的动作，而是一个边界条件。

<a id="synchronous"></a>

## 先冻结，再提交

一次扫描必须严格遵循读—算—提交顺序：

1. 复制 $v_k$，把它作为只读输入；
2. 对每个非终止状态和每个请求动作枚举所有随机结果；
3. 求加权和，得到每个 $q_k(s,a)$；
4. 取最大动作备份并记录并列集合；
5. 一次性提交所有状态，形成 $v_{k+1}$。

如果计算状态 1 时直接使用刚更新的状态 0，就得到异步或 Gauss–Seidel 风格的变体。它可能有用，但不是这里定义的同步递推，不应在界面中悄悄称作“一轮扫描”。

随机计算的顺序同样重要。规划器计算的是

$$
\max_a\;\mathbb E_{s',r\mid s,a}[r+\gamma v_k(s')],
$$

而不是

$$
\mathbb E[\max_a(r+\gamma v_k(s'))].
$$

后一个式子允许智能体先看到随机结果再选动作，描述的是不同的信息模式。

<a id="algorithm"></a>

## 紧凑算法

下面的伪代码明确标出冻结输入和报告对象：

```text
输入：模型 p(s', r | s, a)、折扣 γ、初始向量 v0
重复，直到声明的停止条件触发：
    old ← 复制(v)
    对每个非终止状态 s：
        对每个合法动作 a：
            q[s,a] ← Σ p(s',r | s,a) · (r + γ · old[s'])
        greedy[s] ← argmax_a q[s,a]
        next[s] ← max_a q[s,a]
    next[终止状态] ← 0
    residual ← max_s |max_a q[s,a] − old[s]|
    update ← max_s |next[s] − old[s]|
    v ← next
返回 v、greedy、residual、update
```

伪代码中的残差属于 **old** 向量。提交 `next` 后，界面也可以报告当前向量的残差 $\|T_*v-v\|_\infty$。明确数字对应哪一份向量，能避免把轨迹的下标错读一轮。

<a id="intermediate-values"></a>

## 中间向量只是算子迭代点

给每个 $v_k$ 都加上策略下标很诱人，但通常没有依据。除非某个策略 $\pi$ 使得

$$
v_k=T_{\pi}v_k,
$$

否则它就不是该策略的价值。Value Iteration 只保证序列由 $T_*$ 生成，并在第三章假设下趋近 $v_*$。因此 $q_k(s,a)$ 是针对候选向量的动作备份，不一定是某个策略的动作价值 $q_\pi$。

这个区分并非吹毛求疵：它允许规划器提前停止，并用残差界诚实地标记近似结果。

<a id="shared-grid"></a>

## 在共享 Grid World 中手算一轮

对基线 4×4 模型取 $v_0=0$、$\gamma=0.9$、无风，第一次同步扫描应为

$$
v_1=(-0.04,-0.04,-0.04,-0.04,
-0.04,-0.04,-0.04,-0.04,
-0.04,-0.04,-0.04,1,
-0.04,-0.04,1,0)
$$

由于 $v_0$ 的后续价值全为零，此时只能看到即时奖励；第二轮才会把目标奖励向更远处传播。在相同配置下，六轮达到页面默认容差，显示值（四舍五入到六位）为

$$
v_6=(0.426686,0.518540,0.620600,0.734000,
0.518540,0.426686,0.734000,0.860000,
0.620600,0.734000,0.860000,1,
0.734000,0.860000,1,0)
$$

首轮和最终向量是可复核的 golden，而不是普适的“六轮规则”。改变 $\gamma$、风、奖励或容差都会改变所需工作量。

<a id="stopping"></a>

## 停止时不要过度宣称

三种量回答不同问题：

| 量 | 定义 | 可以支持的结论 |
| --- | --- | --- |
| 当前残差 | $\|T_*v_k-v_k\|_\infty$ | 在 $0\leq\gamma<1$ 时，可给出 $\|v_k-v_*\|_\infty\leq\text{residual}/(1-\gamma)$ 的误差证书 |
| 更新量 | $\|v_{k+1}-v_k\|_\infty$ | 本轮改变了多少；单独不能证明已到不动点 |
| 扫描上限 | $k=K_{\max}$ | 工作预算用尽；残差仍超出容差时应称为 truncated |

折扣因子接近 1 时，残差证书因子 $1/(1-\gamma)$ 变宽。因此实验同时显示原始残差和缩放后的界，而不是仅凭“看起来不动”就把结果标成精确。

<a id="complexity"></a>

## 代价与实现检查

若有 $n$ 个状态、每个状态至多 $m$ 个动作、每个状态—动作至多 $d$ 个显式结果，一次同步扫描的算术代价为 $O(nmd)$；若保留动作账本，需要 $O(n+nm)$ 的数值存储。模型可以流式读取，但必须先完成一个动作的全部备份，才能取最大值。

运行前检查：

- 每个结果行的概率非负且和为 1；
- 奖励与所有计算值都是有限数；
- 终止行没有伪造的策略动作；
- 扫描计算期间旧向量没有被修改；
- 并列掩码与显示动作值在文档化容差内一致；
- 风或危险格改变的是结果分布，而不是动作选择发生的时刻。

<a id="lab"></a>

## 在规划实验中观察

打开[规划实验](/zh-Hans/labs/ch04-planning-grid)，选择 **Value Iteration**，先执行一步，再运行到容差。检查状态 $11$ 的动作账本：选中的备份是实际结果的期望。然后开启 20% 风扰动并重复；模型改变后策略可能改变，但“先求期望、后取最大”的规则不变。

<a id="read-next"></a>

## 下一步：先评估策略，再改进它

Value Iteration 每个外层步骤只花一轮最优备份。[Policy Iteration](./policy-iteration) 采取相反的调度：固定策略，解出它的 Bellman 期望方程，再改进策略。两者的差别是调度方式，而不是最优性的定义。
