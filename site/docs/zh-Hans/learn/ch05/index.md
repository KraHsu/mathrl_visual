---
id: ch05-overview
translation_key: ch05-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.1-5.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第五章：Monte Carlo 方法"
description: 从回合经验中的回报估计价值，比较 MC Basic、探索性起点与 epsilon-greedy 控制方法。
outline: deep
---

# 第五章：Monte Carlo 方法

第四章在完整的转移模型上做规划。第五章移除了这个便利条件：智能体只能获得实际发生的回合经验，并从这些回报估计价值。这是全书第一次转向模型无关的路径：环境仍然可以是随机的，但学习器不需要一张转移概率表，就能更新动作价值。

::: info 内容边界
本站是非官方原创伴读。页面只沿用上游章节的主题顺序，不复制原书正文、证明、图、表、示例、问答或代码。主题定位基于[固定上游版本](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%205%20Monte%20Carlo%20Methods.pdf)，PDF 的 SHA-256 已记录在本页元数据中。
:::

<a id="scope"></a>

## 模型消失后改变了什么

已知模型时，规划器可以枚举每个后继状态并计算期望。模型无关的 Monte Carlo（MC）方法则从一个回合中得到这个期望的一次带噪样本。若状态—动作对在时刻 $t$ 被访问，其折扣回报为

$$
G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\cdots .
$$

学习器对观察到的多个 $G_t$ 求平均。一次回报不是真实价值；在采样满足相应假设时，大数定律解释了为什么平均值会逐渐变得有用。

本章按一条阶梯展开：

```text
独立同分布样本的均值
  └─ 一个状态—动作对的回报样本
       └─ MC Basic：只评估回合起始状态—动作对
            └─ MC Exploring Starts：复用访问并立即改进
                 └─ MC ε-Greedy：让策略柔性化，移除探索性起点
                      └─ 探索 ↔ 利用成为显式权衡
```

箭头表示增加了样本复用，或改变了策略约束；它们不会把回合样本变成转移模型。

<a id="learning-goals"></a>

## 学习目标

完成本章后，你应该能够：

1. 区分基于模型的期望与样本均值；
2. 沿回合反向计算折扣回报；
3. 解释 MC Basic 如何用回报替代基于模型的策略评估；
4. 比较初始访问、首次访问和每次访问的记账方式；
5. 说明探索性起点保证了什么，以及它为何难以满足；
6. 构造 $\varepsilon$-greedy 分布并正确采样；
7. 解释 $\varepsilon$ 为什么改善覆盖、却会降低最佳策略的价值；
8. 分离统计误差、策略改进和回合预算；
9. 在不把采样经验冒充精确模型的前提下审计可复现的 MC 轨迹。

<a id="algorithm-map"></a>

## 算法地图

| 单元 | 要回答的主要问题 | 样本使用 | 策略要求 |
| --- | --- | --- | --- |
| [均值估计](./mean-estimation) | 如何用样本估计期望？ | 每次观测一个样本 | 无 |
| [MC Basic](./mc-basic) | 如何用回报替代模型做策略迭代？ | 只用初始状态—动作对 | 有意重复起始对 |
| [MC Exploring Starts](./exploring-starts) | 如何让一个回合更新多个状态—动作对？ | 首次或每次访问 | 每个状态—动作对都可作为起点 |
| [MC $\varepsilon$-greedy](./epsilon-greedy) | 如何取消固定的探索性起点？ | 通常每次访问 | 策略具有柔性，探索所有动作 |
| [探索与利用](./exploration-exploitation) | $\varepsilon$ 带来了什么代价？ | 覆盖与集中之间权衡 | 调节或调度 $\varepsilon$ |

[Monte Carlo 实验](/zh-Hans/labs/ch05-monte-carlo) 会在一个固定的回合式网格上运行三种具体调度，显示采样回合、回报账本、访问次数、策略概率和随机种子元数据；这样无需暴露隐藏模型计算，也能复现估计结果。

<a id="notation"></a>

## 记号与假设

除非单元另有说明，$S_t$ 与 $A_t$ 表示时刻 $t$ 的状态和动作，$R_{t+1}$ 是该转移产生的奖励，回合在时刻 $T$ 终止。访问状态—动作对的回报为

$$
G_t=\sum_{k=0}^{T-t-1}\gamma^kR_{t+k+1},
\qquad 0\leq\gamma\leq1.
$$

对固定策略，动作价值估计可以写成样本平均：

$$
\widehat q_n(s,a)=\frac{1}{N_n(s,a)}
\sum_{i=1}^{N_n(s,a)}G_i(s,a),
$$

其中分母统计的是所选访问策略纳入的回报数。若某个状态—动作对从未被访问，其估计应当是“没有数据”，而不是凭空设为零；界面应让覆盖缺口可见。

最强的收敛陈述要求回合回报具有有限期望、相关状态—动作对得到充分覆盖，并且策略/数据生成过程与估计器相匹配。一次有限的浏览器运行可以报告估计值和面向误差的诊断，但不能把小样本误差提升为定理。

<a id="known-model-boundary"></a>

## 保持模型边界可见

第一章的 Grid World 仍可用来生成回合，包括可选的风扰动。在本章中，风是环境采样规则的一部分；MC 更新只读取实际产生的后继状态和奖励，不读取概率表。因此开启风会改变回报样本的方差与覆盖，而学习器的更新仍然是样本平均。

比较页面时，可以记住下面的区别：

| 问题 | 已知模型规划（第四章） | MC 学习器（第五章） |
| --- | --- | --- |
| 从环境读取什么？ | 每个概率与奖励行 | 一次一个实际回合 |
| 如何形成备份？ | 对结果求精确期望 | 观察到的折扣回报 |
| 主要诊断 | Bellman 残差 | 访问次数、回报均值与采样误差 |
| 随机种子控制什么？ | 通常没有随机过程 | 起点、动作及随机环境结果 |

<a id="reading-path"></a>

## 建议阅读路径

先读[均值估计](./mean-estimation)，再完成 [MC Basic](./mc-basic)，然后查看更高效的[探索性起点](./exploring-starts)更新。接着推导 [epsilon-greedy](./epsilon-greedy) 概率，并用[探索与利用](./exploration-exploitation)解释实验中的曲线。最后阅读[总结](./summary)、[问答](./q-and-a)和[检查点](./checkpoint)。

第五章页面：[导览](/zh-Hans/learn/ch05/) · [均值估计](/zh-Hans/learn/ch05/mean-estimation) · [MC Basic](/zh-Hans/learn/ch05/mc-basic) · [探索性起点](/zh-Hans/learn/ch05/exploring-starts) · [MC $\varepsilon$-greedy](/zh-Hans/learn/ch05/epsilon-greedy) · [探索/利用](/zh-Hans/learn/ch05/exploration-exploitation) · [总结](/zh-Hans/learn/ch05/summary) · [问答](/zh-Hans/learn/ch05/q-and-a) · [检查点](/zh-Hans/learn/ch05/checkpoint) · [实验](/zh-Hans/labs/ch05-monte-carlo)
