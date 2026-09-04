---
id: appendix-glossary
translation_key: appendix-glossary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix glossary"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Bilingual symbol glossary
description: Stable symbols and English/Simplified Chinese terms used throughout the companion.
outline: deep
---

# Bilingual symbol glossary

<a id="symbols"></a>

| Symbol / term | Meaning in this companion |
| --- | --- |
| $s\in\mathcal S$ | state / 状态 |
| $a\in\mathcal A(s)$ | action / 动作 |
| $r_{t+1}$ | reward received after a transition / 转移后收到的奖励 |
| $p(s',r\mid s,a)$ | environment transition-and-reward law / 环境转移与奖励规律 |
| $\pi(a\mid s)$ | policy probability / 策略概率 |
| $V^\pi(s)$ | state value under policy $\pi$ / 策略 $\pi$ 下的状态价值 |
| $Q^\pi(s,a)$ | action value / 动作价值 |
| $G_t$ | return from time $t$ / 从时刻 $t$ 起的回报 |
| $\gamma$ | discount factor / 折扣因子 |
| $\delta_t$ | temporal-difference error / 时间差分误差 |
| $\alpha$ | update step size / 更新步长 |
| $\phi(s)$ | feature vector / 特征向量 |
| $\theta,w$ | trainable or approximator parameters / 可训练或逼近器参数 |
| $\operatorname{argmax}$ | set of maximizing choices; ties remain visible / 取得最大值的选择集合，保留并列 |

<a id="wording"></a>

## Wording conventions

“Model-based” means that the transition/reward model is available to the calculation; “model-free” means the update consumes realised samples instead. “Episode” is a trajectory segment with an explicit termination rule, while “iteration” is an algorithmic update count. The Chinese pages retain algorithm names such as Bellman, SARSA, and Actor–Critic so searches remain interoperable.

<a id="notation"></a>

## Notation contract

Indices start at zero in implementation tables unless a page explicitly says otherwise. A prime ($s'$) denotes a next state, not a derivative. A superscript such as $V^*$ denotes an optimal object, while a superscript $\mathsf T$ denotes transpose. If a lab uses a different convention, its audit panel states it next to the data table.
