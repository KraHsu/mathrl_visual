---
id: ch10-off-policy
translation_key: ch10-off-policy
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "离策略 Actor–Critic"
description: 通过重要性采样比率区分产生数据的行为策略与待优化目标策略。
outline: deep
---

# 离策略 Actor–Critic

<a id="behavior-target"></a>

## 两个策略

令 $\mu$ 产生数据，$\pi$ 是要优化的策略。对行为概率非零的采样动作，修正为

$$
\rho_t=\frac{\pi(a_t\mid s_t)}{\mu(a_t\mid s_t)}。
$$

实验中的行为策略是围绕 actor 贪心动作的 $\varepsilon$-soft 混合。

<a id="weighted-update"></a>

## 加权 actor 信号

离策略 actor 行使用 $\rho_t\widehat A_t$ 作为标量权重。表格同时报告分子和分母，使大更新可以被审计。

<a id="support"></a>

## 支持与截断

若 $\mu(a\mid s)=0$，比率无定义，目标动作也没有支持。实践中应确保支持（例如 ε-soft 行为策略），并明确任何比率截断都是算法选择。

<a id="next"></a>

继续阅读[确定性 Actor–Critic](./deterministic)。
