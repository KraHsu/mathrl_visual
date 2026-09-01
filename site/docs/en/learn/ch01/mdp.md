---
id: ch01-mdp
translation_key: ch01-mdp
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Finite Markov decision processes
description: Assemble states, actions, joint outcomes, and discounting into an MDP, then test whether a state is Markov.
---

# Finite Markov decision processes

A Markov decision process (MDP) is a contract for a sequential decision problem. It states what the agent can observe, which actions it may choose, and how the environment responds. Once that contract is explicit, different policies can be compared without silently changing the task.

<a id="finite-mdp-tuple"></a>

## One compact finite-MDP convention

For this companion, a finite discounted MDP is written as

$$
\mathcal M=
(\mathcal S,\{\mathcal A(s)\}_{s\in\mathcal S},\mathcal R,p,\gamma).
$$

Its components are:

- a finite state space $\mathcal S$;
- a finite set of available actions $\mathcal A(s)$ for each state $s$;
- a finite set $\mathcal R$ of possible immediate reward values;
- a joint outcome model $p(s',r\mid s,a)$; and
- a discount factor $\gamma$ used by the return objective.

A reproducible episodic task also needs an initialization rule and termination semantics. Some textbooks put a transition kernel and reward function in separate tuple positions; others include an initial-state distribution or terminal set. These are compatible notation choices only after every symbol's meaning is stated.

<a id="joint-outcome-model"></a>

## Model next state and reward together

The joint outcome model is

$$
p(s',r\mid s,a)
=\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a).
$$

For every valid $(s,a)$, its row must satisfy

$$
p(s',r\mid s,a)\geq 0,
\qquad
\sum_{s'\in\mathcal S}\sum_{r\in\mathcal R}p(s',r\mid s,a)=1.
$$

This representation does not assume that next state and reward are conditionally independent. From it we can derive the transition model and expected immediate reward:

$$
P(s'\mid s,a)=\sum_r p(s',r\mid s,a),
$$

$$
\bar r(s,a)=\sum_{s',r}r\,p(s',r\mid s,a).
$$

Two outcomes may reach the same next state but emit different rewards, so merging them too early can discard information.

<a id="markov-state-sufficiency"></a>

## A state must be sufficient for one-step prediction

Let $H_t$ denote everything observed before time $t$. A state representation is Markov for this task when

$$
\Pr(S_{t+1},R_{t+1}\mid H_t,S_t,A_t)
=p(S_{t+1},R_{t+1}\mid S_t,A_t).
$$

In words: once the current state and action are known, extra history should not improve the model's prediction of the next state and reward.

The Markov property belongs to the **chosen representation**, not just to the physical system. If an overheating motor changes the next transition but `motor_status` is omitted from the state, two identical-looking states can have different futures. Adding the relevant status can restore sufficiency.

<a id="model-vs-policy"></a>

## The model and the policy have different owners

The MDP model $p(s',r\mid s,a)$ describes the environment's response after an action. A policy

$$
\pi(a\mid s)=\Pr(A_t=a\mid S_t=s)
$$

describes the agent's action selection. Combining them induces one-step behavior under that policy:

$$
\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s)
=\sum_{a\in\mathcal A(s)}\pi(a\mid s)p(s',r\mid s,a).
$$

Changing the policy changes how often actions are requested. It does not rewrite the environment model. Changing the model defines a different task, even if the policy table is unchanged.

<a id="worked-example"></a>

## Original example: an indoor courier at a junction

Use a state representation

$$
s=(\text{location},\text{parcel status},\text{motor status}).
$$

At the east junction, while carrying a parcel with a cool motor, action `east` has these outcomes:

| Next state | Reward | Probability |
| --- | ---: | ---: |
| locker, delivered, cool | $4$ | $0.6$ |
| junction, carrying, cool | $-1$ | $0.3$ |
| junction, carrying, hot | $-3$ | $0.1$ |

The probabilities are nonnegative and sum to $1$. The row therefore defines a valid joint outcome distribution for this state-action pair. Notice that motor status is part of the next state. If future movement depends on heat but the state stored only location and parcel status, the representation would hide predictive information and would generally fail the Markov check.

A policy might request `east` with probability $0.8$ and `wait` with probability $0.2$. Those numbers belong to $\pi$, not to the outcome row above.

The [state-transition unit](./transitions) studies one part of this contract. The [returns unit](./returns) explains how $\gamma$ evaluates a resulting trajectory. The [Grid World concept lab](/en/labs/ch01-gridworld) lets you inspect a smaller deterministic or stochastic instance.

<a id="self-check"></a>

## Self-check

1. A machine adds an extra failure penalty on every third failed movement, but the state stores no failure counter. Is the state generally Markov?
2. If two joint outcomes have probabilities $0.55$ and $0.25$, what probability must a third and final outcome have?
3. Does changing $\pi(a\mid s)$ change $p(s',r\mid s,a)$?

::: details Check your answers
The state is not generally Markov because the omitted failure count changes the next reward law; adding the relevant counter or phase can repair it. The final probability must be $0.20$. Changing the policy does not change the environment outcome model.
:::
