---
id: ch05-exploring-starts
translation_key: ch05-exploring-starts
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "MC Exploring Starts: spend each episode's visits"
description: Reuse first-visit or every-visit returns, update policies episode by episode, and make the coverage assumption explicit.
outline: deep
---

# MC Exploring Starts: spend each episode's visits

MC Basic deliberately credits only the pair at which an episode begins. Exploring starts keeps the model-free return estimator but asks for two kinds of efficiency: start episodes across state–action pairs, and reuse the visits that appear inside each episode. The result is still a sample-based control method, not a hidden dynamic-programming backup.

::: info Original companion note
The trajectory, counting table, and implementation advice below are original. They explain the upstream exploring-starts topic without reproducing its prose, pseudocode, figures, or examples.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. state the exploring-starts coverage condition;
2. distinguish initial-, first-, and every-visit updates;
3. compute returns efficiently by scanning an episode backward;
4. explain why episode-by-episode policy improvement fits generalized policy iteration; and
5. identify when an apparently well-performing run has unvisited actions.

<a id="coverage-condition"></a>

## What “exploring starts” requires

An exploring-starts scheme chooses an initial state–action pair so that every legal pair has a positive chance of starting an episode. Over a sufficiently long run, each pair must receive enough return samples for its mean to become informative. This is a coverage condition, not a claim that a finite scheduler has already visited every pair.

The condition is easy to state and awkward to enforce in a physical environment: an agent may not be able to teleport to an arbitrary state, and a particular action may be unsafe as an initial move. In this browser lab, the scheduler uses a seeded permutation of the 75 non-terminal state–action pairs, so every pair is selected once per cycle while the order remains reproducible. This is the lab's explicit exploring-starts mechanism, not a natural-start assumption. MC Basic uses a separate lexicographic sweep; its default **initial** visit filter credits only the start pair, whereas this mode is normally compared with **first** or **every** visit accounting.

<a id="visit-strategies"></a>

## Three ways to use visits

Suppose one episode contains the following state–action keys:

```text
(A, east), (B, north), (A, east), (C, wait)
```

The return attached to a key is the suffix return beginning at that occurrence. The strategies differ as follows:

| Strategy | Included occurrences in this episode | Information cost |
| --- | --- | --- |
| initial | only the first key, $(A,\mathrm{east})$ | lowest; the rest is discarded |
| first-visit | first occurrence of each distinct key | one sample per key per episode |
| every-visit | all four occurrences, including both $(A,\mathrm{east})$ visits | highest reuse; samples can be correlated |

“First” means first occurrence **of each pair**, not merely the first pair in the episode. “Every” means every occurrence, even when the same pair loops back to itself. A trace should include the strategy name so that matching counts is possible.

<a id="backward-return"></a>

## Why scan backward

For an episode with rewards $R_1,\ldots,R_T$, initialize $G\leftarrow0$ at the terminal boundary and scan $t=T-1,T-2,\ldots,0$:

$$
G\leftarrow R_{t+1}+\gamma G.
$$

At each visited key $(S_t,A_t)$, apply the selected visit filter and, if included,

$$
N(S_t,A_t)\leftarrow N(S_t,A_t)+1,
\qquad
Q(S_t,A_t)\leftarrow Q(S_t,A_t)+
\frac{G-Q(S_t,A_t)}{N(S_t,A_t)}.
$$

The backward pass computes every suffix return in $O(T)$ time and avoids repeatedly summing overlapping reward tails. It also makes the terminal convention explicit: no reward is invented after $R_T$, and a time-limit truncation must be marked rather than treated as a natural terminal reward.

<a id="worked-episode"></a>

## Worked episode and counts

Use $\gamma=0.5$ and the four-step trajectory below:

| $t$ | state–action | next reward |
| ---: | --- | ---: |
| 0 | $(A,\mathrm{east})$ | 1 |
| 1 | $(B,\mathrm{north})$ | 0 |
| 2 | $(A,\mathrm{east})$ | 2 |
| 3 | $(C,\mathrm{wait})$ | -1 |

