---
id: ch01-overview
translation_key: ch01-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.1-1.9"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 1: From interaction to a decision model"
description: Build a concept map of states, actions, transitions, policies, rewards, returns, episodes, and MDPs.
outline: deep
---

# Chapter 1: From interaction to a decision model

Reinforcement learning studies a continuing loop: an agent observes its current situation, selects an action, receives a next state and reward from the environment, and then decides again. Chapter 1 is not yet about finding the “best” action. Its job is to make every part of that loop precise.

::: info Course identity and content boundary
This is an unofficial, independent original bilingual interactive textbook. You do not need to read the upstream book first to complete this chapter. Its learning goals, explanations, examples, figures, exercises, and code are independently authored here; the upstream book is used only for topic reference and link alignment. This site is not affiliated with or endorsed by the authors or publisher and does not redistribute book prose, figures, tables, questions, or code. Topic alignment points to a [fixed upstream version](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%201%20Basic%20Concepts.pdf).
:::

<a id="learning-goals"></a>

## Learning goals

By the end of this chapter, you should be able to:

1. describe a finite task with a state space $\mathcal S$ and action sets $\mathcal A(s)$;
2. separate the environment dynamics $p(s'\mid s,a)$ from the policy $\pi(a\mid s)$;
3. explain why an immediate reward is not the same as a long-term objective;
4. calculate ordinary and discounted returns from a trajectory;
5. distinguish trajectories, episodes, goal states, and terminal states;
6. check whether a state representation has the Markov property; and
7. assemble these objects into a finite Markov decision process (MDP).

<a id="concept-map"></a>

## One thread connects the concepts

```text
current state s_t
  └─ policy π(a|s) selects action a_t
       └─ environment produces next state s_{t+1} and reward r_{t+1}
            └─ repeated steps form a trajectory
                 └─ rewards across time form a return G_t
                      └─ termination rules divide trajectories into episodes
```

Two types of object must stay separate:

- a **decision rule**, such as $\pi(a\mid s)$, belongs to the agent;
- a **response rule**, such as $p(s'\mid s,a)$ or a reward rule, belongs to the environment.

The environment can be stochastic and the policy can be stochastic, but those two sources of randomness mean different things. Every later algorithm relies on this boundary.

<a id="learning-path"></a>

## Current learning path

| Unit | Question to answer now | Status |
| --- | --- | --- |
| [States and actions](./state-action) | What information describes “now,” and what can the agent do? | Implemented |
| [State transitions](./transitions) | How does the environment produce a next state after an action? | Implemented |
| [Policies](./policies) | How can a decision rule be written as action probabilities? | Implemented |
| [Rewards](./rewards) | How can feedback be designed without encouraging short-sighted behavior? | Implemented |
| [Trajectories and returns](./returns) | How do we evaluate consequences spread across time? | Implemented |
| [Episodes and termination](./episodes) | Where does a trajectory stop, and must a goal terminate? | Implemented |
| [MDPs and Markov states](./mdp) | How do we turn the whole task into a checkable model? | Implemented |
| [Chapter checkpoint](./checkpoint) | Can all concepts be applied to a new task? | Implemented |

Read in table order or open the [Grid World concept lab](/en/labs/ch01-gridworld) at any point and switch among its world, transition, policy, reward, return, episode, Markov, and audit views. The lab uses an independently designed 4×4 world and computes its live model locally in Rust/Wasm.

<a id="checkpoint"></a>

## Check before entering the lab

Consider an indoor delivery robot. Which facts belong in its state?

- its grid position;
- its battery level, if battery affects the next move;
- a door's open/closed flag, if that changes reachable cells; and
- elapsed time only when time changes future rules.

The criterion is not whether a fact is easy to record. Ask instead: after the current state and action are known, is more history still needed to predict the next step?
