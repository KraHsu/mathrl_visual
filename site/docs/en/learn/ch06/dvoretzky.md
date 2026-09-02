---
id: ch06-dvoretzky
translation_key: ch06-dvoretzky
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Dvoretzky-style convergence: an error-process lens"
description: Read the scalar stochastic recursion behind convergence arguments and see how the finite-index extension foreshadows tabular RL proofs.
outline: deep
---

# Dvoretzky-style convergence: an error-process lens

The Robbins–Monro theorem is easier to reuse when its error dynamics are isolated. Let $\Delta_k$ be the distance from the current iterate to its target. A broad scalar template is

$$
\Delta_{k+1}=(1-\alpha_k)\Delta_k+\beta_k\eta_k.
$$

The first term contracts old error; the second injects noise. Dvoretzky-style results state conditions under which contraction wins in the long run.

::: info Original companion note
The decomposition, proof sketch, and finite-index interpretation below are original explanatory material. They reference the upstream convergence topic without reproducing its theorem proof or notation-heavy pages.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. identify drift and noise terms in a stochastic recursion;
2. state the role of conditional mean and variance bounds;
3. explain why both a divergent contraction sum and a finite noise-energy sum matter;
4. follow the squared-error proof idea; and
5. understand why a finite set of coupled coordinates needs a stronger, norm-based statement.

<a id="scalar-template"></a>

## Start with the scalar template

Assume $\alpha_k,\beta_k\geq0$ and let $\mathcal H_k$ contain the history before $\eta_k$ is drawn. A representative set of hypotheses is:

$$
\sum_k\alpha_k=\infty,
\qquad
\sum_k\alpha_k^2<\infty,
\qquad
\sum_k\beta_k^2<\infty,
$$

with

$$
\mathbb E[\eta_k\mid\mathcal H_k]=0,
\qquad
\mathbb E[\eta_k^2\mid\mathcal H_k]\leq C.
$$

Under suitable measurability and boundedness details, these conditions imply $\Delta_k\to0$ almost surely. The theorem is a template, not a license to check only one line of a trace: if a coefficient is random, the sum conditions themselves become random statements.

<a id="drift-noise"></a>

## Separate drift from noise

The expected one-step change, conditioned on history, is

$$
\mathbb E[\Delta_{k+1}-\Delta_k\mid\mathcal H_k]
=-\alpha_k\Delta_k
$$

when the noise is conditionally centered. Thus the drift points toward zero. The conditional variance of the injected part is proportional to $\beta_k^2$; requiring a finite sum of these squares limits the total accumulated noise energy.

This separation is useful when debugging:

| Observation | Likely issue |
| --- | --- |
| average increment stays away from zero | biased noise or wrong target |
| increments never shrink | step size or residual is not diminishing |
| estimate explodes intermittently | variance/curvature bound or sign error |
| error settles into a band | constant step or non-vanishing noise coefficient |

<a id="squared-error"></a>

## Why square the error?

Set $H_k=\Delta_k^2$. Expanding one update yields three kinds of terms:

$$
H_{k+1}-H_k
=-\alpha_k(2-\alpha_k)\Delta_k^2
  +\beta_k^2\eta_k^2
  +2(1-\alpha_k)\beta_k\Delta_k\eta_k.
$$

After conditioning on $\mathcal H_k$, the cross term vanishes when the noise has zero conditional mean. The first term is non-positive once the contraction coefficient is in a stable range; the second is controlled by the variance bound and $\sum\beta_k^2<\infty$. A supermartingale or quasimartingale convergence argument can then show that $H_k$ has a finite limit and that the divergent sum $\sum\alpha_k$ forces that limit to be zero.

This is a proof pattern, not a finite-sample error bar. The browser can display the terms of the expansion, but it cannot establish an infinite almost-sure event from a few hundred iterations.

<a id="rm-application"></a>

## Apply the lens to Robbins–Monro

For a root $g(w^*)=0$, write $\Delta_k=w_k-w^*$. A mean-value expansion gives

$$
g(w_k)-g(w^*)=g'(\xi_k)\Delta_k
$$

for some intermediate point $\xi_k$. The RM update therefore has the form

$$
\Delta_{k+1}
=\bigl(1-a_kg'(\xi_k)\bigr)\Delta_k-a_k\eta_k.
$$

The effective contraction coefficient depends on the current iterate, which is why a result that allows random $\alpha_k$ is more useful than a proof for a fixed sequence alone. Bounds on the slope turn this moving coefficient into a controlled drift.

<a id="finite-index"></a>

## From one coordinate to many

Tabular reinforcement learning has one error per state or state–action pair. For a finite index set $\mathcal S$, a useful schematic extension is

$$
\Delta_{k+1}(s)=\bigl(1-\alpha_k(s)\bigr)\Delta_k(s)+\beta_k(s)\eta_k(s).
$$

The conditions must hold for every $s$, not just for the coordinate that currently has the largest error. A maximum-norm statement such as

$$
\|\mathbb E[\eta_k\mid\mathcal H_k]\|_\infty
\leq\gamma\|\Delta_k\|_\infty,
\qquad 0<\gamma<1,
$$

allows a small state-dependent bias that is dominated by the current global error. A variance bound may grow with $\|\Delta_k\|_\infty$, but it must do so in a controlled way. This is the shape later used when analyzing many interacting value estimates.

<a id="lab-interpretation"></a>

## Interpret the lab responsibly

The [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation) can plot $\Delta_k$, the signed residual, and the finite prefixes of $\sum a_k$ and $\sum a_k^2$. Use those plots to ask:

1. Is the drift pointing toward the target on average?
2. Is the disturbance centered over repeated seeds?
3. Do the increments shrink under the selected schedule?
4. Which theorem hypothesis is not represented by the finite UI?

The last question matters most: no finite plot proves almost-sure convergence, and a clipped or reset run may no longer follow the stated recursion.

<a id="check-yourself"></a>

## Check yourself

If $\Delta_k=2$, $\alpha_k=0.1$, $\beta_k=0.05$, and $\eta_k=-4$, then

$$
\Delta_{k+1}=0.9(2)+0.05(-4)=1.6.
$$

The deterministic contraction contributes $-0.2$ while the noise contributes $-0.2$. Labeling the whole change “noise” hides half of the update.

<a id="read-next"></a>

## Continue

Now reinterpret a gradient as a noisy root observation in [stochastic gradient descent](./stochastic-gradient-descent). The same drift/noise split will explain why SGD can move quickly when far from its optimum and wander more visibly near it.
