---
id: about-source-version
translation_key: about-source-version
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: project-policy
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: not_applicable
review_accessibility: draft
title: 来源与版本记录
description: 固定的上游参考、内容校验和、引擎版本与审核状态。
---

# 来源与版本记录

<a id="versions"></a>

## 构建身份

每个生产制品必须携带一个不可变的内容集合。当前预览构建记录如下：

| 字段 | 值 |
| --- | --- |
| site 包 | `0.1.0` preview |
| Rust/Wasm 引擎 | `0.1.0`（Cargo 包版本） |
| 内容集合 | `companion-2026-09-03`（draft） |
| locale 集合 | `zh-Hans` + `en` |
| 数据 schema | `2` |
| 上游提交 | `0e348961c28496096d308f1066009266b3674c5a` |

发布生成器会把这些值同时写入机器可读清单和离线缓存名称。浏览器不能把不同内容集合或引擎版本的 HTML、Worker、Wasm 资产混用。

<a id="upstream"></a>

## 固定的上游参考

本站只为主题顺序和来源说明链接上游书库。附录 PDF 的 blob 为 `d500366336c85f7853db704c434a87715ea0b211`，SHA-256 为 `46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3`。勘误 PDF 的 blob 为 `d5276e927e30ba94f39752f3b99fe41cfdd66615`，SHA-256 为 `5f19f38d7f58ae6a9d66618f7846318d8a8b869db162c772ffd28da694bafec8`。

各章参考写在页面 frontmatter 和[章节清单](https://github.com/KraHsu/mathrl_visual/blob/main/scripts/chapter-manifest.mjs)中。上游 PDF 变化会生成审核 issue，不会静默替换已发布页面。

<a id="review"></a>

## 审核状态（可选正式版本）

`draft`、`stale` 和 `missing` 是对用户可见的进度状态。若要做正式版本，清单可以为每个 locale 列出审核人、日期、源内容 hash、数学结论、语言结论、无障碍结论和权利依据。在这些记录完成前，`RELEASE=1` 按设计可能失败；普通原创伴读预览仍可使用。
