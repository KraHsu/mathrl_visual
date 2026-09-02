---
id: exp-ch06-stochastic-approximation
translation_key: exp-ch06-stochastic-approximation
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.1-6.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 随机逼近实验
description: 用带种子的均值、Robbins–Monro、SGD、批量和小批量更新，观察步长与噪声诊断。
aside: false
outline: deep
---

# 随机逼近实验

本实验把第六章的更新模式变成一个小型、可审计的标量任务。Rust/Wasm 在 Worker 中生成有界且带种子的样本流；Vue 展示每次更新前后数值、观测、梯度或残差、噪声、目标值与误差。这是关于增量算术的实验，不是渐近证明的替代品。

::: info 原创伴读实验
合成数据流、控件、轨迹格式、问题和无脚本回退说明均为原创伴读材料。它们引用上游章节主题，但不再发布原文、图、表、示例、问题或代码。
:::

::: warning 有限运行边界
界面可以报告达到容差，以及调度是否具有教科书式 Robbins–Monro 形状。这两个标记都不能证明几乎必然收敛。保存截图或导出轨迹时，请同时记录假设、种子和停止规则。
:::

<StochasticApproximationLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但下面的更新方程、模式定义、审计表和手算步骤仍然可用。
</noscript>

<a id="experiment-question"></a>

## 实验问题

当修正是精确的、带噪的、经过平均的，或刻意采用非线性形式时，增量估计器会怎样？固定目标、初值、种子和样本预算，每次只改变一个因素：

1. 均值估计与 Robbins–Monro 求根；
2. 零噪声与居中噪声；
3. 调和、多项式和常数步长；
4. 单样本、小批量和完整批量。

实验中的随机流是项目定义的可复现工具，不是对原书图或无种子数值例子的复刻。

<a id="problem-setup"></a>

## 问题设置与控件

默认任务是标量任务。`target` 是均值、根或最小点；`initial w` 是起始估计。噪声来自有界且居中的分布，使浏览器运行保持有限并易于检查。RM 选择器可以使用线性、双曲正切或居中的立方根函数。

| 控件 | 基线 | 含义 |
| --- | ---: | --- |
| 模式 | mean | mean、Robbins–Monro、SGD、mini-batch 或 batch gradient |
| 根函数 | linear | RM 信号形状；均值/梯度模式忽略此项 |
| target / root | 1.0 | 期望的均值或解 $w^*$ |
| initial $w$ | 0.0 | 起始迭代量 |
| 步长调度 | harmonic | $a_k=\alpha/k$、常数或多项式 |
| 基础 $\alpha$ | 0.8 | 所选调度的尺度 |
| 多项式指数 | 1.0 | 选择多项式时为 $a_k=\alpha/k^p$ |
| 噪声标准差 | 0.25 | 有界观测/梯度扰动 |
| 样本数 | 200 | 最大标量更新次数 |
| 批大小 | 1 | mini-batch/batch 模式中平均的梯度数 |
| 容差 | $10^{-3}$ | 教学用绝对误差标记 |
| 种子 | `5eed` | 十六进制重放键 |

引擎会校验这些范围，并在输入无效时报告错误，不会静默截断数学参数。

<a id="mode-contract"></a>

## 五种模式，一条外层更新

每一行都遵循 $w_{k+1}=w_k-a_k\widehat g_k$，但观测到的修正不同：

| 模式 | 观测 | 使用的修正 | 应比较什么 |
| --- | --- | --- | --- |
| Mean | target 加噪声 | $w_k-\text{observation}$ | 在线平均与噪声 |
| Robbins–Monro | $g(w_k)$ 加噪声 | 观测到的根信号 | 残差符号与根函数 |
| SGD | target 加噪声 | $w_k-\text{observation}$ | 目标函数与距离 |
| Mini-batch | 多个 target 加噪观测 | $w_k-$ 它们的平均 | 方差与工作量 |
| Batch gradient | 固定合成数据集 | $w_k-$ 全数据均值 | 精确有限数据梯度 |