The suffix returns are $G_3=-1$, $G_2=2+0.5(-1)=1.5$, $G_1=0+0.5(1.5)=0.75$, and $G_0=1+0.5(0.75)=1.375$. The count contribution is:

| strategy | credited keys | credited returns |
| --- | --- | --- |
| initial | $(A,\mathrm{east})$ | $1.375$ |
| first-visit | $(C,\mathrm{wait}), (A,\mathrm{east}), (B,\mathrm{north})$ | $-1, 1.375, 0.75$ |
| every-visit | all four occurrences | $-1, 1.5, 0.75, 1.375$ |

The table is intentionally ordered backward for the calculation and forward for the key list; the order of display must not change which return belongs to which time step.

<a id="online-improvement"></a>

## Improvement after each episode

Exploring starts can improve the policy immediately after a return is incorporated. At a state $s$ with estimates $Q(s,\cdot)$, choose a deterministic representative of

$$
\arg\max_a Q(s,a),
$$

or retain the full tied set for analysis. Updating after each episode means the next episode may follow a policy that reflects only a small number of samples. That is not a contradiction: it is a generalized-policy-iteration schedule with approximate evaluation.

The schedule should record whether policy improvement happens after every credited visit, after every episode, or after a batch. These choices have different data dependencies even when they eventually produce similar arrows.

<a id="algorithm"></a>

## A reproducible exploring-starts loop

```text
initialize Q and count for every legal (s, a)
initialize a policy π and a start scheduler covering every pair
for each episode:
  choose (s0, a0) from the deterministic exploring-starts scheduler
  generate a trajectory under π, forcing a0 at t = 0
  G ← 0
  for t from T−1 down to 0:
    G ← reward[t] + γG
    if the visit filter includes (state[t], action[t]):
      count[state[t], action[t]] += 1
      update the running mean Q[state[t], action[t]]
    improve π at affected states after the episode's credited updates
```

A deterministic start schedule is convenient for testing, but it is not the same as an uncontrolled environment's natural start distribution. Store both the requested start and the realized first transition in the trace.

<a id="failure-modes"></a>

## Coverage and correlation failure modes

Exploring starts does not make every estimate good automatically:

- a short run can leave pairs with count zero;
- a rare pair can have a high-variance return mean;
- every-visit samples from one trajectory can be correlated; and
- a policy that changes too quickly can alter the distribution of later returns.

The right response is to expose coverage and sampling assumptions, not to fill missing values with a model-derived answer. If the lab offers a “coverage audit,” treat it as a report of counts, not a certificate of optimality.

<a id="lab-connection"></a>

## Read it in the lab

Open the [Monte Carlo lab](/en/labs/ch05-monte-carlo), select **MC Exploring Starts**, and compare **first-visit** with **every-visit** under the same seed and episode budget. Every-visit should credit at least as many occurrences in the trace; it need not have lower finite-sample error because its returns can be correlated. Turn on the wind preset only after recording the no-wind baseline, so a changed estimate can be attributed to both sampling dynamics and seed metadata.

<a id="check-yourself"></a>

## Check yourself

An episode visits $(X,a)$ three times and $(Y,b)$ once. How many samples enter each pair?

| strategy | $(X,a)$ | $(Y,b)$ |
| --- | ---: | ---: |
| initial, if the first key is $(X,a)$ | 1 | 0 |
| first-visit | 1 | 1 |
| every-visit | 3 | 1 |

If a trace says “first-visit” but records three $(X,a)$ returns, either the label or the accounting is wrong.

<a id="read-next"></a>

## Continue

The exploring-starts condition is powerful but difficult to guarantee in deployed environments. Read [MC $\varepsilon$-greedy](./epsilon-greedy) to replace forced starts with a soft policy that keeps actions discoverable.
