---
id: ch08-approximators
translation_key: ch08-approximators
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.2.3-8.2.5"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: 如何选择特征逼近器
description: 比较坐标、多项式、Fourier 与独热特征映射。
outline: deep
---

# 如何选择特征逼近器

<a id="maps"></a>
## 特征映射菜单

| 映射 | 维度 | 典型效果 |
| --- | ---: | --- |
| 坐标 | 2 | 紧凑但没有偏置 |
| 偏置 + 坐标 | 3 | 仿射曲面 |
| 多项式 | 6 | 弯曲曲面 |
| Fourier 基 | 9 | 平滑振荡成分 |
| 独热 | 16 | 精确表格 |

<a id="experiment"></a>
## 应观察什么

选择一个映射，运行一次转移并记录特征向量；只改变映射再重复。低维向量可以同时更新多个格子，这是泛化的可观察形式。
