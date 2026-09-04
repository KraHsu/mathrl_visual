---
id: ch10-a2c
translation_key: ch10-a2c
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Advantage actor–critic (A2C)"
description: Replace a raw action value with a TD-error advantage and reason about baseline variance.
outline: deep
---

# Advantage actor–critic (A2C)

<a id="baseline"></a>

## State baseline

A state value $V(s)$ is an action-independent baseline. Subtracting it from an action value preserves the expected policy-gradient direction while often reducing finite-sample variance.

<a id="advantage"></a>

## TD error as an advantage estimate

The one-step estimate used here is

$$
\widehat A_t=\delta_t=r_{t+1}+\gamma V(s_{t+1})-V(s_t).
$$

The actor uses $\widehat A_t$ and the critic moves $V(s_t)$ toward the same target. In a longer implementation, eligibility traces or multi-step returns can refine this estimate.

<a id="comparison"></a>

## QAC versus A2C

QAC weights the actor by $Q(s,a)$; A2C weights it by an advantage estimate. The two traces can therefore have different scale and variance even when they visit the same transition.

<a id="next"></a>

Continue to [off-policy actor–critic](./off-policy).
