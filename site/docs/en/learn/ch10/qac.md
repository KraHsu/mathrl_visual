---
id: ch10-qac
translation_key: ch10-qac
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Q actor–critic (QAC)"
description: Pair a softmax actor with an action-value critic and inspect the coupled updates.
outline: deep
---

# Q actor–critic (QAC)

<a id="actor"></a>

## Actor update

QAC uses the action-value estimate as the scalar weight:

$$
\theta\leftarrow\theta+\alpha_\theta\,\nabla\log\pi_\theta(a\mid s)\,Q(s,a;w).
$$

For a softmax actor, the score is a one-hot vector minus the probability row.

<a id="critic"></a>

## Critic update

The action-value critic can use a one-step SARSA-style target:

$$
\delta=r+\gamma Q(s',a';w)-Q(s,a;w),
\qquad
w\leftarrow w+\alpha_w\delta\nabla_wQ(s,a;w).
$$

The terminal bootstrap is zero. Showing it explicitly avoids accidentally valuing a terminal self-loop.

<a id="trace"></a>

## Read the trace

The lab records the actor probability before the action, the sampled action, the critic value before the update, and both parameter deltas. Update order is part of the reproducible contract.

<a id="next"></a>

Continue to [A2C](./a2c).
