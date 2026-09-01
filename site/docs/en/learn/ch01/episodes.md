---
id: ch01-episodes
translation_key: ch01-episodes
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Trajectories, episodes, and termination
description: Separate trajectories from episodes and distinguish goals, terminal states, absorbing states, and continuing tasks.
---

# Trajectories, episodes, and termination

A stream of interaction can be cut into pieces in several ways. Some cuts come from the task itself, while others come only from how we record or test it. Clear termination semantics are essential because they determine which rewards belong to one complete outcome.

<a id="trajectory-vs-episode"></a>

## A trajectory is not necessarily an episode

A **trajectory** is any time-ordered sequence of states, actions, and rewards. It can be a complete run, a short prefix, or a window sampled from the middle of a continuing interaction.

An **episode** is a task-defined unit that starts under an initialization rule and ends when its termination rule fires. Therefore:

- every completed episode contains a trajectory;
- a trajectory prefix need not be a completed episode; and
- a continuing task can produce arbitrarily long trajectories without producing episodes at all.

Suppose a robot is still moving after five steps. The first five transitions form a valid trajectory prefix, but they are not a completed episode unless the task says that step five ends the run.

<a id="terminal-vs-goal"></a>

## “Goal” describes meaning; “terminal” describes control flow

A **goal state** is desirable according to the task designer. A **terminal state** ends the current episode. Those properties often coincide, but neither implies the other.

| Situation | Goal? | Terminal? | Interpretation |
| --- | :---: | :---: | --- |
| Parcel delivered and shift ends | Yes | Yes | Successful terminal outcome |
| Battery irreversibly depleted | No | Yes | Failure terminal outcome |
| One parcel delivered during a route | Yes | No | Desirable checkpoint; work continues |
| Ordinary corridor position | No | No | Intermediate interaction state |

Calling every goal terminal would prevent tasks with multiple checkpoints. Calling every terminal a goal would hide failures and safety stops.

<a id="absorbing-state"></a>

## An absorbing state is a modeling extension

Sometimes a mathematical model continues to describe transitions after an episode has ended. It can add an absorbing state $s_{\mathrm{abs}}$ that always transitions to itself. Under a zero-reward convention,

$$
p(s_{\mathrm{abs}},0\mid s_{\mathrm{abs}},a)=1
$$

for every placeholder action $a$ available there.

An absorbing state and a terminal API are two representations of the same stopping idea, not identical objects. An environment implementation may return `done` and refuse another action. A mathematical extension may instead keep emitting a self-loop. The reward after absorption must be stated explicitly; zero is a convention, not a law of nature.

<a id="episodic-vs-continuing"></a>

## Episodic and continuing tasks

An **episodic task** has a natural or designed stopping rule: finish a maze, complete a delivery, or fail a safety constraint. A new episode then begins under an initialization rule.

A **continuing task** has no natural terminal event in the objective: regulate a building's temperature, balance network traffic, or operate a service indefinitely. We may still stop a simulation after 10,000 steps so a test can finish. That external time limit is a **truncation**, not automatically a terminal event in the modeled task.

This distinction matters when interpreting a [return](./returns): a completed episodic return includes rewards up to termination, while a truncated continuing record is only a finite observation window unless the objective defines otherwise.

<a id="worked-example"></a>

## Original example: a campus courier

Consider a courier with these rules:

1. delivering a parcel at the library is a goal checkpoint, but the route continues;
2. returning to the depot after all parcels are delivered is a successful terminal event;
3. exhausting the battery is a failure terminal event; and
4. for mathematical bookkeeping, either terminal event may transition into a zero-reward absorbing state.

The sequence from depot departure through the first library delivery is a trajectory, not a complete episode. The full sequence ending at the depot or at battery failure is an episode. If researchers stop the simulator at 200 steps despite neither event occurring, they have truncated the run; they have not proved that the courier reached a terminal state.

The current [Grid World concept lab](/en/labs/ch01-gridworld) uses a simpler convention: reaching its diamond goal ends the episode immediately. Its hazard cells are costly but nonterminal.

<a id="self-check"></a>

## Self-check

Classify each statement.

1. A game ends because the agent violates a safety rule.
2. A monitoring script records the first 50 steps of a never-ending controller.
3. A robot reaches one pickup point and continues toward two more.

::: details Check your answers
The safety violation is terminal but not a goal. The 50-step record is a truncated trajectory, not necessarily an episode. The pickup point is a goal or checkpoint but is nonterminal under the stated rules.
:::
