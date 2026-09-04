---
id: ch06-mini-batch
translation_key: ch06-mini-batch
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.4.3-6.4.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "批量、随机与小批量更新"
description: 比较单样本和平均梯度，澄清有放回采样，并把批大小变成可见的统计与计算权衡。
outline: deep
---

# 批量、随机与小批量更新

“随机”不要求数据集本身神秘莫测。有限列表可以通过均匀抽取索引变成随机变量；反过来，确定性的循环规则也可以被当作规定好的数据流，但不能偷偷把它当成随机独立样本。批大小决定每次更新前平均掉多少梯度噪声。

::: info 原创伴读说明
下面的数据集例子、比较表和实验协议都是原创。它们解释上游批量/SGD/小批量主题，但不复制原文、公式、图或示例。
:::

<a id="learning-goals"></a>

## 学习目标

完成本单元后，你应该能够：

1. 写出 BGD、SGD 与小批量递推；
2. 区分有放回采样与打乱后遍历数据集；
3. 预测批大小如何改变梯度方差和单次更新工作量；
4. 解释大小为 $n$ 的小批量为何不一定等于一次精确批量更新；
5. 同时按更新次数和已消费样本数比较运行。

<a id="three-updates"></a>

## 三种更新规模

对于数据集 $x_1,\ldots,x_n$ 和单样本梯度 $g_i(w)=\nabla_w f(w,x_i)$，三种更新是：

$$
\begin{aligned}
\text{BGD:}
&\quad w_{k+1}=w_k-a_k\frac1n\sum_{i=1}^{n}g_i(w_k),\\
\text{MBGD:}
&\quad w_{k+1}=w_k-a_k\frac1m\sum_{i\in I_k}g_i(w_k),\\
\text{SGD:}
&\quad w_{k+1}=w_k-a_k g_{j_k}(w_k).
\end{aligned}
$$

这里 $I_k$ 是大小为 $m$ 的批，$j_k$ 是一个采样索引。BGD 每次更新使用全部样本；SGD 使用一个；小批量在算术成本和梯度波动上都处于两者之间。

<a id="sampling-protocols"></a>

## 采样协议也是算法的一部分

获得索引至少有三种常见方式：

| 协议 | 批内会重复吗？ | 一次更新估计什么 |
| --- | --- | --- |
| 有放回 iid | 可能 | 总体梯度的无偏样本平均 |
| 打乱后的 epoch | 一次遍历内不会 | 有限总体平均，但顺序相关 |
| 确定性循环 | 顺序固定 | 规定的增量方法，而不是 iid 采样 |

若 $X$ 定义为均匀抽取的数据集元素，则有限目标

$$
J(w)=\frac1n\sum_{i=1}^{n}f(w,x_i)
$$

严格等于 $\mathbb E[f(w,X)]$。但顺序遍历列表并不会自动成为 iid 数据流。可复现实验必须公开使用的协议。

<a id="variance-work"></a>

## 方差与工作量

若单样本梯度相互独立、协方差为 $\Sigma$，$m$ 次抽样的平均梯度协方差约为 $\Sigma/m$。有限总体采样或相关数据会改变近似，但权衡方向仍有用：

| 更大的批 | 更小的批 |
| --- | --- |
| 每次更新的梯度噪声更小 | 随机性更明显 |
| 移动前要处理更多样本和算术 | 单次便宜、更新更频繁 |
| 更容易利用向量化硬件 | 最优点附近可能更嘈杂 |
| 一次数据遍历需要更少更新 | 同样样本预算下更新更多 |

如果不同时报告消费的样本数，不要直接比较不同模式的“第 20 次迭代”。20 次 BGD 更新可能查看 $20n$ 个样本，而 20 次 SGD 更新可能只查看 20 个。

<a id="mean-example"></a>

## 均值估计比较

对平方损失 $f(w,x)=\frac12\lVert w-x\rVert^2$，梯度为 $w-x$。因此：

$$
\begin{aligned}
\text{BGD:}\quad &w_{k+1}=w_k-a_k(w_k-\bar x),\\
\text{MBGD:}\quad &w_{k+1}=w_k-a_k(w_k-\bar x_{I_k}),\\
\text{SGD:}\quad &w_{k+1}=w_k-a_k(w_k-x_{j_k}).
\end{aligned}
$$

其中 $\bar x$ 是全数据均值，$\bar x_{I_k}$ 是批均值。BGD 知道有限数据的精确梯度；另外两者在每次更新时只估计它。使用调和步长和独立样本时，三者都可能在合适条件下趋近均值，但路径和工作分布不同。

<a id="batch-size-traps"></a>

## 两个端点陷阱

1. **$m=1$** 让小批量的代数形式等于 SGD，但前提是采样规则也相同。
2. **$m=n$** 不一定让小批量等于 BGD：有放回抽取 $n$ 次可能重复某个样本并漏掉另一个，而 BGD 恰好各用一次。

在带种子的重放中，如果希望另一种实现逐梯度复现，就保存抽取的索引，或至少保存索引摘要。

<a id="lab-protocol"></a>

## 公平的实验比较

在[随机逼近实验](/zh-Hans/labs/ch06-stochastic-approximation)中：

1. 固定数据集、目标函数、初始 $w$、随机种子和步长调度；
2. 运行 BGD、SGD 和两种小批大小；
3. 同时按更新索引与消费样本数比较到目标的距离；
4. 检查抽取索引和梯度方差；
5. 换第二个种子后再下结论。

有限曲线展示的是成本/方差权衡。它们不能建立渐近收敛定理，也不能把确定性采样顺序变成 iid 证据。

<a id="check-yourself"></a>

## 自测

有 $n=8$ 个样本，小批大小为 $m=4$。如果有放回采样，索引 `[1, 1, 3, 7]` 是合法的，但不代表四个不同样本。把这次更新称为 BGD 会夸大实际使用的信息量。

<a id="read-next"></a>

## 继续阅读

用[总结](./summary)把本章压缩为一张“更新—假设”图，再用[问答](./q-and-a)和[检查点](./checkpoint)检验理解。
