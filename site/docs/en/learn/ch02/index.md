---
id: ch02-overview
translation_key: ch02-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_sections: "2.1-2.10"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 2: State values and the Bellman equation"
description: Evaluate one fixed policy through expected return, Bellman equations, matrix form, synchronous sweeps, and action values.
outline: deep
---

# Chapter 2: State values and the Bellman equation

Chapter 1 described individual trajectories and their returns. Chapter 2 asks a different question: before a trajectory has unfolded, what expected return follows from starting in a particular state and then using one specified policy? The answer is a state value. The Bellman equation makes those values self-consistent across one transition.

::: info Content boundary
This is an unofficial original companion. It follows only the topic order of the book and does not reproduce its prose, figures, tables, examples, questions, or code. Topic locations refer to a [fixed upstream version](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%202%20State%20Values%20and%20Bellman%20Equation.pdf).
:::

::: warning Pilot status
The current interactive lab is a focused four-state micro-model that makes every Bellman term easy to audit. It starts the Chapter 2 implementation but does not yet provide the planned Bellman view derived from Chapter 1's shared 4×4 Grid World. Until that integration and human bilingual review are complete, this chapter remains a draft preview.
:::

<a id="scope"></a>

## The boundary of this chapter

Everything here evaluates a **given, fixed policy** $\pi$. We will define $v_\pi$ and $q_\pi$, derive their Bellman expectation equations, and solve for their values. We will not introduce optimal value functions, greedy policy improvement, or value iteration. Those require a different question—how to choose or improve a policy—and belong to later chapters.

This boundary prevents a common naming error. Repeatedly applying the fixed-policy Bellman operator is **iterative policy evaluation**, not value iteration.

<a id="learning-goals"></a>

## Learning goals

By the end of this chapter, you should be able to:

1. distinguish one sampled return $G_t$ from the conditional expectation $v_\pi(s)$;
2. derive the Bellman expectation equation by separating the first reward from the remaining return;
3. construct $r_\pi$ and $P_\pi$ from a fixed policy and environment model;
4. translate $v_\pi=r_\pi+\gamma P_\pi v_\pi$ into a linear system;
5. perform a synchronous Bellman sweep and interpret a Bellman residual;
6. define $q_\pi(s,a)$ and recover $v_\pi(s)$ by averaging action values under $\pi$; and
7. state precisely which policy is being evaluated in every calculation.

<a id="concept-thread"></a>

## One thread from returns to values

```text
one trajectory gives one return G_t
  └─ condition on S_t=s and follow a fixed policy π
       └─ average over all possible futures to obtain v_π(s)
            └─ split off one transition to obtain the Bellman equation
                 ├─ collect every state equation into matrix form
                 ├─ solve the fixed point exactly or by synchronous sweeps
                 └─ condition first on an action to obtain q_π(s,a)
```

The crucial transition is from a realized number to an expectation. Two runs from the same state may have different returns, while the state value remains the expectation of the return distribution induced by the same policy and environment.

<a id="learning-path"></a>

## Learning path

| Unit | Question to answer | Main object |
| --- | --- | --- |
| [State values](./state-values) | What does a state predict before a random future is sampled? | $v_\pi(s)$ |
| [Bellman equation](./bellman-equation) | How can a long-horizon expectation be written using one step and successor values? | $T_\pi v$ |
| [Matrix form](./matrix-form) | How do all state equations become one linear system? | $(I-\gamma P_\pi)v_\pi=r_\pi$ |
| [Policy evaluation](./policy-evaluation) | How can synchronous sweeps approach the fixed point, and how do we measure error? | Bellman residual |
| [Action values](./action-values) | What is the expected return if the first action is fixed separately? | $q_\pi(s,a)$ |
| [Chapter checkpoint](./checkpoint) | Can you evaluate a new fixed-policy model without crossing into optimization? | Integrated check |
| [Bellman policy-evaluation lab](/en/labs/bellman-grid) | Can you inspect every term of a four-state calculation? | Rust/Wasm experiment |

<a id="notation"></a>

## Notation used throughout

For a discounted episodic task,

$$
G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\cdots,
\qquad 0\leq\gamma<1,
$$

and the state-value function under a fixed policy is

$$
v_\pi(s)=\mathbb E_\pi[G_t\mid S_t=s].
$$

The subscript $\pi$ is not decoration. It records which decision rule generates future actions. Changing the policy generally changes the return distribution and therefore changes the values, even when the environment is unchanged.

<a id="read-next"></a>

## Start with the expectation

Continue to [State values](./state-values), or open the [Bellman policy-evaluation lab](/en/labs/bellman-grid) and compare one sweep with the equations as you read.

Chapter 2 pilot pages: [Overview](/en/learn/ch02/) · [State values](/en/learn/ch02/state-values) · [Bellman equation](/en/learn/ch02/bellman-equation) · [Matrix form](/en/learn/ch02/matrix-form) · [Policy evaluation](/en/learn/ch02/policy-evaluation) · [Action values](/en/learn/ch02/action-values) · [Checkpoint](/en/learn/ch02/checkpoint) · [Lab](/en/labs/bellman-grid)
