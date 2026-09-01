---
id: ch01-state-action
translation_key: ch01-state-action
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.1-1.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: States and actions
description: Learn to define state spaces, action spaces, and state-dependent valid actions.
---

# States and actions

A state is not the physical world itself. It is the **information representation** an agent uses to decide. The same room might be represented only by a robot's position, or by position plus battery level and door status. The right choice depends on which facts change the future.

<a id="state-space"></a>

## The state space

The Chapter 1 lab uses an original 4×4 grid, numbered from left to right and top to bottom:

$$
\mathcal S=\{s_0,s_1,\ldots,s_{15}\}.
$$

State $s_t$ is the agent's cell at time $t$. A hazard remains a reachable state; its meaning is expressed through reward rather than by deleting it from the state space.

This exposes an important modeling choice:

- a **wall** is usually not a reachable state;
- a **hazardous region** can be a state with a costly consequence; and
- a **goal** can be an ordinary, terminal, or absorbing state, but the task must say which.

<a id="action-space"></a>

## The action space

The lab provides five actions: up, right, down, left, and stay. Their shared action set is

$$
\mathcal A=\{\uparrow,\rightarrow,\downarrow,\leftarrow,\circ\}.
$$

When every state accepts all five action requests, asking to move out of bounds is not invalid input. It is an action that the environment must resolve. In this lab the agent stays in the same state and receives a boundary penalty.

An alternative is to define a different $\mathcal A(s)$ at each state and remove out-of-bounds moves. Both choices are legitimate, but they define different MDPs. Documentation and implementation must agree on one meaning.

<a id="representation-check"></a>

## Is the representation sufficient?

Suppose wind direction alternates every step. If the state stores position alone, the same position can have a different next-state distribution on odd and even steps. Position alone is then not sufficient.

There are two common repairs:

1. add wind direction or time phase to the state; or
2. change the task so wind no longer depends on hidden history.

State design is not about retaining every event. It is about compressing the information needed to predict the next step.

::: tip Try it
Open the [Grid World concept lab](/en/labs/ch01-gridworld), set wind to zero, and request an upward or leftward move from $s_0$. Observe why “the action was executed” and “the state changed” are not the same statement.
:::
