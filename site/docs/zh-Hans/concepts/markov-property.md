---
id: concept-markov-property
translation_key: concept-markov-property
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: 马尔可夫性质
description: 用可视化、可检查的条件判断当前状态是否包含足够的历史信息。
outline: deep
---

# 马尔可夫性质

马尔可夫问题是在检验信息是否充分，而不是给算法贴标签：

> 已知当前状态和动作后，额外的历史是否还会改变下一状态与奖励的分布？

如果答案是否定的，这个状态足以做一步预测；如果答案是肯定的，表示状态
表示隐藏了记忆，模型需要扩大状态，或显式引入记忆机制。

<a id="test"></a>

## 两行检验

设两段历史到达同一个可见位置。固定当前动作，比较下一步的条件分布：

| 检验 | 历史 A | 历史 B | 结论 |
| --- | --- | --- | --- |
| 相同状态、相同动作 | $S_t=s$, $A_t=a$ | $S_t=s$, $A_t=a$ | 可见输入一致 |
| 隐藏历史不同 | 看到了尚未打开的门 | 之前已经打开了门 | 额外历史可能重要 |
| 比较 $P(S_{t+1},R_{t+1}\mid\text{history},a)$ | 同一分布 | 同一分布 | 表示满足马尔可夫性 |
| 比较两种分布 | 分布不同 | 分布不同 | 把缺失事实加入状态 |

状态不必记住所有过去事件；只需保留在可用动作下会改变未来预测的信息。

<a id="diagram"></a>

## 把条件关系画出来

<svg class="markov-diagram" viewBox="0 0 760 190" role="img" aria-labelledby="markov-diagram-title markov-diagram-description">
  <title id="markov-diagram-title">马尔可夫条件图</title>
  <desc id="markov-diagram-description">两段历史进入同一个状态框；只有当历史没有隐藏差异时，状态和动作才唯一决定下一状态与奖励的联合分布。</desc>
  <defs>
    <marker id="markov-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#markov-arrow)">
    <path d="M145 55 C210 55 220 88 275 88" />
    <path d="M145 135 C210 135 220 102 275 102" />
    <path d="M485 95 H635" />
  </g>
  <g fill="currentColor" text-anchor="middle" font-family="system-ui, sans-serif">
    <text x="78" y="50" font-size="16">历史 A</text>
    <text x="78" y="70" font-size="13">history A</text>
    <text x="78" y="130" font-size="16">历史 B</text>
    <text x="78" y="150" font-size="13">history B</text>
    <rect x="275" y="65" width="210" height="60" rx="12" fill="var(--vp-c-bg-soft)" stroke="currentColor" />
    <text x="380" y="91" font-size="16">状态 s + 动作 a</text>
    <text x="380" y="111" font-size="13">state s + action a</text>
    <text x="680" y="91" font-size="16">下一步分布</text>
    <text x="680" y="111" font-size="13">next law</text>
  </g>
</svg>

这张图用于推理，并不声称任意两段历史都等价。真正需要检查的是

$$
P(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a,H_t=h)
=P(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a)。
$$

<a id="practice"></a>

## 在伴读中练习

- [MDP 课程页](../learn/ch01/mdp) 对比了信息充分与不足的状态描述。
- [Grid World 实验](../labs/ch01-gridworld) 可以并排查看马尔可夫视图、转移
  分布和模型审计。
- 在实验中先观察确定性行，再使用引导控件开启 20% 风扰动；条件变量仍然
  明确，但转移规律会发生可观察的变化。

<noscript>
本页不依赖 JavaScript；即使实验 Worker 不可用，实验链接对应的静态说明仍可阅读。
</noscript>
