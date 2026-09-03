---
id: ch07-td-learning
translation_key: ch07-td-learning
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: TD learning of state values
description: Read the one-step TD backup as a stochastic approximation update.
outline: deep
---

# TD learning of state values

<a id="backup"></a>
## One-step backup

Given a policy $\pi$, the Bellman expectation equation suggests the sample target

$$\bar V_t=R_{t+1}+\gamma V_t(S_{t+1}).$$

The TD error is $\delta_t=\bar V_t-V_t(S_t)$ and only the visited entry changes:

$$V_{t+1}(S_t)=V_t(S_t)+\alpha\delta_t.$$

Unvisited states remain untouched. This is the key contrast with a full model-based sweep.

<a id="audit"></a>
## Audit one row

Record $(S_t,R_{t+1},S_{t+1})$, the terminal flag, the old value, target, and error. If the transition is terminal, use target $R_{t+1}$ rather than inventing a value for the goal.

::: tip Try it
Open the [lab](/en/labs/ch07-temporal-difference), choose **TD(0)**, and press **One transition**. The inspector shows exactly the arithmetic above.
:::
