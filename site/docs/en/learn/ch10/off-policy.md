---
id: ch10-off-policy
translation_key: ch10-off-policy
locale: en
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
review_math: draft
review_accessibility: draft
title: "Off-policy actor–critic"
description: See how behavior and target policies are separated by an importance-sampling ratio.
outline: deep
---

# Off-policy actor–critic

<a id="behavior-target"></a>

## Two policies

Let $\mu$ generate data and $\pi$ be the policy being optimized. For a sampled action with non-zero behavior probability, the one-step correction is

$$
\rho_t=\frac{\pi(a_t\mid s_t)}{\mu(a_t\mid s_t)}.
$$

The lab's behavior policy is an $\varepsilon$-soft mixture around the actor's greedy action.

<a id="weighted-update"></a>

## Weighted actor signal

An off-policy actor row uses $\rho_t\widehat A_t$ as its scalar weight. The table reports both numerator and denominator so a large update is explainable rather than hidden.

<a id="support"></a>

## Support and clipping

If $\mu(a\mid s)=0$, the ratio is undefined and the target action is not supported. Practical implementations ensure support (for example with ε-soft behavior) and may clip ratios; any clipping is an algorithmic choice that must be reported.

<a id="next"></a>

Continue to [deterministic actor–critic](./deterministic).
