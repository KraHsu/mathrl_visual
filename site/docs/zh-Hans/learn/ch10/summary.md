---
id: ch10-summary
translation_key: ch10-summary
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "第十章总结"
description: 将 actor、critic、优势和策略分布选择放在同一张图中。
outline: deep
---

# 第十章总结

<a id="map"></a>

## 一条信息流

```text
转移 → critic 目标 → TD 误差/优势 → actor 得分更新
                  ↘ critic 参数更新
行为 μ ───────────→ 重要性比率 ρ（离策略）
```

<a id="checklist"></a>

## 审计清单

- 终止状态的 bootstrap 是否为零？
- QAC 是否使用动作价值，A2C 是否使用优势估计？
- $\rho=\pi/\mu$ 是否针对采样动作计算？
- 确定性模式是否避免假装采样了 log-probability？

<a id="boundary"></a>

## 实现边界

核心实验是有限表格版本。神经 critic、目标网络、经验回放、熵正则和信赖域保护都是工程扩展，不是这条轨迹的隐含假设。

<a id="next"></a>

完成[问答](./q-and-a)与[检查点](./checkpoint)。
