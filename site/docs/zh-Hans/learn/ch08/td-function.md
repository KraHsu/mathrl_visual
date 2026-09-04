---
id: ch08-td-function
translation_key: ch08-td-function
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 函数逼近的 TD
description: 从引导式预测推导线性 TD 更新。
outline: deep
---

# 函数逼近的 TD

<a id="update"></a>
## 投影更新

对可微逼近器，使用样本目标 $R_{t+1}+\gamma\hat v(S_{t+1},w_t)$：

$$w_{t+1}=w_t+\alpha\big[R_{t+1}+\gamma\hat v(S_{t+1},w_t)-\hat v(S_t,w_t)\big]\nabla_w\hat v(S_t,w_t).$$

线性映射的梯度就是 $\phi(S_t)$。实验分别显示预测、目标、误差、梯度范数和更新范数。

<a id="stationary"></a>
## 采样很重要

目标函数会按采样分布给状态加权。特征映射可能拟合高频状态却忽略稀有状态，因此要同时检查状态网格与总损失。
