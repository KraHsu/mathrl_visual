---
id: offline-guide
translation_key: offline-guide
locale: zh-Hans
origin: companion-translation
source_kind: site-navigation
rights: companion-original
review_content: draft
review_language: draft
review_math: not_applicable
review_accessibility: draft
title: 离线阅读
description: 了解原创交互教材的静态离线包和需要确认的 PWA 更新流程。
outline: deep
---

# 离线阅读

本站是静态 Pages 制品。首次访问只保留一个较小的应用壳；之后可以主动预取
English 包、简体中文包或中英双语包。下载需要用户明确操作，不会在未同意时
悄悄缓存大体积资源。

<a id="packs"></a>

## 离线包与恢复

- 单语言包保留自己的课程路由和离线回退页；
- 双语包使用同一个 content-set 版本原子激活两种语言；
- 下载中断后可以继续；
- 清理损坏缓存时不会删除恢复应用壳。

生成的 `offline-manifest.json` 记录路由、物理文件、字节估算和存储 schema。
[发布手册](./about/release) 说明 N-1 migration 与回滚要求。

<a id="updates"></a>

## 更新

新的 Service Worker 会等待用户明确确认后才替换正在工作的版本，因此不会
静默刷新当前实验或阅读位置。确认启用后，请在适合离开当前页面时再刷新。

<noscript>
本页不依赖 JavaScript 也能说明离线契约；浏览器缓存过的生成离线回退页仍可用。
</noscript>
