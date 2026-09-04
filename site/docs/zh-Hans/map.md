---
id: concept-map
translation_key: concept-map
locale: zh-Hans
origin: companion-translation
source_kind: site-navigation
rights: companion-original
review_content: draft
review_language: draft
review_math: not_applicable
review_accessibility: draft
title: 学习路线图
description: 把强化学习数学基础组织成一条相互连接的学习路径。
outline: deep
---

# 学习路线图

这些章节不是彼此孤立的技巧，而是一张有依赖关系的图。下面的路线图用于
定位；每个节点都可以从侧栏进入完整章节。这是一条独立创作的教材路径，学习者
无需先阅读上游原书；上游书籍仅作为主题参考。

<a id="graph"></a>

## 从交互走向控制

<svg class="learning-map" viewBox="0 0 900 430" role="img" aria-labelledby="learning-map-title learning-map-description">
  <title id="learning-map-title">从交互到 Actor–Critic 的学习路线图</title>
  <desc id="learning-map-description">十个章节节点从左到右连接：第一章建立决策模型，第二至四章推导并求解 Bellman 方程，第五至十章依次进入采样、逼近、策略梯度和 Actor–Critic 方法。</desc>
  <defs>
    <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#map-arrow)">
    <path d="M145 80 H225" /><path d="M335 80 H415" /><path d="M525 80 H605" />
    <path d="M660 110 V180 H580" /><path d="M465 210 H385" />
    <path d="M275 240 V315 H350" /><path d="M465 345 H545" />
    <path d="M660 345 H740" />
  </g>
  <g font-family="system-ui, sans-serif" text-anchor="middle" fill="currentColor">
    <g><rect x="25" y="45" width="120" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="85" y="75" font-size="17">1 · MDP</text><text x="85" y="97" font-size="13">交互</text></g>
    <g><rect x="225" y="45" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="280" y="75" font-size="17">2 · $v_π$</text><text x="280" y="97" font-size="13">期望</text></g>
    <g><rect x="415" y="45" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="470" y="75" font-size="17">3 · $v_*$</text><text x="470" y="97" font-size="13">最优性</text></g>
    <g><rect x="605" y="45" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="660" y="75" font-size="17">4 · 规划</text><text x="660" y="97" font-size="13">已知模型</text></g>
    <g><rect x="465" y="180" width="115" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="522" y="210" font-size="17">5 · MC</text><text x="522" y="232" font-size="13">回合</text></g>
    <g><rect x="275" y="315" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="330" y="345" font-size="17">6 · SA</text><text x="330" y="367" font-size="13">样本</text></g>
    <g><rect x="545" y="315" width="115" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="602" y="345" font-size="17">7–8 · TD</text><text x="602" y="367" font-size="13">逼近</text></g>
    <g><rect x="740" y="315" width="115" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="797" y="345" font-size="17">9–10 · π</text><text x="797" y="367" font-size="13">Actor–Critic</text></g>
  </g>
</svg>

<a id="routes"></a>

## 章节入口

| 阶段 | 要回答的问题 | 路由 |
| --- | --- | --- |
| 1 · 基本概念 | 什么是状态、动作、奖励、回报和 MDP？ | [第一章](./learn/ch01/) |
| 2 · 策略评估 | 固定策略的期望回报是多少？ | [第二章](./learn/ch02/) |
| 3 · 最优性 | 动作选择如何进入 Bellman 方程？ | [第三章](./learn/ch03/) |
| 4 · 规划 | 如何在已知模型上运行价值迭代和策略迭代？ | [第四章](./learn/ch04/) |
| 5 · Monte Carlo | 完整采样回合能告诉我们什么？ | [第五章](./learn/ch05/) |
| 6 · 随机逼近 | 带噪的增量更新如何变化？ | [第六章](./learn/ch06/) |
| 7 · TD 方法 | 如何用部分经验构造自举目标？ | [第七章](./learn/ch07/) |
| 8 · 值函数 | 特征和回放如何表示值？ | [第八章](./learn/ch08/) |
| 9 · 策略梯度 | 如何直接优化策略的期望回报？ | [第九章](./learn/ch09/) |
| 10 · Actor–Critic | Actor 与 Critic 如何共享更新信号？ | [第十章](./learn/ch10/) |

[符号术语表](./symbols) 固定记号；[马尔可夫性质](./concepts/markov-property)
解释路线起点的状态充分性检验。

<noscript>
路线图使用内联 SVG，并提供文字表格回退；禁用 JavaScript 后仍可访问全部章节链接和说明。
</noscript>
