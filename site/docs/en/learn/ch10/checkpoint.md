---
id: ch10-checkpoint
translation_key: ch10-checkpoint
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 10 checkpoint"
description: Calculate one TD target, advantage, actor update, and importance ratio.
outline: deep
---

# Chapter 10 checkpoint

::: warning Scope
The arithmetic below concerns one finite transition and does not prove convergence.
:::

<a id="td"></a>

## 1. TD target

Let $r=2$, $\gamma=0.9$, and the next value be $0$ because the transition is terminal. Then the target is $2$; if the current critic value is $0.4$, $\delta=1.6$.

<a id="advantage"></a>

## 2. Advantage actor update

With action probabilities $(0.6,0.4)$ and selected action 0, the score is $(0.4,-0.4)$. For $\alpha_\theta=0.1$ and advantage $1.6$, the actor increment is $(0.064,-0.064)$.

<a id="ratio"></a>

## 3. Importance ratio

If the target probability is $0.6$ and behavior probability is $0.3$, then $\rho=2$. The off-policy scalar signal doubles before the score is applied.

<a id="next"></a>

Open the [Actor–Critic lab](/en/labs/ch10-actor-critic) and inspect these fields in one row.