BGD 数据集在重置后生成一次。Mini-batch 的索引和批大小会显示出来，因此“一次更新”不会隐藏实际消费了多少样本。

<a id="trace-contract"></a>

## 一条轨迹记录什么

每一行迭代至少应展示：

| 字段 | 为什么重要 |
| --- | --- |
| 索引与种子 | 重放并对齐 $a_k$ |
| $w_{\text{before}}$、$w_{\text{after}}$ | 核对更新算术 |
| 实际 $\alpha_k$、$\alpha_k^2$ | 审计步长和 |
| 观测与梯度/残差 | 区分目标信号与噪声 |
| 噪声与批索引 | 检查居中和样本复用 |
| 有符号/绝对误差与目标值 | 区分方向和大小 |
| projected 标记 | 暴露安全边界，而不是隐藏溢出 |

摘要面板还会报告 $\sum a_k$、$\sum a_k^2$、噪声均值/方差、迭代次数、容差状态，以及配置预算是否耗尽或运行是否被截断。

<a id="return-equations"></a>

## 手算时使用的更新方程

对 mean、SGD 和 batch 模式，观测为 $y_k=\text{target}+\xi_k$，并且

$$
w_{k+1}=w_k+a_k(y_k-w_k).
$$

对 RM，令 $r_k=g(w_k)+\xi_k$：

$$
w_{k+1}=w_k-a_kr_k.
$$

对大小为 $m$ 的小批 $I_k$，先平均观测梯度：

$$
\widehat g_k=\frac1m\sum_{j\in I_k}g(w_k,x_j),
\qquad
w_{k+1}=w_k-a_k\widehat g_k.
$$

使用显示的 `batch_indices` 重现平均值。只有采样协议一致时，批大小为一才是 SGD。

<a id="protocol"></a>

## 一套受控协议

1. 使用种子 `5eed`、target 1、初值 0 和零噪声重置。
2. 在 mean 模式运行调和步长，记下前五行。
3. 保持所有控件不变，切换到 RM/linear，比较残差符号。
4. 把噪声改为 0.25 并重放；检查噪声均值与误差尾部。
5. 按更新索引和消费样本数，比较 SGD、批大小 8 的 mini-batch 与 batch gradient。
6. 换成常数步长，并解释为什么达到容差不等于渐近保证。

改变种子应该改变观测，而不应改变更新契约。改变模式会改变所回答的问题，即使两行偶然出现相同数字。

<a id="interpretation"></a>

## 解读指南

| 现象 | 可能解释 | 后续检查 |
| --- | --- | --- |
| 先平滑靠近、后期抖动 | 远处信号占主导，目标附近噪声占主导 | 绘制绝对与相对误差 |
| 移动很快但停在带状区域 | 常数步长或不消失的噪声 | 检查调度与 $\sum a_k^2$ |
| 远初值几乎不动 | 步长衰减过快或符号错误 | 检查 $\sum a_k$ 与某行梯度 |
| 小批量更平滑但成本更高 | 平均降低了梯度方差 | 比较消费的样本数 |
| RM 与 SGD 差异很大 | 根函数非线性或目标不同 | 比较 `root function` 与残差 |

<a id="manual-fallback"></a>

## 没有 JavaScript 时的手算回退

选择 target $1$、初值 $w_1=0$、调和 $a_k=0.8/k$ 和零噪声 mean 运行。前两次更新为

$$
w_2=0+0.8(1-0)=0.8,
\qquad
w_3=0.8+0.4(1-0.8)=0.88.
$$

沿同一递推继续，并记录索引、步长、更新前后数值、误差和累计和。对线性 RM，只需把 $(1-w_k)$ 换成 $-(w_k-1)$；零噪声时数值更新相同。这条手算轨迹足以核对符号和索引约定。

<a id="next"></a>

## 继续

回到[均值估计](../learn/ch06/mean-estimation)查看代数，在[Robbins–Monro](../learn/ch06/robbins-monro)查看求根假设，并在[批量与小批量](../learn/ch06/mini-batch)查看采样权衡。第七章的时间差分目标特意不在本实验中。
