---
id: ch09-summary
translation_key: ch09-summary
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第九章总结"
description: 将策略表示、目标选择、定理和 REINFORCE 放在一条可审计链路中。
outline: deep
---

# 第九章总结

<a id="chain"></a>

## 核心链路

```text
参数 θ → 概率 πθ → 采样回报 G → 得分 × 权重 → θ 更新
```

目标决定状态权重；定理给出按得分加权的方向；REINFORCE 给出有限估计器。

<a id="checklist"></a>

## 审计清单

- 每行 softmax 概率是否和为一？
- 参数更新前是否计算 $e_a-\pi$？
- baseline 是否保持期望方向而改变有限方差？
- 是否区分 `objective`、采样回报和熵？

<a id="boundary"></a>

## 通往第十章

REINFORCE 使用完整采样回报。Actor–Critic 将用增量价值估计替代昂贵的 critic 信号，同时保留策略梯度 actor 更新。

<a id="next"></a>

完成[问答](./q-and-a)和[检查点](./checkpoint)后继续。
