---
id: ch05-summary
translation_key: ch05-summary
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 5 summary"
description: Keep the Monte Carlo estimation chain, visit strategies, coverage conditions, and epsilon tradeoff in one auditable map.
outline: deep
---

# Chapter 5 summary

Monte Carlo methods replace an unavailable expectation with averages of sampled returns. The chapter's three control algorithms share that statistical primitive but differ in which visits they credit and how they maintain coverage.

::: info Original companion note
This summary is original companion material. It compresses the upstream topic order without reproducing its prose, figures, tables, examples, questions, or code.
:::

<a id="core-chain"></a>

## The core chain

$$
\text{episode}
\longrightarrow
\text{return }G_t
\longrightarrow
\text{visit-filtered sample mean }\widehat q(s,a)
\longrightarrow
\text{policy improvement}.
$$

The return is a random variable. A finite mean is an estimate, even when the policy arrows look stable. The model-free claim is about what the learner reads: realized rewards and successor states, not a supplied transition distribution.

<a id="comparison"></a>

## Compare the three MC control schedules

| Algorithm | Start rule | Visit rule | Improvement rule | Main burden |
| --- | --- | --- | --- | --- |
| MC Basic | deterministic lexicographic 75-pair sweep | initial visit by default | greedy after each completed episode | one credited sample per episode |
| MC Exploring Starts | seeded permutation, explicit forced pair | first- or every-visit | greedy after each completed episode | enforce starts and coverage |
| MC $\varepsilon$-greedy | ordinary state starts | usually every-visit | best fixed-ε distribution | persistent exploration cost |

These labels describe a schedule, not an implementation language. A run must also state the discount factor, termination/truncation rule, seed, episode budget, and tie policy.

<a id="estimators"></a>

## Estimator facts to retain

For returns $G_1,\ldots,G_n$ credited to the same pair,

$$
\widehat q_n=\frac1n\sum_{i=1}^{n}G_i,
\qquad
\widehat q_{n+1}=\widehat q_n+\frac{G_{n+1}-\widehat q_n}{n+1}.
$$

Under iid finite-variance assumptions the sample mean is unbiased and its variance scales as $1/n$. Visits from one trajectory may be correlated, and a changing policy may change the return distribution, so the iid formula must not be presented as an unconditional confidence interval.

<a id="epsilon"></a>

## The epsilon tradeoff

With $m$ legal actions, a unique greedy representative under the standard uniform-exploration convention receives

$$
1-\varepsilon+\frac{\varepsilon}{m},
$$

while each other action receives $\varepsilon/m$. Increasing ε improves the chance of discovering alternatives but lowers the immediate exploitation mass. A fixed positive ε can be optimal only within the constrained soft-policy family; an annealed schedule changes both the policy and the data-generating process.

<a id="audit"></a>

## Portable audit checklist

Before accepting a result, verify:

1. each credited sample has a precise state–action key and suffix return;
2. the visit strategy matches the recorded counts;
3. unvisited pairs are marked missing, not silently assigned zero;
4. episode termination and time-limit truncation are distinguished;
5. the start distribution or exploring-starts scheduler is recorded;
6. ε and tie handling are recorded for every policy update;
7. seed and replay metadata reproduce the finite trace; and
8. “converged” is qualified by sample budget and policy family.

<a id="chapter-bridge"></a>

## Bridge to the next chapters

Chapter 4 computed exact expectations from a known model. Chapter 5 estimates returns from episodes. Later stochastic-approximation and temporal-difference methods change how updates are weighted or bootstrapped; they do not erase the need to state what data entered an estimate.

The [Monte Carlo lab](/en/labs/ch05-monte-carlo) places the three schedules side by side. Start with no wind, capture a seeded baseline, and only then enable the optional wind preset. The wind changes realized samples; it is not a license to choose an action after observing an outcome.

<a id="quick-recall"></a>

## Quick recall

| Phrase | Precise reading |
| --- | --- |
| model-free | no supplied transition model is required by the update |
| Monte Carlo | use complete sampled returns (or an explicitly marked truncation) |
| exploring starts | every state–action pair is selectable as an episode start with positive coverage |
| first-visit | first occurrence of each pair in an episode |
| every-visit | every occurrence of each pair |
| soft policy | positive probability for every legal action |
| ε-greedy | a specified soft-policy construction favouring a greedy representative |

<a id="read-next"></a>

## Continue

Use the [Q&A](./q-and-a) for short conceptual checks, then solve the [checkpoint](./checkpoint) without opening the answers until your counters and return ledger agree.
