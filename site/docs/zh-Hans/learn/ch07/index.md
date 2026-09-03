---
id: ch07-overview
translation_key: ch07-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.1-7.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "第七章：时间差分方法"
description: 从一步目标出发，比较 TD(0)、SARSA、n-step SARSA 与 Q-learning。
outline: deep
---

# 第七章：时间差分方法

时间差分（TD）学习在转移到达时就更新预测。它把第六章的增量思想与第二至四章的 Bellman 目标连接起来。

::: info 内容边界
本站是非官方原创伴读。页面只沿用固定上游章节的主题顺序，不复制正文、证明、图、示例或代码。请参阅[固定上游 PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%207%20Temporal-Difference%20Methods.pdf)；源文件摘要记录在元数据中。
:::

<a id="learning-goals"></a>
## 学习目标

1. 推导 TD(0) 目标 $R_{t+1}+\gamma V(S_{t+1})$；
2. 区分同策略 SARSA 与异策略 Q-learning 的目标；
3. 解释 n 步回报如何连接 SARSA 与 Monte Carlo；
4. 审计有限轨迹，而不是把它当作渐近收敛证明。

<a id="roadmap"></a>
## 章节路线

| 单元 | 主要问题 | 实验观察 |
| --- | --- | --- |
| [TD 学习](./td-learning) | 一次转移后改变什么？ | 访问状态、目标、误差 |
| [SARSA](./sarsa) | 下一个行为动作怎样进入？ | 同策略备份 |
| [n 步 SARSA](./n-step-sarsa) | 回报延迟多少？ | 视野与引导项 |
| [Q-learning](./q-learning) | 什么是异策略备份？ | 贪心最大值目标 |
| [统一视角](./unified) | MC 与 TD 如何关联？ | 偏差/方差 |

在[时间差分实验](/zh-Hans/labs/ch07-temporal-difference)中用种子 `5eed` 在同一个 4×4 世界重放四种更新。

<a id="notation"></a>
## 共同记号

状态价值更新写作 $\delta_t=R_{t+1}+\gamma V_t(S_{t+1})-V_t(S_t)$，以及 $V_{t+1}(S_t)=V_t(S_t)+\alpha\delta_t$。动作价值只需替换 $V$ 并选择相应的下一动作规则。终止转移不包含引导项。

<a id="boundary"></a>
## 有限运行边界

浏览器报告真实样本，而不是重建转移模型。回合上限会显式标记为 `truncated`；小 TD 误差只是诊断，不是几乎必然收敛的证据。

第七章页面：[导览](./) · [TD](./td-learning) · [SARSA](./sarsa) · [n 步](./n-step-sarsa) · [Q-learning](./q-learning) · [统一视角](./unified) · [总结](./summary) · [问答](./q-and-a) · [检查点](./checkpoint) · [实验](/zh-Hans/labs/ch07-temporal-difference)
