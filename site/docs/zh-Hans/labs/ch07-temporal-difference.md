---
id: exp-ch07-temporal-difference
translation_key: exp-ch07-temporal-difference
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.1-7.5"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: 时间差分实验
description: 用固定种子比较 TD(0)、SARSA、n 步 SARSA 与 Q-learning。
aside: false
outline: deep
---

# 时间差分实验

这是一个原创伴读实验：固定 4×4 Grid World，由 Worker 中的 Rust/Wasm 评估器运行，并报告请求动作、实际动作、奖励、目标、TD 误差与截断标志。

::: warning 有限运行边界
实验展示备份算术，不等于算法收敛条件的证明。
:::

<TemporalDifferenceLab locale="zh-Hans" />

<noscript>
控件需要 JavaScript，但下方的更新公式与比较协议仍然可读。
</noscript>

<a id="protocol"></a>
## 建议协议

1. 保持种子 `5eed`、风扰为 0，在 TD(0) 中点击“推进一次转移”。
2. 对 SARSA、n 步 SARSA（$n=3$）和 Q-learning 重复操作。
3. 在尽量固定真实转移的前提下比较目标列。
4. 开启 20% 风扰，观察请求动作与实际动作的区别。

网格和表格是同一快照的两种表示，不依赖颜色也能完成实验。
