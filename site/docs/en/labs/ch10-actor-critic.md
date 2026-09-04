---
id: exp-ch10-actor-critic
translation_key: exp-ch10-actor-critic
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
title: Actor–Critic lab
description: Trace actor probabilities, critic TD errors, advantages, and off-policy ratios in a tiny chain.
aside: false
outline: deep
---

# Actor–Critic lab

This original companion experiment uses a three-state, two-decision chain. Rust/Wasm runs QAC, A2C, off-policy, or a discrete deterministic analogue in a Worker; Vue keeps actor and critic updates side by side.

::: info Original companion experiment
The chain, controls, trace, questions, and fallback arithmetic are original. They reference Chapter 10 topics without redistributing source prose, figures, examples, questions, or code.
:::

::: warning Finite-run boundary
The trace makes information flow auditable. It is not a convergence proof for actor–critic methods in general.
:::

<ActorCriticLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the chain, TD equations, and manual audit below remain available.
</noscript>

<a id="experiment-question"></a>

## Experiment question

Keep seed `5eed` fixed and compare A2C with off-policy mode. Which scalar reaches the actor: the TD error alone, or the TD error multiplied by $\rho=\pi/\mu$?

<a id="environment"></a>

## Chain environment

From $s_0$, action 0 moves to $s_1$ with reward 0, while action 1 terminates with reward 1. At $s_1$, action 0 terminates with reward 2 and action 1 with reward −1. Terminal bootstraps are zero.

<a id="equations"></a>

## Equations to audit

The one-step critic target and error are

$$
y_t=r_{t+1}+\gamma V(s_{t+1}),\qquad \delta_t=y_t-V(s_t).
$$

A2C uses $\widehat A_t=\delta_t$ in

$$
\Delta\theta=\alpha_\theta\,\widehat A_t\,\nabla_\theta\log\pi(a_t\mid s_t).
$$

Off-policy mode multiplies the scalar by $\rho_t=\pi(a_t\mid s_t)/\mu(a_t\mid s_t)$. QAC instead exposes $Q(s,a)$ as the actor weight.

<a id="manual-fallback"></a>

## Manual fallback

Take a terminal transition with $r=2$, $\gamma=0.9$, and current critic value $0.4$. Then $y=2$ and $\delta=1.6$. With actor row $(0.6,0.4)$, selected action 0, and $\alpha_\theta=0.1$, the score is $(0.4,-0.4)$ and the actor increment is $(0.064,-0.064)$. If $\pi=0.6$ and $\mu=0.3$, the off-policy ratio is $2$.

<a id="questions"></a>

## Questions

1. Is the terminal bootstrap zero in every mode?
2. Does QAC expose an action-value or a state-value critic?
3. Does the ratio use the sampled action's probabilities?
4. Why is the deterministic view labelled an analogue?

<a id="next"></a>

After recording a row, return to the [Chapter 10 map](../learn/ch10/).
