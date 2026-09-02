---
id: ch06-summary
translation_key: ch06-summary
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "第六章总结"
description: 将均值估计、Robbins–Monro、Dvoretzky 型收敛与随机梯度下降放进一张可审计的图中。
outline: deep
---

# 第六章总结

随机逼近研究由带噪观测驱动的迭代修正。它为第五章的回报平均与第七章的时间差分更新之间提供了共同词汇。

::: info 原创伴读说明
本总结是原创伴读材料。它压缩上游主题顺序，但不复制原文、证明、图、表、示例、问答或代码。
:::

<a id="core-chain"></a>

## 核心链条

$$
\text{样本}
\longrightarrow
\text{带噪修正}
\longrightarrow
\text{步长更新}
\longrightarrow
\text{误差过程}
\longrightarrow
\text{诊断或收敛陈述}.
$$

同一个骨架可以从三个角度阅读：

| 视角 | 未知量 | 可观测修正 |
| --- | --- | --- |
| 均值估计 | $\mathbb E[X]$ | $x-w$ |
| Robbins–Monro | $g(w)$ 的根 | $-\widetilde g(w,\eta)$ |
| SGD | $\mathbb E[f(w,X)]$ 的最小点 | $-\nabla f(w,x)$ |

<a id="algorithm-map"></a>

## 一条递推的几种名称

$$
w_{k+1}=w_k-a_k\,\widehat g_k.
$$

对均值估计器，$\widehat g_k=w_k-x_{k+1}$；对 RM，它是带噪根观测；对 SGD，它是采样梯度。批量和小批量方法只改变在应用外层更新前平均多少观测，外层递推仍然相同。

<a id="assumptions"></a>

## 假设检查表

| 问题 | 为什么重要 | 有限运行字段 |
| --- | --- | --- |
| 步长是否为正且最终变小？ | 控制稳定性和适应性 | 实际 $a_k$ |
| 在预期极限中 $\sum a_k$ 是否发散？ | 防止过早冻结 | 累计步长和 |
| $\sum a_k^2$ 在渐近意义下是否有限？ | 限制有限方差噪声能量 | 累计平方步长和 |
| 条件噪声是否居中？ | 防止系统性漂移 | 按种子批次的噪声均值 |
| 方差/曲率是否受控？ | 限制修正大小 | 残差、梯度、目标值 |
| 样本是否按假设生成？ | 把观测梯度联系到目标 | 种子与采样协议 |

这张表用来识别假设，不能从有限前缀为它们盖章。

<a id="convergence-language"></a>

## 谨慎使用收敛语言

“几乎必然收敛”是渐近概率陈述；“当前误差低于容差”是有限数值观察；“这个种子的曲线很稳定”是经验描述。只有保持各自范围清楚，这些说法才能一起使用。

[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)把容差标记标成教学诊断，并单独报告选定调度是否具有教科书式 Robbins–Monro 形状。它不会把有限运行变成定理证明。

<a id="chapter-boundary"></a>

## 与下一章的边界

本章不实现时间差分学习。它的目的只是让增量形式变得熟悉：

$$
\text{估计}_{k+1}
=\text{估计}_k
 +\text{步长}\times\text{采样修正}.
$$

第七章会选择一个由后继估计构造的自举修正。那个目标引入新的依赖，不应倒灌进本章的均值、RM 或 SGD 例子。

<a id="implementation-contract"></a>

## 可复现实现契约

诚实的浏览器实验至少记录：

1. 模式及目标/根函数；
2. 初值、目标、步长调度和多项式指数（如有）；
3. 噪声尺度、采样协议、批大小和种子；
4. 每次更新（更新前后数值、观测、梯度、噪声与误差）；
5. 终止原因、累计步长和以及投影/截断标记。

这些字段让读者无需信任渲染曲线就能重放算术，也能暴露“重复应用步长”或隐藏裁剪值等实现错误。

<a id="read-next"></a>

## 继续阅读

用[问答](./q-and-a)做简短检索练习，再完成[检查点](./checkpoint)，然后进入第七章的时间差分材料。
