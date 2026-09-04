---
id: ch09-reinforce
translation_key: ch09-reinforce
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.4"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "REINFORCE: sampled policy gradients"
description: Audit a complete sampled update and understand why a baseline changes variance rather than the expected direction.
outline: deep
---

# REINFORCE: sampled policy gradients

<a id="algorithm"></a>

## One finite update

For a sampled context $s$, action $a$, and return $G$, the core recurrence is

$$
\theta_{s,:}\leftarrow\theta_{s,:}+\alpha\,G\,(e_a-\pi_{s,:}).
$$

Only the sampled context row changes. The lab records the untouched rows too, making this locality easy to verify.

<a id="baseline"></a>

## Add a state baseline

With a running estimate $b(s)$, use the advantage-like scalar $A=G-b(s)$:

$$
\theta_{s,:}\leftarrow\theta_{s,:}+\alpha\,A\,(e_a-\pi_{s,:}).
$$

The baseline is updated after the current row is formed, so the displayed row can be audited without an order ambiguity.

<a id="variance"></a>

## What to compare

Keep the seed, reward table, and step size fixed. Compare return variance, advantage variance, entropy, and expected objective. A baseline can reduce the spread of update magnitudes even when its expected gradient is neutral.

<a id="finite-boundary"></a>

::: warning Finite-run boundary
The browser stops at a configured episode budget. “Converged” is only a small latest-update diagnostic; it is not a proof of the theorem's limiting conditions.
:::

<a id="next"></a>

Continue to the [chapter summary](./summary) or open the [lab](/en/labs/ch09-policy-gradient).
