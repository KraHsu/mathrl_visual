---
id: accessibility
translation_key: accessibility
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
title: 无障碍
description: 原创交互教材的键盘、减弱动画、数据表和无 JavaScript 保证。
---

# 无障碍

<a id="commitments"></a>

## 我们的承诺

两个 locale 的目标都是 WCAG 2.2 AA。每个实验都必须可以用键盘操作，有清晰可见的焦点路径，为图形提供文字或表格等价物，并在 Worker 或 Wasm 加载失败时提供恢复路径。动画可以暂停、单步、减速，也会响应 `prefers-reduced-motion`。

图表和地图只是解释视图，不是唯一信息源。同一组数值会出现在带表头、单位、状态 ID 和简短文字摘要的语义表格中。错误提示指出无效字段并保留运行 ID，用户可以重试而不丢失页面上下文。

<a id="testing"></a>

## 测试方式

CI 会在中英文代表性路由上运行 axe 检查，并执行 Playwright 键盘与视口场景。维护者还必须在发布前手工测试屏幕阅读器、400% 缩放、窄移动视口、禁用 JavaScript 和减弱动画偏好。自动检查不能替代人工签字。

<a id="contact"></a>

## 报告障碍

请在[仓库 issue](https://github.com/KraHsu/mathrl_visual/issues) 中提供 locale、URL、浏览器/辅助技术、预期行为和最小复现。不要附带私人笔记或导出的进度数据。
