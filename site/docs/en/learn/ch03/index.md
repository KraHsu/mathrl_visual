---
id: ch03-overview
translation_key: ch03-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_sections: "3.1-3.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 3: Optimal values and the Bellman optimality equation"
description: Move from evaluating one fixed policy to comparing actions, defining optimal values, solving the Bellman optimality equation, and recovering optimal policies.
outline: deep
---

# Chapter 3: Optimal values and the Bellman optimality equation

Chapter 2 asked what a specified policy is worth. Chapter 3 makes the policy a decision variable: among all admissible ways to act, which return is best from each state? The Bellman optimality equation answers by replacing a policy-weighted action average with a state-wise maximum.

::: info Content boundary
This is an unofficial original companion. It follows only the topic order of the book and does not reproduce its prose, proofs, figures, tables, examples, questions, or code. Topic locations refer to a [fixed upstream version](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%203%20Optimal%20State%20Values%20and%20Bellman%20Optimality%20Equation.pdf).
:::

<a id="scope"></a>

## The boundary of this chapter

The central objects are the optimal state value $v_*$, optimal action value $q_*$, optimality operator $T_*$, and policies greedy with respect to optimal values. We establish why the optimality fixed point is unique in a finite discounted model and why a greedy policy recovers it.

We use repeated Bellman optimality backups to inspect value propagation, but we do **not** present a complete planning-algorithm comparison here. Value iteration, policy iteration, stopping rules as algorithms, pseudocode traces, and their computational tradeoffs belong to Chapter 4. Here, a sweep is evidence about an operator and its fixed point.

<a id="learning-goals"></a>

## Learning goals

By the end of the chapter, you should be able to:

1. compute $q_\pi(s,a)$ from a known $v_\pi$ and use it to improve a policy;
2. define $v_*$ and $q_*$ without assuming that the optimal policy is unique;
3. derive the Bellman optimality equation from action-conditioned one-step returns;
4. explain why maximizing over action distributions can be reduced to maximizing over actions;
5. prove that $T_*$ is a $\gamma$-contraction in the infinity norm for $0\leq\gamma<1$;
6. turn an optimal value function into deterministic or stochastic optimal policies;
7. interpret Bellman residuals as certified error bounds; and
8. predict how discounting, rewards, and transition dynamics can change an optimal policy.

<a id="concept-thread"></a>

## One thread from evaluation to control

```text
evaluate a fixed policy π to obtain v_π
  └─ hold the first action fixed to obtain q_π(s,a)
       └─ prefer actions whose q_π exceeds the current policy average
            └─ optimize over every policy to define v_* and q_*
                 └─ write the one-step optimum as v_*=T_*v_*
                      ├─ contraction gives one unique optimal value
                      └─ argmax actions recover one or many optimal policies
```

The maximum changes the character of the equation. For a fixed policy, $T_\pi$ is affine in $v$ and can be written as one linear system. The action selected by $T_*$ may differ from state to state and may change as $v$ changes, so $T_*$ is generally nonlinear even though each individual action backup is affine.

<a id="learning-path"></a>

## Learning path

| Unit | Question to answer | Main object |
| --- | --- | --- |
| [Policy improvement](./policy-improvement) | How can the value of taking one different action reveal a better policy? | $q_\pi(s,a)$ |
| [Optimal values](./optimal-values) | What does “best” mean state by state? | $v_*,q_*$ |
| [Optimality equation](./optimality-equation) | How does one-step optimization become a fixed-point equation? | $T_*v$ |
| [Contraction](./contraction) | Why is there one optimal value and why do backups approach it? | $\|T_*u-T_*v\|_\infty$ |
| [Greedy policies](./greedy-policies) | How does an optimal value yield an optimal decision rule? | $\arg\max_a q_*(s,a)$ |
| [Model factors](./factors) | How can $\gamma$, rewards, or wind change the answer? | model sensitivity |
| [Chapter checkpoint](./checkpoint) | Can one original model connect improvement, optimality, residuals, and ties? | integrated derivation |
| [Bellman optimality Grid World lab](/en/labs/bellman-optimality-grid) | Can every maximizing backup be audited in the shared 4×4 world? | interactive $T_*$ |

<a id="assumptions"></a>

## Working assumptions and notation

Unless a section explicitly says otherwise, the model has a finite state set; every nonterminal decision state has a finite, nonempty action set; terminal states have fixed zero continuation value; rewards are bounded; the joint one-step law $p(s',r\mid s,a)$ is known; and the discount factor satisfies

$$
0\leq\gamma<1.
$$

For any candidate value function $v$, define the action backup

$$
B_v(s,a)=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v(s')\right],
$$

and the optimality operator

$$
(T_*v)(s)=\max_a B_v(s,a).
$$

The joint outcome distribution matters: it permits the immediate reward and successor state to be statistically coupled. Terminal successor values are zero under the site's default terminating convention, while the reward on entry to a terminal state is still counted.

The restriction $\gamma<1$ is not a minor technical preference. It is what supplies the contraction argument used in this chapter. Some undiscounted episodic models are also well behaved, but they require stronger properness or transience assumptions and are outside the guarantee stated here.

<a id="read-next"></a>

## Begin with one safe improvement

Continue to [Policy improvement](./policy-improvement) to see how action values expose a better decision without yet solving the full optimality equation. Or open the [shared Grid World lab](/en/labs/bellman-optimality-grid) and keep the action-backup table beside the derivation.

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
