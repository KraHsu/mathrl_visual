---
id: ch06-overview
translation_key: ch06-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.1-6.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第六章：随机逼近"
description: 从均值估计出发，理解 Robbins–Monro、Dvoretzky 型收敛与随机梯度下降的增量视角。
outline: deep
---

# 第六章：随机逼近

第五章要等一个完整回合结束后才更新价值估计。下一章的模型无关方法会在数据到达时就更新。本章就是两者之间的桥梁：它把随机逼近作为一种可复用的更新模式来研究，而不是再引入一个新的强化学习算法。

::: info 内容边界
本站是非官方原创伴读。页面只沿用固定上游章节的主题顺序，不复制原书正文、证明、图、表、示例、问答或代码。主题定位基于[固定上游 PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%206%20Stochastic%20Approximation.pdf)；源文件 blob 与 PDF 摘要记录在本页元数据中。
:::

<a id="why-this-chapter"></a>

## 为什么本章位于 MC 与 TD 之间

Monte Carlo 估计要等待回报，再形成类似批处理的平均值。时间差分学习会在每次转移后改变估计，甚至不必等回合结束。它们共享一种形状：当前迭代量，加上步长乘以带噪修正：

$$
w_{k+1}=w_k-a_k\,\widehat g_k.
$$

这个修正量可以是残差、梯度或求根观测。随机逼近要回答的是：当我们无法直接得到某个期望时，重复的小修正何时仍能逼近该期望所定义的解。

可以把本章的作用画成一座桥：

```text
完整回报样本（第五章）
          │  把保存整个平均值改成在线修正
          ▼
均值估计 ──► Robbins–Monro 求根 ──► 收敛工具
          │
          └──────────────► SGD / 小批量更新
                                      │
                                      ▼
                         增量式 TD 方法（第七章）
```

这是数学上的桥梁，并不意味着任意随机更新都会自动收敛。

<a id="learning-goals"></a>

## 学习目标

完成本章后，你应该能够：

1. 把样本均值改写成增量递推；
2. 解释两个步长条件 $\sum_k a_k=\infty$ 与 $\sum_k a_k^2<\infty$；
3. 刻画带噪黑盒求根问题并写出 Robbins–Monro 更新；
4. 读懂 Dvoretzky 型标量及有限索引收敛条件；
5. 区分真实梯度与随机梯度；
6. 比较批量、随机和小批量梯度下降；
7. 审计有限运行，而不把经验曲线当成几乎必然收敛的证明。

<a id="roadmap"></a>

## 章节路线图

| 单元 | 主要问题 | 运行对象 | 应观察的证据 |
| --- | --- | --- | --- |
| [均值估计](./mean-estimation) | 如何把批量平均改成在线更新？ | $w_k$ | 样本、估计、步长 |
| [Robbins–Monro](./robbins-monro) | 带噪黑盒如何暴露一个根？ | $g(w_k)+\eta_k$ | 残差符号与噪声 |
| [Dvoretzky 收敛](./dvoretzky) | 为什么衰减的带噪修正可以收敛？ | 误差 $\Delta_k$ | 漂移、方差、步长和 |
| [随机梯度下降](./stochastic-gradient-descent) | 优化怎样变成求根问题？ | 参数 $w_k$ | 真实/随机梯度 |
| [批量与小批量](./mini-batch) | 批大小如何交换方差与工作量？ | 平均梯度 | 批大小与更新次数 |

[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)允许你改变更新族、步长调度、观测噪声与批大小，同时保持随机种子和目标可见。

<a id="notation"></a>

## 记号与假设

用 $k=1,2,\ldots$ 表示更新索引，$w_k$ 表示当前的标量或向量估计，$a_k>0$ 表示步长。带噪观测记为

$$
\widetilde g(w_k,\eta_k)=g(w_k)+\eta_k,
$$

其中 $\eta_k$ 是扰动，不必服从高斯分布。条件均值和方差相对于历史信息 $\mathcal H_k$ 定义，即在抽取下一次观测前已经掌握的信息。当定理说“几乎必然”收敛时，它指无限实验中概率为一的事件；有限浏览器轨迹只能显示与假设相符的诊断。

<a id="assumption-lens"></a>

## 假设透镜

每个实验都应明确正在检验哪些假设：

| 假设 | 直觉 | 实验中可改变的量 |
| --- | --- | --- |
| 正且递减的步长 | 更新最终会稳定 | 调和步长与常数步长 |
| 步长和发散 | 即使初值很远也能继续前进 | 比较运行中的 $\sum a_k$ |
| 平方步长和有限 | 噪声总影响有限 | 比较 $\sum a_k^2$ |
| 条件无偏噪声 | 不再有系统性推力 | 平移噪声均值 |
| 曲率/方差有界 | 修正不会爆炸 | 改变目标或噪声尺度 |
| 合适的独立样本 | 随机梯度代表目标 | 随机种子与采样方式 |

旋钮变化本身不是定理证明；它帮助你找到定理假设不再描述运行的边界。

<a id="reading-path"></a>

## 建议阅读路径

先读[均值估计](./mean-estimation)，再推导 [Robbins–Monro](./robbins-monro) 中的黑盒更新。想了解证明模式时选择性阅读 [Dvoretzky 收敛](./dvoretzky)，随后在[随机梯度下降](./stochastic-gradient-descent)中建立优化联系。用[批量与小批量](./mini-batch)理解计算权衡，最后完成[总结](./summary)、[问答](./q-and-a)和[检查点](./checkpoint)。

第六章页面：[导览](/zh-Hans/learn/ch06/) · [均值估计](/zh-Hans/learn/ch06/mean-estimation) · [Robbins–Monro](/zh-Hans/learn/ch06/robbins-monro) · [Dvoretzky 收敛](/zh-Hans/learn/ch06/dvoretzky) · [随机梯度下降](/zh-Hans/learn/ch06/stochastic-gradient-descent) · [批量与小批量](/zh-Hans/learn/ch06/mini-batch) · [总结](/zh-Hans/learn/ch06/summary) · [问答](/zh-Hans/learn/ch06/q-and-a) · [检查点](/zh-Hans/learn/ch06/checkpoint) · [实验](/zh-Hans/labs/ch06-stochastic-approximation)
