---
id: ch05-checkpoint
translation_key: ch05-checkpoint
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.1-5.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 5 checkpoint"
description: Audit returns, visit filters, coverage, and epsilon-greedy probabilities on one small episodic task before opening the Monte Carlo lab.
outline: deep
---

# Chapter 5 checkpoint

This checkpoint uses a deliberately small episodic task. Calculate first, then open each answer. Keep the sample key, return horizon, visit strategy, and random protocol visible; otherwise a correct-looking average can still be attached to the wrong variable.

::: info Original companion exercise
The task, trajectories, numbers, prompts, and answers are original companion material. They follow Chapter 5's topics without reproducing the upstream prose, figures, examples, questions, or code.
:::

::: warning Model boundary
The hand calculation below gives trajectories directly. It is an exercise in model-free accounting, not a replacement for a transition model or a proof that a finite sample is optimal.
:::

<a id="scenario"></a>

## Scenario and episode rules

There are two nonterminal states $X$ and $Y$, and a terminal state $T$. The discount is $\gamma=0.5$. Available actions are:

| State | Action | Next state | Reward |
| --- | --- | --- | ---: |
| $X$ | go | $Y$ | $0$ |
| $X$ | quit | $T$ | $0.3$ |
| $Y$ | finish | $T$ | $1$ |
| $Y$ | back | $X$ | $-0.2$ |

The learner stores $Q(s,a)$ and a visit count for each legal pair. The terminal state has no action row. Unless a question says otherwise, an episode ends only on entering $T$.

<a id="return-ledger"></a>

## 1. Build the return ledger

Consider this episode:

```text
(X, go), 0, (Y, back), −0.2, (X, go), 0, (Y, finish), +1, terminal
```

Starting at the last decision and moving backward, calculate the suffix return at each of the four visits. Which two visits share the same state–action key?

::: details Show the answer
Set $G=0$ at the terminal boundary. The updates are

$$
G_3=1,
\qquad
G_2=0+0.5(1)=0.5,
$$

$$
G_1=-0.2+0.5(0.5)=0.05,
\qquad
G_0=0+0.5(0.05)=0.025.
$$

The key $(X,\mathrm{go})$ appears at $t=0$ and $t=2$. Their suffix returns differ because the future after the two visits differs.
:::

<a id="visit-counts"></a>

## 2. Apply three visit filters

Using the ledger above, list the credited returns and count increments under **initial**, **first-visit**, and **every-visit** accounting.

::: details Show the answer

| strategy | credited returns by key | count increments |
| --- | --- | --- |
| initial | $(X,\mathrm{go}):0.025$ | $N(X,\mathrm{go}){+}{=}1$ |
| first-visit | $(X,\mathrm{go}):0.025$; $(Y,\mathrm{back}):0.05$; $(Y,\mathrm{finish}):1$ | one for each listed key |
| every-visit | $(X,\mathrm{go}):0.025,0.5$; $(Y,\mathrm{back}):0.05$; $(Y,\mathrm{finish}):1$ | two for $(X,\mathrm{go})$, one for each other key |

The initial strategy credits only the episode's first pair. First-visit ignores the second $(X,\mathrm{go})$ occurrence; every-visit includes it.
:::

<a id="running-means"></a>

## 3. Update the running means

Assume all four $Q$ entries start unvisited. Apply the **every-visit** returns in reverse-scan order and write the final mean for each key.

::: details Show the answer

| key | credited returns | final count | final $Q$ |
| --- | --- | ---: | ---: |
| $(Y,\mathrm{finish})$ | $1$ | 1 | $1$ |
| $(X,\mathrm{go})$ | $0.5,0.025$ | 2 | $(0.5+0.025)/2=0.2625$ |
| $(Y,\mathrm{back})$ | $0.05$ | 1 | $0.05$ |

The update order does not change an exact arithmetic mean when every credited return is included, although it does matter if policy improvement is interleaved between updates. The pair $(X,\mathrm{quit})$ remains unvisited and must not be displayed as an observed zero.
:::

<a id="coverage"></a>

## 4. Inspect coverage

Suppose an exploring-starts scheduler emits the sequence

$$
(X,\mathrm{go}), (Y,\mathrm{finish}), (X,\mathrm{quit}), (Y,\mathrm{back}),
$$

then repeats. Does this satisfy the positive-start-coverage condition? What can a two-episode prefix prove?

::: details Show the answer

The four legal pairs all appear in the cycle, so each has positive frequency under this scheduler. A two-episode prefix covers only the first two emitted pairs; it cannot prove that the remaining pairs have useful estimates. Positive selection probability is an asymptotic/experimental condition, not a certificate that every finite prefix is representative.
:::

<a id="epsilon-row"></a>

## 5. Construct an ε-greedy row

At a state with four legal actions, let the current estimates in action order $(a_1,a_2,a_3,a_4)$ be $(0.8,0.4,0.1,-0.2)$. With the uniform-exploration convention and $\varepsilon=0.2$, write the policy row and verify its sum.

::: details Show the answer

The unique greedy action is $a_1$. Its mass is

$$
1-0.2+0.2/4=0.85,
$$

and each other action has $0.2/4=0.05$. The row is $(0.85,0.05,0.05,0.05)$ and sums to one. A convention that explores only among non-greedy actions would produce a different row and must be labelled separately.
:::

<a id="model-boundary"></a>

## 6. Separate model information from experience

The environment secretly uses a 70% chance of moving in the requested direction and a 30% chance of slipping left. The learner receives only the realized next state and reward. Is an MC return update allowed to multiply by $0.7$ and $0.3$? What metadata should a replay store?

::: details Show the answer

No. Multiplying by those probabilities would be a model-based expectation backup. The MC update uses the realized outcome in the episode's return. A replay should store the seed, configuration, start state (and forced action if applicable), chosen actions, realized states/rewards, termination or truncation flag, visit strategy, and update order. The hidden probabilities may describe the environment for documentation, but they are not inputs to this learner's update.
:::

<a id="audit"></a>

## 7. Final audit

Before accepting a run, answer yes/no:

1. Does every credited return have a state–action key?
2. Do first-visit counts exclude repeated occurrences within an episode?
3. Are unvisited pairs distinguished from observed zero returns?
4. Is ε recorded at the time each action is selected?
5. Are natural termination and time-limit truncation distinct?
6. Can the seed and episode trace reproduce the displayed means?

::: details Suggested answers

All six should be **yes**. If any answer is no, the run may still be useful for debugging, but it is not yet a reproducible MC estimate. In particular, a policy arrow that looks stable cannot repair missing counts or a hidden change in the visit filter.
:::

<a id="lab-transfer"></a>

## Transfer to the lab

Open the [Monte Carlo lab](/en/labs/ch05-monte-carlo). First reproduce the no-wind, fixed-seed baseline; then switch between initial/first/every visit and compare the ledger with the hand calculation. Finally try ε-greedy and the optional wind preset. The wind changes realized samples, not the order “choose an action, then observe the outcome.”

<a id="read-next"></a>

## Continue

Review the [summary](./summary) and [Q&A](./q-and-a) if any counter disagreed. Keep this checkpoint beside the live trace while reading the next chapter's stochastic-approximation updates.
