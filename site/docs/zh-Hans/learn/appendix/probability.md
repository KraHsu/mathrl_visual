---
id: appendix-probability
translation_key: appendix-probability
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix probability"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 概率与期望
description: 转移模型、策略和 Monte Carlo 估计所使用的概率恒等式。
outline: deep
---

# 概率与期望

<a id="distribution"></a>

## 分布就是归一化的一行

对有限随机变量 $X$，概率质量函数 $p(x)$ 满足

$$p(x)\ge 0,\qquad \sum_x p(x)=1.$$

实验中有两处会出现同一个不变量：

- 策略行 $\pi(a\mid s)$ 把概率质量分给动作；
- 转移行 $p(s'\mid s,a)$ 把概率质量分给下一状态。

如果一行因显示四舍五入而是 $0.999999$，应先检查存储值，再判定模型无效。Rust 校验器会使用明确容差，数值表也会打印足够位数来定位真正缺失的概率。

<a id="expectation"></a>

## 期望与条件期望

有限随机变量的期望为

$$\mathbb E[X]=\sum_x x\,p(x).$$

条件期望把已知信息写在下标中：

$$\mathbb E[X\mid Y=y]=\sum_x x\,p(x\mid y).$$

一步 Bellman 备份就是条件期望再加上“奖励与折扣”的变换：

$$\mathbb E[R_{t+1}+\gamma V(S_{t+1})\mid S_t=s,A_t=a]
 =\sum_{s',r}p(s',r\mid s,a)\,[r+\gamma V(s')].$$

不能用“最可能的下一状态”替代平均。风扰动正是一个很小、但能看出这两种计算差别的例子。

<a id="variance"></a>

## 方差与 Monte Carlo 误差

对样本 $X_1,\ldots,X_n$ 及均值 $\bar X$，

$$\widehat{\operatorname{Var}}(X)=\frac1n\sum_{i=1}^n(X_i-\bar X)^2.$$

方差描述离散程度，不等于偏差。固定种子的 Monte Carlo 运行可以在同一批实际回合上比较估计器，但一次运行不是置信区间。增加样本预算，报告种子，并先说明访问规则，再得出结论。

<a id="audit"></a>

## 四行审计法

阅读概率计算时依次询问：

1. 随机的是什么：策略选择、环境结果，还是两者？
2. 条件中已经知道了什么？
3. 求和是否覆盖所有可能结果？
4. 结果是否满足范围与归一化检查？

可以打开[第二章策略评估实验](/zh-Hans/labs/ch02-policy-evaluation)，在共享 4×4 转移行上逐项展开这些问题。
