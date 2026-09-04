---
id: ch04-summary
translation_key: ch04-summary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Chapter 4 summary
description: A compact comparison of value iteration, policy iteration, truncated PI, and the guarantees they share.
outline: deep
---

# Chapter 4 summary

The chapter's algorithms differ mainly in when they spend computation on values and when they change the policy. They all use the same one-step model and the same action-backup primitive.

<a id="core-equations"></a>

## The four equations to keep

For a candidate value $v$,

$$
B_v(s,a)=\sum_{s',r}p(s',r\mid s,a)[r+\gamma v(s')].
$$

The optimality and fixed-policy operators are

$$
(T_*v)(s)=\max_a B_v(s,a),
\qquad
(T_\pi v)(s)=\sum_a\pi(a\mid s)B_v(s,a).
$$

Their fixed points answer different questions:

$$
v_*=T_*v_* \quad\text{and}\quad v_\pi=T_\pi v_\pi.
$$

The first searches over future decisions; the second evaluates one specified decision rule.

<a id="comparison"></a>

## Compare the schedules

| Algorithm | Initial object | Inner value work | Policy read | Meaning of an intermediate vector |
| --- | --- | --- | --- | --- |
| Value iteration | $v_0$ | one $T_*$ backup per round | after every backup | operator iterate; not necessarily a policy value |
| Policy iteration | $\pi_0$ | evaluate $T_\pi$ to a declared fixed-point accuracy | after each evaluation | $v_{\pi_k}$ when evaluation is exact |
| Truncated PI | $\pi_0$ plus $v_0$ | a finite number $J$ of $T_\pi$ backups | after each finite block | approximate unless the inner test passes |

The endpoint slogan is useful only with its qualifications: depth one is Value-Iteration-like under matched initialization, while infinite depth is Policy-Iteration-like under the contraction assumptions. A trace must include initialization, depth, tolerances, and tie rules.

<a id="guarantees"></a>

## Guarantees and labels

Under a finite discounted model with a known normalized transition law, bounded rewards, and synchronous exact arithmetic:

- $T_*$ is a $\gamma$-contraction, so value-iteration iterates converge to the unique $v_*$;
- a greedy improvement from an exactly evaluated policy does not decrease its value;
- a policy that is greedy with respect to its own exact value is optimal; and
- finite-depth or approximate variants need their own error and stopping labels.

“Converged,” “stable,” and “truncated” are not interchangeable UI decorations. They refer respectively to a numerical residual, an outer policy test, and a work limit. A robust report can say, for example, “policy stable; inner residual $8.2\times10^{-7}$” or “outer truncated after 20 improvements.”

<a id="audit-checklist"></a>

## A portable audit checklist

For any planning trace, ask:

1. Is the model version and discount factor recorded?
2. Are all outcome probabilities shown and normalized per requested action?
3. Was the action chosen before the random outcome was revealed?
4. Is the value vector read-only during a synchronous sweep?
5. Are terminal states represented by their boundary condition rather than fake actions?
6. Are all maximizing actions retained when values tie?
7. Which residual is shown, and to which vector does it belong?
8. Does a work cap produce a visible truncated status?
9. If a model is estimated, is the guarantee explicitly about the estimated model?

These questions apply equally to a table, a chart, a Worker message, or a copied share link.

<a id="shared-lab"></a>

## The shared lab in one sentence

The [Chapter 4 planning lab](/en/labs/ch04-planning-grid) runs all three schedules against the same 4×4 Grid World and exposes the model ledger, values, policy masks, residual history, and work counts. Run baseline no-wind first, then use the 20% wind preset to see a dynamics change without changing the decision timing. The Chapter 1 transition/Markov lab offers the same wind prompt as an introductory bridge.

<a id="handoff"></a>

## Handoff

This chapter ends where model access ends. Chapters 5 onward replace exact planning inputs with sampled returns, noisy targets, or learned representations. Keep the GPI question—what is being evaluated, and what is being improved?—even when the answer is no longer a tabular dynamic-programming loop.

<a id="read-next"></a>

## Test yourself

Use the [Q&A](./q-and-a) for quick conceptual checks, then work through the [checkpoint](./checkpoint) without opening the answer blocks. Return to the [planning lab](/en/labs/ch04-planning-grid) only after writing down which counters and residuals you expect to see.
