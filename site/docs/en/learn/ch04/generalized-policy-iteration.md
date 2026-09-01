---
id: ch04-generalized-policy-iteration
translation_key: ch04-generalized-policy-iteration
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.4-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Generalized policy iteration and the model boundary
description: Use the value–policy interaction lens and distinguish known-model planning from model-based and model-free learning.
outline: deep
---

# Generalized policy iteration and the model boundary

Generalized policy iteration (GPI) is a way to name the conversation between two moving targets: a value estimate becomes more consistent with a policy, and a policy becomes more greedy with respect to a value estimate. It is a lens for organizing algorithms, not a fourth implementation that replaces value iteration or policy iteration.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. describe evaluation and improvement as two interacting operators;
2. place value iteration, policy iteration, and truncated PI on that diagram;
3. explain why GPI permits many schedules and approximation choices;
4. distinguish planning with a known model from model-based and model-free learning; and
5. state which convergence guarantees are lost when the model or updates are approximate.

<a id="gpi-loop"></a>

## Two directions of pressure

Let $E$ denote a value update that moves $v$ toward the value of a current policy, and let $I$ denote a policy update that moves $\pi$ toward actions that look greedy under $v$:

```text
                 evaluation pressure
          v  <────────────────────────  vπ
          │                              │
          │                              │
          ▼                              ▲
       improve                         policy π
          └────────────── I ─────────────┘
```

The arrows are conceptual. An implementation may evaluate exactly, take one sweep, use a finite batch, or interleave the two updates at a finer granularity. GPI asks whether the two pressures cooperate toward a self-consistent pair; it does not prescribe one timing or one data source.

At a fixed point of the ideal exact loop,

$$
v=T_\pi v,
\qquad
\operatorname{supp}\pi(\cdot\mid s)\subseteq\arg\max_a B_v(s,a).
$$

The first relation says the value belongs to the policy; the second says the policy is greedy for that value. Together they imply the Bellman optimality fixed point under the finite discounted assumptions.

<a id="three-instances"></a>

## Three schedules on one diagram

| Algorithm | Evaluation pressure | Improvement pressure | Characteristic trace |
| --- | --- | --- | --- |
| Value iteration | one optimality backup $T_*$ | read the greedy action after each backup | no inner policy-evaluation solve |
| Policy iteration | drive $v$ to $v_\pi$ before changing $\pi$ | one complete greedy improvement | long inner block, short outer sequence |
| Truncated PI | a finite block of $T_\pi$ sweeps | greedy improvement after that block | both inner and outer counters matter |

The table is a scheduling classification, not a claim that all implementations have identical intermediate values. In particular, value iteration's vector may not be any policy's value, while policy iteration's exactly evaluated vector is one.

<a id="model-boundary"></a>

## What “model-based” means here

The Chapter 4 planner receives a normalized one-step model:

$$
p(s',r\mid s,a)
$$

for every legal state–action pair. It can enumerate outcomes and calculate expectations without drawing a trajectory. This is dynamic programming with a known model.

Three phrases are easy to conflate:

| Setting | Where $p$ and rewards come from | What the algorithm can audit |
| --- | --- | --- |
| known-model planning (this chapter) | supplied as part of the problem | every probability, reward, backup, and residual |
| model-based RL | estimated from experience, giving $\hat p$ and $\hat r$ | the estimate and its planning result; model error remains |
| model-free RL | no explicit transition model is maintained | sampled returns or temporal-difference targets; no exact model-row audit |

Calling a procedure “model-based” does not mean that its model is exact, and calling a procedure “reinforcement learning” does not imply that it learns a model. The source of the model and the source of the data are separate metadata in a reproducible experiment.

<a id="approximation"></a>

## Approximation changes the guarantee

With an exact model, synchronous updates, finite actions, bounded rewards, and $0\leq\gamma<1$, the contraction and policy-improvement arguments from Chapters 3–4 apply. If the model is replaced by $\hat p,\hat r$, the planner solves the estimated problem:

$$
\hat T_*v(s)=\max_a\sum_{s',r}\hat p(s',r\mid s,a)
 [r+\gamma v(s')].
$$

A small residual for $\hat T_*$ certifies closeness to the estimated fixed point, not automatically to the true environment's fixed point. Sampling noise, model bias, stale parameters, asynchronous writes, and function approximation require additional analysis.

GPI also permits approximate policy improvement. If a policy places probability on actions that are merely within a tolerance of the maximum, the result may be a useful near-greedy policy, but the exact policy-improvement theorem no longer applies verbatim. The tolerance, tie rule, and model version should travel with the result.

<a id="schedules"></a>

## Synchronous is a choice, not a definition

The lab uses synchronous vectors so that every displayed update has a clear source. Other GPI schedules include asynchronous state updates, prioritized backups, and alternating batches. They may reach the same fixed point under suitable conditions, but they have different traces, work profiles, and proofs. A page or experiment should name its schedule rather than treating “iteration” as a universal primitive.

When a worker yields between chunks, preserve the same algorithm state: model version, policy, value vector, outer and inner counters, and random seed (if any). Restarting with a new hidden state halfway through is neither a pause nor a reproducible continuation.

<a id="chapter-boundary"></a>

## The handoff to later chapters

This chapter plans from a model. Later chapters replace one or more ingredients:

- Monte Carlo methods estimate returns from complete sampled episodes;
- temporal-difference methods update from sampled one-step targets;
- stochastic-approximation analysis studies noisy, diminishing-step updates; and
- function-based methods replace a tabular value vector with parameters.

Those methods can still exhibit the GPI pattern—values and policies influence one another—but they do not inherit the exact known-model guarantees simply because the diagram looks similar.

<a id="lab"></a>

## See the boundary in one experiment

The [planning lab](/en/labs/ch04-planning-grid) has a model audit panel. Run a no-wind configuration first, inspect one complete transition row, and then enable the 20% wind preset. The result changes because $p(s',r\mid s,a)$ changed. It is still known-model planning: no trajectory is sampled and no transition model is learned. For the introductory transition/Markov experiment, use its own prompt to enable wind as well; the same distinction between outcome randomness and post-outcome action choice carries across chapters.

<a id="read-next"></a>

## Next: consolidate the three algorithms

Continue to the [summary](./summary) for a compact comparison, then use the [Q&A](./q-and-a) and [checkpoint](./checkpoint) to test whether you can identify the schedule and model boundary from a trace.
