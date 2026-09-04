---
id: ch05-mc-basic
translation_key: ch05-mc-basic
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "MC Basic: replace model evaluation with returns"
description: Derive the simplest Monte Carlo policy-iteration variant and inspect its initial-visit, episode-length, and sample-efficiency limits.
outline: deep
---

# MC Basic: replace model evaluation with returns

Policy iteration has a clean two-step story: evaluate the current policy, then improve it. MC Basic keeps the story but swaps the evaluation instrument. Instead of solving a model-based fixed-point equation, it generates episodes and averages the returns observed after the episode's starting state–action pair.

::: info Lab schedule
The browser lab gives **MC Basic** a deterministic lexicographic sweep over the 75 non-terminal state–action pairs. **MC Exploring Starts** uses a separate seeded permutation of those pairs. Both schedules make a seeded run auditable; neither claims that ordinary environments naturally start from every pair. Basic defaults to **initial** (only the forced start pair is credited), while Exploring Starts is intended to expose **first** or **every** visits as well. The engine improves the control policy after each completed episode; `episodes per batch` only controls how many such episodes are generated per button press.
:::

::: info Original companion note
The tiny example and pseudocode below are original explanatory material. They refer to the upstream MC Basic topic without reproducing its algorithm box, figures, prose, or numerical example.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. map model-based policy iteration to its MC replacement;
2. identify the initial-visit choice made by MC Basic;
3. compute an action-value estimate from complete episodes;
4. explain why long episodes and repeated starts affect accuracy; and
5. label a finite run as an estimate rather than an exact policy evaluation.

<a id="policy-iteration-bridge"></a>

## The policy-iteration bridge

For a known model, policy iteration evaluates

$$
v_{\pi_k}=T_{\pi_k}v_{\pi_k},
$$

then computes every action backup $q_{\pi_k}(s,a)$ and improves the policy. A model-free learner cannot perform the expectation in $T_\pi$ directly. It can, however, collect episodes under $\pi_k$ and use their returns as samples of $q_{\pi_k}$.

For an episode beginning at $(S_0,A_0)=(s,a)$, MC Basic records

$$
G_0=R_1+\gamma R_2+\cdots+\gamma^{T-1}R_T,
$$

and updates only the corresponding pair:

$$
N(s,a)\leftarrow N(s,a)+1,
\qquad
Q(s,a)\leftarrow Q(s,a)+\frac{G_0-Q(s,a)}{N(s,a)}.
$$

After enough episodes for that pair, the policy can choose a maximizing action according to the current $Q$ table. The policy-improvement step is therefore model-free, but it is still an improvement step over an estimate.

<a id="initial-visit"></a>

## Why “initial visit” matters

An episode contains many state–action visits, but MC Basic assigns the whole episode's return only to its first pair. If an episode starts at $(s_2,a_\mathrm{east})$ and later visits $(s_2,a_\mathrm{wait})$, the later visit is ignored by this estimator. The choice is intentionally simple: one episode, one return sample, one table entry.

This strategy makes the policy-iteration analogy easy to trace, but it wastes information. The later [exploring-starts](./exploring-starts) page will reuse those same suffixes. “Initial visit” is not a claim that the first visit is statistically superior; it is a sampling rule with a clear cost.

<a id="episode-length"></a>

## Episode length controls what can be learned

Suppose positive reward is available only at a distant terminal state. If every episode is cut off before that state can be reached, all recorded returns may be zero (or only contain intermediate penalties). The resulting $Q$ table can be internally consistent while still failing to reveal the useful route.

Consider an original chain:

```text
start ──1 step──> relay ──1 step──> goal
```

Let the first move cost $-0.1$, the second move deliver $+1$, and let $\gamma=0.9$. A complete episode from `start` has return $-0.1+0.9(1)=0.8$. A one-step truncation sees only $-0.1$. Neither sample is “wrong”; they answer different horizon questions. The learner must record whether an episode terminated naturally or was truncated by a time limit.

<a id="algorithm"></a>

## A transparent MC Basic loop

The following version fixes a deterministic tie rule only for reproducibility; a production learner can retain all ties.

```text
initialize Q(s, a), count(s, a), and a policy π
repeat for each policy round:
  collect episodes from the lab's documented start-pair schedule
  for each episode:
    generate a complete (or explicitly truncated) trajectory under π
    compute its discounted return G from the start
    count(s0, a0) += 1
    Q(s0, a0) += (G - Q(s0, a0)) / count(s0, a0)
  for every state affected by this episode:
    π(s) ← a deterministic representative of argmax_a Q(s, a)
until the episode budget ends
```

The loop has two distinct counters: episodes contribute statistical samples; policy rounds decide when to improve. Combining them into one “iteration” number makes it impossible to tell whether a change came from a new return or a new policy.

<a id="worked-trace"></a>

## Worked trace on one pair

Suppose three complete episodes begin at the same pair and produce returns $0.4$, $1.0$, and $-0.2$. The running table is:

| episode | return $G$ | count $N$ | updated $Q$ |
| ---: | ---: | ---: | ---: |
| 1 | 0.4 | 1 | 0.4 |
| 2 | 1.0 | 2 | 0.7 |
| 3 | -0.2 | 3 | 0.4 |

The estimate after episode three is $(0.4+1.0-0.2)/3=0.4$. A policy improvement that occurs after episode two sees a different estimate than one that waits until episode three. Both schedules can be specified; neither should be silently mixed into the trace.

<a id="limits"></a>

## What MC Basic does not promise

MC Basic is pedagogically useful but sample-inefficient:

- it needs repeated episodes from each pair whose action value matters;
- it discards returns from later visits in the same episode;
- a finite episode budget leaves some pairs unvisited or noisy; and
- a policy changed using an inaccurate estimate may need later correction.

Under sufficient coverage and suitable episodic assumptions, the sample means can approach the corresponding action values. A browser run with 20 episodes, even if its arrows look stable, is not a proof of optimality. Report counts and the generation policy alongside the table.

<a id="lab-connection"></a>

## Read it in the lab

In the [Monte Carlo lab](/en/labs/ch05-monte-carlo), select **MC Basic**, keep the visit strategy at **initial**, and reset. The episode panel should show one credited return per episode and a count that increases only for the start pair. Change the episode cap or seed and observe that the policy can change without any model row changing.

Do not compare MC Basic's sample count directly with Chapter 4's exact backup count. One is a random return observation; the other is a deterministic expectation calculation.

<a id="check-yourself"></a>

## Check yourself

An episode starts at $(s,a)$, visits $(u,b)$ twice, and terminates with discounted return $G=2$. Under MC Basic, which counts change? Only $N(s,a)$ changes, by one; $N(u,b)$ remains unchanged. If your implementation increments all visited pairs, it is implementing a different visit strategy.

<a id="read-next"></a>

## Continue

Read [MC Exploring Starts](./exploring-starts) to reuse later visits and update after each episode. Then compare the coverage requirement with [epsilon-greedy control](./epsilon-greedy).
