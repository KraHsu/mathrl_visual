---
id: ch08-deep-q-learning
translation_key: ch08-deep-q-learning
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Deep Q-learning 边界
description: 显式展示经验回放与目标网络节奏，同时标明数学边界。
outline: deep
---

# Deep Q-learning 边界

<a id="two-networks"></a>
## 主参数与目标参数

Deep Q-learning 保留主参数 $w$ 与延迟目标参数 $w_T$。回放样本 $(s,a,r,s')$ 的目标为

$$y_T=r+\gamma\max_{a'}\hat q(s',a',w_T).$$

主参数拟合该目标；每隔 $C$ 次更新同步目标参数。

<a id="replay"></a>
## 回放是采样决策

实验记录回放大小、批大小、损失和目标同步次数。受限线性替身用于推理陈旧目标与均匀回放，不是通用神经网络运行时。
