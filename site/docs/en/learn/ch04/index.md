---
id: ch04-overview
translation_key: ch04-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 4: Value iteration and policy iteration"
description: Compare value iteration, policy iteration, truncated policy iteration, and generalized policy improvement in a known model.
outline: deep
---

# Chapter 4: Value iteration and policy iteration

Chapter 3 gave us a contraction and an optimal fixed point. This chapter turns that mathematics into planning procedures. The common setting is deliberately narrow: a finite discounted Markov decision process whose transition and reward model is already known. Because the model is available, a browser can calculate every action backup rather than waiting for sampled experience.

::: info Content boundary
This is an unofficial original companion. It follows the topic order of the book without reproducing its prose, proofs, figures, tables, examples, questions, or code. Topic locations refer to the [fixed upstream version](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%204%20Value%20Iteration%20and%20Policy%20Iteration.pdf), whose SHA-256 is recorded in this page's metadata.
:::

<a id="scope"></a>

## The boundary of this chapter

The three algorithms in this chapter all alternate two ideas:

1. **evaluate or update values**, and
2. **improve or update a policy**.

Value iteration performs one Bellman optimality backup at a time. Policy iteration evaluates a policy to its fixed point before improving it. Truncated policy iteration stops the inner evaluation after a finite number of sweeps. Generalized policy iteration (GPI) names the larger pattern rather than one additional algorithm.

The algorithms assume access to the complete joint one-step model $p(s',r\mid s,a)$. They are therefore dynamic-programming procedures. “Model-based reinforcement learning” is a related but different phrase: a model-based learner estimates that model from data. Chapter 5 begins the model-free path; this chapter does not simulate data collection or claim that a model was learned.

<a id="learning-goals"></a>

## Learning goals

By the end of the chapter, you should be able to:

1. turn the Bellman optimality operator into a synchronous value-iteration loop;
2. explain why a value-iteration intermediate vector need not be the value of any policy;
3. separate policy evaluation from policy improvement and state the policy-iteration stopping test;
4. reason about exact, iterative, and finite-depth policy evaluation;
5. locate value iteration and policy iteration at the two ends of truncated policy iteration;
6. use the generalized-policy-iteration lens without mistaking it for a single algorithm;
7. choose stopping criteria that distinguish convergence from a work budget;
8. audit ties, terminal states, stochastic outcomes, and synchronous updates; and
9. state precisely what “known model” contributes—and what it does not prove about learning from data.

<a id="concept-thread"></a>

## One thread from a fixed point to a planner

```text
Bellman optimality equation v*=T*v
  └─ choose an initial value or policy
       ├─ value iteration: one T* backup, then repeat
       ├─ policy iteration: evaluate π exactly, then improve π
       └─ truncated PI: evaluate π for a finite depth, then improve π
            └─ generalized policy iteration: value and policy updates interact
                 └─ all three require a known one-step model in this chapter
```

The arrows describe information flow, not a promise that every intermediate number is a state value. That distinction is especially important for value iteration and finite-depth policy evaluation.

<a id="algorithm-map"></a>

## Algorithm map

| Procedure | Outer object | Value work before improvement | Typical stopping signal | What the current vector means |
| --- | --- | ---: | --- | --- |
| [Value iteration](./value-iteration) | $v_k$ | one optimality backup | Bellman residual or update size | an iterate of $T_*$; not necessarily $v_\pi$ |
| [Policy iteration](./policy-iteration) | $\pi_k$ | solve $v_{\pi_k}$ | no strict greedy change | an evaluated policy value |
| [Truncated policy iteration](./truncated-policy-iteration) | $(\pi_k,v_k)$ | $j_{\text{eval}}<\infty$ fixed-policy sweeps | outer residual/policy test | an approximation unless the inner solve is exact |
| [Generalized policy iteration](./generalized-policy-iteration) | value–policy pair | any sound partial evaluation/improvement schedule | schedule-specific | depends on the chosen schedule |

The same action-backup ledger can support all three concrete algorithms. What changes is how many times the fixed-policy or optimality operator is applied, when a policy is read, and which stopping condition is reported.

<a id="shared-model"></a>

## The shared 4×4 laboratory model

The companion lab reuses Chapter 1's 4×4 Grid World: state $0$ starts in the upper-left, state $15$ is a terminating goal, states $6$ and $9$ are hazards, and actions are up/right/down/left/stay. The baseline has no wind, rewards $(-0.04,-1,-1,+1)$ for ordinary boundary, hazard, and goal events as defined by the earlier chapter, and $\gamma=0.9$.

The model is intentionally exposed rather than hidden behind arrows. For each requested action, the engine lists every actual outcome, probability, successor, reward, and boundary collision. The planner first takes the expectation over those outcomes and only then compares requested actions. A 20% wind preset changes the outcome ledger, not the decision timing.

<a id="assumptions"></a>

## Assumptions and notation

Unless a unit says otherwise, assume a finite state set, finite nonempty action sets at nonterminal states, bounded rewards, a known normalized joint law $p(s',r\mid s,a)$, and $0\leq\gamma<1$. Terminal states have a fixed continuation value of zero under the site's terminating convention.

For a candidate vector $v$, write the action backup and the two operators as

$$
B_v(s,a)=\sum_{s',r}p(s',r\mid s,a)\,[r+\gamma v(s')],
\qquad
(T_*v)(s)=\max_a B_v(s,a),
$$

$$
(T_\pi v)(s)=\sum_a\pi(a\mid s)B_v(s,a).
$$

Value iteration applies $T_*$. Policy evaluation applies $T_\pi$ while holding $\pi$ fixed. Policy improvement reads the maximizing action set of a value vector. Keeping these roles separate makes the later trace auditable.

<a id="read-next"></a>

## Choose a first algorithm

Start with [Value iteration](./value-iteration) if you want to see one synchronous optimality backup become a complete loop. Continue to [Policy iteration](./policy-iteration) to see why solving a fixed policy can reduce the number of outer improvements, then use [Truncated policy iteration](./truncated-policy-iteration) to place both procedures on one axis. The [planning lab](/en/labs/ch04-planning-grid) runs the three schedules over the same model.

Chapter 4 pages: [Overview](/en/learn/ch04/) · [Value iteration](/en/learn/ch04/value-iteration) · [Policy iteration](/en/learn/ch04/policy-iteration) · [Truncated PI](/en/learn/ch04/truncated-policy-iteration) · [GPI and model boundary](/en/learn/ch04/generalized-policy-iteration) · [Summary](/en/learn/ch04/summary) · [Q&A](/en/learn/ch04/q-and-a) · [Checkpoint](/en/learn/ch04/checkpoint) · [Lab](/en/labs/ch04-planning-grid)
