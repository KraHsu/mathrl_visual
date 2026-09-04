---
id: ch09-policy-gradient-theorem
translation_key: ch09-policy-gradient-theorem
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: a3267df282564117dea38dd9e21ca336e009956d
source_pdf_sha256: 60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d
source_sections: "9.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "The policy-gradient theorem"
description: Follow the log-derivative route from an expectation to a score-weighted action value.
outline: deep
---

# The policy-gradient theorem

<a id="log-derivative"></a>

## The log-derivative identity

For a positive probability $p_\theta(x)$,

$$
\nabla_\theta p_\theta(x)=p_\theta(x)\nabla_\theta\log p_\theta(x).
$$

Applying this identity moves the derivative onto a log probability. The resulting expression can be sampled because it is an expectation under the policy's own action distribution.

<a id="discounted"></a>

## Discounted policy gradient

At a high level, the theorem says

$$
\nabla J(\theta)=\mathbb E\left[\nabla_\theta\log\pi_\theta(A\mid S)\,q_\pi(S,A)\right],
$$

with the state weighting determined by the selected objective. The theorem identifies a direction; it does not provide the exact action value for free.

<a id="sampled"></a>

## Turning the theorem into a row

Replace $q_\pi(S,A)$ by a sampled return $G$. For the lab's softmax row, the three displayed factors are:

1. score: $e_A-\pi(\cdot\mid S)$;
2. scalar weight: $G$ or $G-b(S)$; and
3. parameter update: $\alpha$ times their product.

The numerical table lets you multiply these values by hand.

<a id="baseline-invariance"></a>

## Baseline invariance

If $b(S)$ does not depend on the sampled action, then

$$
\mathbb E[\nabla\log\pi(A\mid S)b(S)]=0,
$$

because the action probabilities sum to one. The expectation is unchanged, while finite-sample variance may shrink.

<a id="next"></a>

Continue to the [REINFORCE update](./reinforce).
