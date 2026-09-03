---
id: ch08-q-learning
translation_key: ch08-q-learning
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.3"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: 使用特征的动作价值
description: 将线性 TD 从状态价值扩展到 SARSA 与 Q-learning。
outline: deep
---

# 使用特征的动作价值

<a id="sarsa"></a>
## SARSA-Linear

表示 $\hat q(s,a,w)=\phi(s,a)^\top w$。SARSA 目标使用下一次采样动作，梯度更新共享参数。

<a id="q-learning"></a>
## Q-learning-Linear

Q-learning 目标改用 $\max_{a'}\hat q(s',a',w)$。坐标特征下，一次更新可同时改变多个动作价值；用独热特征对比即可隔离逼近效应。
