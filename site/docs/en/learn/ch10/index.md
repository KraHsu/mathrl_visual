---
id: ch10-overview
translation_key: ch10-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 10: Actor–critic methods"
description: Combine a policy actor with an incremental value critic and make every information path inspectable.
outline: deep
---

# Chapter 10: Actor–critic methods

Policy gradients provide the actor's direction but need a value-like signal. Actor–critic methods pair that actor with a critic that estimates values online. The companion lab uses an original two-decision chain so QAC, A2C, off-policy correction, and a deterministic boundary can be compared row by row.

::: info Original companion note
This is an original bilingual guide to the pinned chapter topics. It does not redistribute source prose, figures, proofs, examples, questions, or code.
:::

<a id="learning-goals"></a>

## Learning goals

1. trace the actor and critic updates in one transition;
2. distinguish QAC's action-value critic from A2C's advantage signal;
3. explain why off-policy learning needs an importance ratio; and
4. state what changes when a deterministic actor is used.

<a id="chapter-map"></a>

## Route through the chapter

```text
QAC → baseline/advantage (A2C) → off-policy importance sampling →
deterministic policy gradient → implementation boundaries
```

Each extension changes the information available to the actor or critic. It should not silently change the environment or the meaning of a reported reward.

<a id="lab-preview"></a>

## Open the laboratory

In the [Actor–Critic lab](/en/labs/ch10-actor-critic), keep seed `5eed` and sample one episode. The trace shows $r$, bootstrap target, TD error $\delta$, advantage, actor score, critic update, behavior probability $\mu$, target probability $\pi$, and $\rho=\pi/\mu$.

<a id="boundary"></a>

## A finite-run boundary

The chain is intentionally tiny. A finite run demonstrates update order and estimator plumbing; it is not evidence that an arbitrary actor–critic implementation converges.

<a id="next"></a>

Continue to [QAC](./qac).
