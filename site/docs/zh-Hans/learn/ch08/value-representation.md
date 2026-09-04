---
id: ch08-value-representation
translation_key: ch08-value-representation
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 值表示：从表格到函数
description: 理解特征带来的存储与泛化权衡。
outline: deep
---

# 值表示：从表格到函数

<a id="features"></a>
## 参数化价值

不为每个格子单独存值，而是选择特征向量 $\phi(s)$ 和参数 $w$：

$$\hat v(s,w)=\phi(s)^\top w.$$

坐标需要两个参数；加入偏置或多项式项可以提高表达力。对于这个有限世界，独热映射可以精确还原表格。

<a id="generalization"></a>
## 泛化来自共享支持

改变一个参数会影响所有在该参数上有非零特征的状态。这既可能帮助未见状态，也可能传播误差。在实验中选择“独热 / 表格”和“偏置 + 坐标”即可观察差异。
