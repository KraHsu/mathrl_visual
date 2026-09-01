---
id: ch04-summary
translation_key: ch04-summary
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 第四章总结
description: 紧凑比较 Value Iteration、Policy Iteration、Truncated PI 及其共同保证。
outline: deep
---

# 第四章总结

本章算法的主要差异，在于何时把计算花在价值上、何时改变策略。它们共享同一个一步模型和同一个动作备份原语。

<a id="core-equations"></a>

## 需要保留的四个方程

对候选价值 $v$，

$$
B_v(s,a)=\sum_{s',r}p(s',r\mid s,a)[r+\gamma v(s')]
$$

最优算子与固定策略算子是

$$
(T_*v)(s)=\max_a B_v(s,a),
\qquad
(T_\pi v)(s)=\sum_a\pi(a\mid s)B_v(s,a)
$$

它们的不动点回答不同问题：

$$
v_*=T_*v_* \quad\text{以及}\quad v_\pi=T_\pi v_\pi
$$

前者搜索未来决策，后者评估一条指定的决策规则。

<a id="comparison"></a>

## 比较调度

| 算法 | 初始对象 | 内层价值工作 | 何时读取策略 | 中间向量含义 |
| --- | --- | --- | --- | --- |
| Value Iteration | $v_0$ | 每轮一次 $T_*$ 备份 | 每次备份后 | 算子迭代点，不一定是策略价值 |
| Policy Iteration | $\pi_0$ | 把 $T_\pi$ 评估到声明精度 | 每次评估后 | 精确评估时是 $v_{\pi_k}$ |
| Truncated PI | $\pi_0$ 与 $v_0$ | 有限次 $T_\pi$ 备份 | 每个有限块后 | 内层测试通过前只是近似 |

“两个端点”的说法带有条件：深度一只有在初始化匹配时才类似 Value Iteration，无限深度则在压缩假设下类似 Policy Iteration。轨迹必须包含初始化、深度、容差和并列规则。

<a id="guarantees"></a>

## 保证与标签

在有限折扣、模型已知、转移归一化、奖励有界且同步精确计算的条件下：

- $T_*$ 是按 $\gamma$ 压缩的，Value Iteration 趋近唯一的 $v_*$；
- 从精确评估的策略进行贪心改进不会降低其价值；
- 相对于自身精确价值贪心的策略是最优的；
- 有限深度或近似变体必须拥有自己的误差与停止标签。

“converged”“stable”“truncated”不是可以互换的界面装饰：它们分别对应数值残差、外层策略测试和工作上限。例如可以报告“策略稳定，内层残差 $8.2\times10^{-7}$”，或“外层在 20 次改进后截断”。

<a id="audit-checklist"></a>

## 可迁移的审计清单

对任意规划轨迹询问：

1. 是否记录模型版本和折扣因子？
2. 每个请求动作的结果概率是否完整且归一化？
3. 随机结果揭示前是否已经选择动作？
4. 同步扫描期间是否只读旧价值向量？
5. 终止状态是否用边界条件表示，而不是伪造动作？
6. 价值并列时是否保留全部最大动作？
7. 显示的是哪一种残差，属于哪一个向量？
8. 达到工作上限时是否明确标记 truncated？
9. 若模型来自估计，保证是否明确针对估计模型？

这些问题同样适用于表格、图表、Worker 消息和复制的分享链接。

<a id="shared-lab"></a>

## 用一句话概括共享实验

[第四章规划实验](/zh-Hans/labs/ch04-planning-grid)在同一个 4×4 Grid World 上运行三种调度，并公开模型账本、价值、策略掩码、残差历史和工作量。先运行无风基线，再用 20% 风预设观察动力学改变而决策时机不变；第一章的“转移分布/马尔可夫”实验也提供同样的风扰动引导。

<a id="handoff"></a>

## 交接

本章在模型访问结束处收束。第五章以后会用采样回报、带噪目标或学习表示替代精确规划输入。即使不再是表格动态规划循环，也要保留 GPI 的问题意识：究竟在评估什么，又在改进什么？

<a id="read-next"></a>

## 自测

用[问答](./q-and-a)快速检查概念，再在不打开答案块的情况下完成[检查点](./checkpoint)。只有写下预期的计数器与残差后，再回到[规划实验](/zh-Hans/labs/ch04-planning-grid)核对。
