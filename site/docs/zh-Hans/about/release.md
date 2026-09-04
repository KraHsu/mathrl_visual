---
id: about-release
translation_key: about-release
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
title: 发布清单
description: MathRL Visual 进入生产发布前必须提供的证据与门禁。
---

# 发布清单

<a id="gates"></a>

## 可选的正式版本门禁

普通 Pages 工作流已经可以构建并部署交互式伴读站点。本页描述的是可选的正式版本流程，适用于需要完整人工审核，或未来要再分发上游素材的情况。该流程可以要求 Rust/Wasm 与前端测试、locale parity、产物/PWA、浏览器/无障碍、性能证据、审核记录，以及部署后经过版本身份核对的 HTTPS smoke JSON。仓库中的 smoke 脚本只生成可复核的 JSON 证据，不应把它误称为签名或外部证明。

`RELEASE=1` 是这个可选正式版本流程的“失败即关闭”开关：任何 `draft`、`stale`、`missing` 或权利未明确的 locale 记录都会阻断正式构建，但不会阻止普通预览工作流。

<a id="rollback"></a>

## 回滚证据

打标签前，先把候选制品部署到 Pages 预演环境，记录内容/引擎/schema 版本，并演练恢复上一个不可变制品。回滚后验证两个 locale 根路径、一个章节页、一个旗舰实验、离线页和语言切换。将演练 URL 与时间写入发布记录。

仓库根目录的 [RELEASE.md](https://github.com/KraHsu/mathrl_visual/blob/main/RELEASE.md) 提供维护者使用的命令级手册。

<a id="approval"></a>

## 人工批准记录

如果要做正式版本，标签消息或附件发布记录应列出数学审核人、语言审核人、无障碍审核人、权利批准人、源提交、内容集合和日期。角色尚未确定时，继续使用普通预览即可。
