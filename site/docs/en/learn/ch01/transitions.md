---
id: ch01-transitions
translation_key: ch01-transitions
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: State transitions
description: Distinguish deterministic and stochastic transitions and validate transition distributions.
---

# State transitions

An action expresses the agent's intent; a state transition describes the environment's response. The relationship need not be one-to-one. A boundary, wind, or other dynamics can make the same requested action produce different outcomes.

<a id="transition-kernel"></a>

## Describing the next step with conditional probability

In general, the transition model is written

$$
p(s'\mid s,a)=\Pr(S_{t+1}=s'\mid S_t=s,A_t=a).
$$

For each fixed $(s,a)$, the probabilities over possible next states must satisfy

$$
p(s'\mid s,a)\ge 0,
\qquad
\sum_{s'\in\mathcal S}p(s'\mid s,a)=1.
$$

A deterministic transition is a special case: one next state has probability 1 and every other state has probability 0.

<a id="lab-dynamics"></a>

## Original rules used by this lab

The 4×4 experiment uses these rules:

- without wind, a movement action advances one cell in its requested direction;
- a request that crosses the boundary leaves the state unchanged;
- hazards are reachable and affect reward rather than blocking motion;
- “stay” always preserves the current state;
- with wind enabled, a movement request has some probability of being replaced by a random direction; and
- reaching the goal ends the episode.

These rules define only one of many valid environments. Reinforcement-learning notation does not decide whether a wall is passable or a goal is terminal. Those are modeling choices.

<a id="policy-versus-model"></a>

## Do not merge the policy with the transition model

Compare two conditional probabilities:

| Object | Conditional probability | Question answered | Owner |
| --- | --- | --- | --- |
| Policy | $\pi(a\mid s)$ | Which action will the agent choose in state $s$? | Agent |
| Transition model | $p(s'\mid s,a)$ | Which state will the environment produce after action $a$? | Environment |

A stochastic policy can vary the selected action. A stochastic environment can produce different results for one selected action. In the current lab you choose actions directly, so control is manual; the wind setting changes only the environment transition.

::: tip Reproduce a run
In the [Grid World concept lab](/en/labs/ch01-gridworld), set wind to 40%, record the seed, and enter an action sequence. Reset with the same seed and repeat the actions. Rust's fixed random-number generator will produce the same trajectory.
:::
