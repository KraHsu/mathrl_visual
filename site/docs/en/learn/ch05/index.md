---
id: ch05-overview
translation_key: ch05-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.1-5.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 5: Monte Carlo methods"
description: Learn how episodic returns turn model-free experience into value estimates, then compare MC Basic, exploring starts, and epsilon-greedy control.
outline: deep
---

# Chapter 5: Monte Carlo methods

Chapter 4 planned with a complete transition model. Chapter 5 removes that convenience. The agent now receives episodes of experience and estimates values from the returns that actually occurred. This is the first model-free turn in the book: the environment may still be stochastic, but the learner does not need a table of transition probabilities in order to update an action value.

::: info Content boundary
This is an unofficial original companion. It follows the upstream chapter's topic order without reproducing its prose, proofs, figures, tables, examples, questions, or code. Topic locations refer to the [fixed upstream version](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%205%20Monte%20Carlo%20Methods.pdf); the PDF SHA-256 is recorded in this page's metadata.
:::

<a id="scope"></a>

## What changes when the model disappears

In a known model, a planner can calculate an expectation by enumerating every successor. In a model-free Monte Carlo (MC) method, an episode supplies one noisy sample of that expectation. For a state–action pair visited at time $t$, the discounted return is

$$
G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\cdots .
$$

The learner averages many observed $G_t$ values. It does not claim that one return is the true value. The law of large numbers explains why the average can become useful when the samples are generated under the assumptions being used.

The chapter builds a ladder:

```text
mean of iid samples
  └─ return samples for one state–action pair
       └─ MC Basic: evaluate only the episode's starting pair
            └─ MC Exploring Starts: reuse visits and improve immediately
                 └─ MC ε-greedy: make the policy soft and remove exploring starts
                      └─ exploration ↔ exploitation becomes an explicit tradeoff
```

The arrows describe added sample reuse or a changed policy constraint. They do not turn an episodic sample into a transition model.

<a id="learning-goals"></a>

## Learning goals

By the end of this chapter, you should be able to:

1. distinguish a model-based expectation from a sample mean;
2. compute a discounted return by walking backward through an episode;
3. explain how MC Basic replaces model-based policy evaluation;
4. compare initial-visit, first-visit, and every-visit accounting;
5. state what the exploring-starts condition guarantees and why it is demanding;
6. construct an $\varepsilon$-greedy distribution and sample from it correctly;
7. explain why $\varepsilon$ improves coverage but lowers the best-policy value;
8. separate statistical error, policy improvement, and an episode budget; and
9. audit a reproducible MC trace without pretending that sampled experience is an exact model.

<a id="algorithm-map"></a>

## The algorithm map

| Unit | Main question | Sample usage | Policy requirement |
| --- | --- | --- | --- |
| [Mean estimation](./mean-estimation) | How can samples estimate an expectation? | one sample per observation | none |
| [MC Basic](./mc-basic) | How can policy iteration use returns instead of a model? | initial pair only | starting pair is revisited deliberately |
| [MC Exploring Starts](./exploring-starts) | How can one episode update many pairs? | first- or every-visit | every pair can be selected as a start |
| [MC $\varepsilon$-greedy](./epsilon-greedy) | How can starts be unrestricted? | usually every-visit | a soft policy explores every action |
| [Exploration and exploitation](./exploration-exploitation) | What does $\varepsilon$ buy and cost? | coverage versus concentration | tune or schedule $\varepsilon$ |

The [Monte Carlo lab](/en/labs/ch05-monte-carlo) runs the three concrete schedules on a fixed episodic grid. It displays the sampled episode, return ledger, visit counts, policy probabilities, and random-seed metadata so that an estimate can be reproduced without exposing a hidden model calculation.

<a id="notation"></a>

## Notation and assumptions

Unless a unit says otherwise, $S_t$ and $A_t$ denote the state and action at time $t$, $R_{t+1}$ is the reward emitted by that transition, and an episode terminates at time $T$. The return from a visited pair is

$$
G_t=\sum_{k=0}^{T-t-1}\gamma^kR_{t+k+1},
\qquad 0\leq\gamma\leq1.
$$

For a fixed policy, an action-value estimate can be written as a sample average,

$$
\widehat q_n(s,a)=\frac{1}{N_n(s,a)}
\sum_{i=1}^{N_n(s,a)}G_i(s,a),
$$

where the denominator counts the returns included by the selected visit strategy. If a pair has never been visited, the estimate is undefined rather than magically equal to zero; a UI should make that missing coverage visible.

The strongest convergence statements require episodic returns with finite expectation, sufficient coverage of the relevant pairs, and a policy/data-generation process that matches the estimator. A finite browser run can report an estimate and a confidence-oriented diagnostic, but it cannot promote a small sample error into a theorem.

<a id="known-model-boundary"></a>

## Keep the model boundary visible

The Chapter 1 Grid World can still be used to generate episodes, including its optional wind perturbation. In this chapter, wind is part of the environment's sampling rule; the MC update sees the realized next state and reward, not the probability table. Turning wind on therefore changes the variance and coverage of the return samples, while the learner's update remains a sample average.

The distinction is useful when comparing pages:

| Question | Known-model planner (Chapter 4) | MC learner (Chapter 5) |
| --- | --- | --- |
| What is read from the environment? | every probability and reward row | one realized episode at a time |
| How is a backup formed? | exact expectation over outcomes | observed discounted return |
| Main diagnostic | Bellman residual | visit count, return mean, and sampling error |
| What does a seed control? | usually nothing in a deterministic planner | episode starts, actions, and stochastic outcomes |

<a id="reading-path"></a>

## A safe reading path

Start with [mean estimation](./mean-estimation), then work through [MC Basic](./mc-basic) before looking at the more efficient [exploring-starts](./exploring-starts) update. Next derive the [epsilon-greedy](./epsilon-greedy) probabilities and use [exploration versus exploitation](./exploration-exploitation) to interpret the curves in the lab. Finish with the [summary](./summary), [Q&A](./q-and-a), and [checkpoint](./checkpoint).

Chapter 5 pages: [Overview](/en/learn/ch05/) · [Mean estimation](/en/learn/ch05/mean-estimation) · [MC Basic](/en/learn/ch05/mc-basic) · [Exploring starts](/en/learn/ch05/exploring-starts) · [MC $\varepsilon$-greedy](/en/learn/ch05/epsilon-greedy) · [Exploration/exploitation](/en/learn/ch05/exploration-exploitation) · [Summary](/en/learn/ch05/summary) · [Q&A](/en/learn/ch05/q-and-a) · [Checkpoint](/en/learn/ch05/checkpoint) · [Lab](/en/labs/ch05-monte-carlo)
