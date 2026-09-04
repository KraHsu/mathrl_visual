---
id: appendix-linear-algebra
translation_key: appendix-linear-algebra
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix linear algebra"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 向量、范数与投影
description: 用有限维线性代数阅读 Bellman 系统、残差和特征更新。
outline: deep
---

# 向量、范数与投影

<a id="vectors"></a>

## 把有限价值函数写成向量

选定状态顺序 $s_0,\ldots,s_{n-1}$，记作

$$v=(V(s_0),\ldots,V(s_{n-1}))^\mathsf T.$$

顺序是约定而不是数学事实。每个矩阵、热图和可复制表格都必须声明同一顺序。共享 Grid World 使用行优先状态 ID，因此可以不猜测地从格子定位到向量坐标。

<a id="norms"></a>

## 范数让残差可测量

无穷范数为

$$\lVert v\rVert_\infty=\max_i|v_i|.$$

Bellman 扫描常显示如下残差：

$$\lVert v_{k+1}-v_k\rVert_\infty.$$

它是停止诊断。在模型不佳或函数类表达能力不足时，残差很小并不自动意味着任务目标很好。

<a id="matrix"></a>

## 矩阵形式的策略评估

在固定策略、持续型折扣模型中，

$$v=r_\pi+\gamma P_\pi v,
\qquad (I-\gamma P_\pi)v=r_\pi.$$

这里 $P_\pi$ 的每一行和为 1。逆矩阵 $(I-\gamma P_\pi)^{-1}$ 是紧凑的参考表达；数值实现应验证矩阵，并在奇异或非有限时明确报错，而不是悄悄给出结果。

<a id="projection"></a>

## 特征与投影

逼近器写作 $\hat v(s)=\phi(s)^\mathsf T w$。如果特征列无法表达精确价值向量，更新就会寻找一个落在这些列张成空间中的有用投影。增加特征可能降低表示误差，也可能改变条件数和步长尺度。

值函数实验会同时展示 $\phi(s)$、$w$、预测、目标和更新范数，使投影过程可以逐项检查。
