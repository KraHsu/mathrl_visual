---
id: exp-ch01-gridworld-basics
translation_key: exp-ch01-gridworld-basics
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.1-1.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Grid World concept lab
description: Observe states, actions, transitions, rewards, and returns in a Rust/Wasm-powered 4×4 environment.
aside: false
---

# Grid World concept lab

This original 4×4 scenario puts several Chapter 1 concepts into one inspectable trajectory. Every calculation runs inside a Dedicated Worker in the browser, using a Rust core compiled to WebAssembly.

<GridWorldLab locale="en" />

::: tip Guided wind comparison
The lab starts in a deterministic, no-wind baseline. Open **Transition** or **Markov**, read the calm prediction first, and then use the highlighted **Enable 20% wind and reset** button. After the reset, return to the other view: the transition table should now expose several possible actual actions, while the Markov view explains why the hidden wind regime must be part of the state. With the documented seed `5eed`, request **right, right, down, down** after the reset and inspect the trace: the realised actions are reproducibly **right, right, down, left**. The button is intentionally shown in both views so the comparison can be started from either teaching path.
:::

<a id="how-to-read"></a>

## How to read one transition

After each action, interpret the result in this order:

1. the **current state** is the cell before the action, $s_t$;
2. the **requested action** is your intended $a_t$;
3. wind may produce a different **actual action**;
4. the environment maps that action to a next state $s_{t+1}$;
5. the environment emits immediate reward $r_{t+1}$; and
6. the table accumulates rewards into a return and weights each contribution by $\gamma^t$.

The discounted return in this site is

$$
G_0=\sum_{t=0}^{T-1}\gamma^t r_{t+1}.
$$

The lab evaluates a supplied trajectory. It does not learn a policy or introduce the Bellman equation early.

<a id="learning-views"></a>

## Eight views, one live model

The selector above does not load eight unrelated demos. Every view reads or updates the same language-neutral experiment state:

| View | Question it makes inspectable |
| --- | --- |
| World | Where is the agent, and which actions can be requested? |
| Transition | What is the complete $p(s',a_{\mathrm{actual}}\mid s,a_{\mathrm{requested}})$ row? |
| Policy | Does $\pi(\cdot\mid s)$ form a valid distribution, and which action does Rust sample? |
| Reward | Which immediate number is emitted for an ordinary move, collision, hazard, or goal? |
| Return | How do $\gamma^t$ and $r_{t+1}$ contribute to the two running returns? |
| Episode | Does the goal terminate, absorb with zero reward, or allow interaction to continue? |
| Markov | What predictive information is lost when a wind regime is hidden from the state? |
| Audit | Are the live transition, policy, discount, reward, and special-state rules valid? |

Changing language keeps this state and replays the requested actions through the same seeded Rust engine.

<a id="tasks"></a>

## Observation tasks

### Task A: an action is not a displacement

Keep wind at zero and repeatedly request “up” from the start. Explain why the step count and return change while the state does not.

### Task B: reward is not return

Find a path that visits a hazard and eventually reaches the goal. Compare the positive goal reward with the cumulative return of the full trajectory. One positive reward does not erase every earlier cost.

### Task C: reproduce a stochastic transition

Set wind to 40%, record the seed and your action sequence, and repeat after resetting with the same seed. Then change only the seed. Randomness does not imply irreproducibility.

### Task D: separate a policy from wind

In the Policy view, normalize an invalid row, then set “right” to probability 1. Sample the policy with wind first at 0% and then at 40%. The policy controls the requested action; wind controls the actual action.

### Task E: audit state sufficiency

Open the Markov view. Explain why the same visible cell predicts different outcomes under calm and gusty hidden regimes, then state the smallest augmentation that repairs the state.

### Task F: separate a goal from termination

In the Episode view, follow the same right-edge path under all three goal behaviors. After reaching $s_{15}$, request left once more and compare whether the action is rejected, becomes a zero-reward self-loop, or moves to $s_{14}$.

<a id="implementation-note"></a>

## Implementation note

- environment: an original 4×4 Grid World;
- start: $s_0$; goal: $s_{15}$; hazards: $s_6,s_9$;
- wind starts at 0% for deterministic controls; the Transition and Markov views offer a guided 20% wind experiment;
- default ordinary movement reward: $-0.04$; boundary and hazard: $-1$; goal: $+1$; all four can be edited;
- reaching the goal ends the episode;
- one Rust core computes transition distributions, policy sampling, rewards, cumulative return, and discounted return; and
- a complete numeric table and keyboard controls accompany the visual grid.
