---
id: ch05-q-and-a
translation_key: ch05-q-and-a
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 5 Q&A"
description: Short original answers about Monte Carlo returns, visit strategies, exploring starts, epsilon-greedy policies, and evidence.
outline: deep
---

# Chapter 5 Q&A

Use these questions as retrieval practice. An answer that depends on a seed, horizon, visit filter, or policy family should name that dependency.

::: info Original companion note
The questions and answers are original. They follow the upstream chapter's topic scope without reproducing its prose, figures, examples, or question list.
:::

<a id="q1"></a>

## What is Monte Carlo estimation?

It is estimation from random samples. In this chapter the sample is a complete discounted return from an episode, and the estimate is a mean over returns credited to a state or state–action key. It is not the exact expectation obtained by enumerating a transition model.

<a id="q2"></a>

## How does a sample mean differ from a model-based mean?

A model-based mean sums every possible outcome weighted by its probability. A sample mean averages outcomes that happened. The former is exact for the supplied distribution; the latter has statistical error that generally shrinks with more suitable samples.

<a id="q3"></a>

## Why is mean estimation relevant to values?

For a fixed policy, $q_\pi(s,a)$ is the expected discounted return after taking $(s,a)$. Each observed suffix return is one sample of that random variable. Estimating $q_\pi$ is therefore a collection of mean-estimation problems, one key at a time.

<a id="q4"></a>

## What does MC Basic change in policy iteration?

It replaces model-based policy evaluation with episode returns. It usually credits only the initial state–action pair, averages repeated returns for that pair, and then improves a policy from the current $Q$ estimates. The policy-iteration analogy describes the schedule; it does not make the estimates exact.

<a id="q5"></a>

## What are initial-, first-, and every-visit?

Initial-visit credits only the pair at which the episode starts. First-visit credits the first occurrence of each distinct pair in that episode. Every-visit credits every occurrence. They differ in sample count and correlation, so a result must report which filter was used.

<a id="q6"></a>

## What is the exploring-starts condition?

It is a coverage requirement: every legal state–action pair can be selected as an episode start with positive probability, and a long run supplies enough starts for useful estimates. This lab makes it auditable with a deterministic cycle over 75 non-terminal pairs; that is an experimental scheduler, not a natural start distribution in a deployed environment.

<a id="q7"></a>

## Why compute returns backward?

Starting with $G=0$ at the terminal boundary and applying $G\leftarrow R_{t+1}+\gamma G$ gives every suffix return in linear time. It avoids repeatedly summing overlapping tails and makes it clear whether a final step was naturally terminal or merely cut off by a time limit.

<a id="q8"></a>

## Does every-visit always improve accuracy?

No. It uses more observations from each episode, but repeated suffixes can be correlated. More credited samples improve information use in some settings, yet finite-sample error depends on variance, dependence, policy changes, and coverage—not just a larger count.

<a id="q9"></a>

## Why can ε-greedy remove exploring starts?

A soft policy gives every legal action positive probability at each visited state. Over sufficiently rich episodes, this allows many pairs to be discovered from ordinary starts. It removes forced pair selection; it does not guarantee quick or uniform coverage.

<a id="q10"></a>

## Is a fixed-ε policy globally optimal?

Usually the precise statement is “optimal within the specified ε-greedy family,” assuming enough data. A positive ε intentionally takes non-greedy actions, so the policy need not maximize value over all policies. If ε is annealed, the policy family and data distribution change over time.

<a id="q11"></a>

## Can one episode visit every state–action pair?

It can, in a sufficiently connected environment and with a sufficiently long soft-policy trajectory, but it need not. A single successful trace is evidence of possibility, not a coverage guarantee for all seeds or future runs. Report the actual counts.

<a id="q12"></a>

## Does wind let the agent choose after seeing the outcome?

No. The agent samples an action from its policy first; the environment then samples the next state and reward. MC uses the realized outcome in the return. A planner may know the wind distribution, but a model-free update does not take a maximum separately for each realized outcome.

<a id="q13"></a>

## What should “converged” mean in an MC UI?

It should be qualified by an episode budget, seed, visit strategy, termination rule, and policy schedule. A stable arrow can mean that recent samples happened to agree; it is not by itself a fixed-point residual or a proof of optimality.

<a id="q14"></a>

## What evidence makes a run reproducible?

Store the algorithm mode, discount, ε schedule, visit filter, start protocol, seed, episode cap, realized steps and rewards, and update order. Replaying those fields should reproduce the finite trace. A different seed is a different sample experiment, not automatically a bug.

<a id="read-next"></a>

## Continue

Use the [checkpoint](./checkpoint) to compute a complete return ledger by hand, then open the [Monte Carlo lab](/en/labs/ch05-monte-carlo) and compare the same questions against live data.
