---
id: ch07-n-step-sarsa
translation_key: ch07-n-step-sarsa
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.3"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: n 步 SARSA
description: 观察延迟备份如何在一步 SARSA 与 Monte Carlo 回报之间插值。
outline: deep
---

# n 步 SARSA

<a id="return"></a>
## 可调的目标

视野为 $n$ 时，$(S_t,A_t)$ 的目标是

$$G_t^{(n)}=R_{t+1}+\gamma R_{t+2}+\cdots+\gamma^{n-1}R_{t+n}+\gamma^nQ(S_{t+n},A_{t+n}).$$

评估器等待所需观测到达后才更新；若回合更早结束，会清空待处理队列而不虚构引导项。

<a id="tradeoff"></a>
## 偏差与方差

小 $n$ 更多依赖当前估计，通常方差较低；大 $n$ 使用更多真实奖励并接近 MC。比较“目标”和“n 步回报”列，而不只看最终策略。

在[实验](/zh-Hans/labs/ch07-temporal-difference)中试用 $n=1$、$n=3$ 以及超过回合上限的视野。
