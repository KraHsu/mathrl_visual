---
id: appendix-glossary
translation_key: appendix-glossary
locale: zh-Hans
origin: companion-translation
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
title: 中英符号术语表
description: 本伴读各章使用的稳定符号与中英文术语。
outline: deep
---

# 中英符号术语表

<a id="symbols"></a>

| 符号 / 术语 | 本伴读中的含义 |
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

## 用词约定

“Model-based”指计算时可以使用转移/奖励模型；“model-free”指更新只消费实际样本。“Episode”是带有明确终止规则的轨迹片段；“iteration”是算法更新次数。中文页面保留 Bellman、SARSA 和 Actor–Critic 等算法名，保证搜索可以互通。

<a id="notation"></a>

## 符号约定

实现表格中的下标默认从 0 开始，除非页面另有说明。撇号 $s'$ 表示下一状态，不是导数。上标 $V^*$ 表示最优对象，右上角 $\mathsf T$ 表示转置。如果实验采用不同约定，审计面板会在数据表旁说明。
