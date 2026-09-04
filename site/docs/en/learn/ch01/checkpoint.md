---
id: ch01-checkpoint
translation_key: ch01-checkpoint
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
title: Chapter 1 checkpoint
description: Test whether you can model one sequential task with states, policies, transitions, rewards, returns, terminal rules, and an MDP.
outline: deep
---

# Chapter 1 checkpoint

This checkpoint uses one fictional courier task to connect the concepts from Chapter 1. Work through each prompt before opening its answer. The aim is to check whether the model is internally consistent, not to search for a preferred behavior.

::: info Original companion exercise
The scenario, numbers, prompts, and answers on this page are original companion material. They use the topic scope of the book without reproducing its prose, figures, tables, questions, or code.
:::

<a id="scenario"></a>

## Scenario: the archive courier

A small cart moves among four locations in a museum:

- lobby $L$;
- hallway $H$;
- charging bay $C$; and
- archive $A$.

Before the episode ends, the cart observes its location, a battery class in $\{\text{charged},\text{low}\}$, and whether the archive door is locked or unlocked. Battery class changes movement reliability, and the door flag changes whether the cart can enter $A$. Once these current facts and an action are known, earlier locations do not otherwise change the next-step rules.

The available actions depend on the location and include moving to an adjacent location, waiting, and recharging at $C$. Entering $A$ delivers the parcel and ends the episode. Running out of energy enters a separate failure state and also ends the episode. Visiting $C$ does not end the episode.

<a id="state-sufficiency"></a>

## 1. Is the state sufficient?

1. Would location alone be a sufficient state representation?
2. Give a sufficient representation for every nonterminal step.
3. Must the previous action also be stored?
4. Suppose the archive door automatically locks on every odd-numbered step. What must change?

::: details Show the answer
1. No. At the same location, different battery classes change movement outcomes, and different door flags change whether $A$ is reachable.
2. One sufficient representation is
   $$
   s=(\text{location},\text{battery class},\text{door flag}),
   $$
   together with explicit archive-success and energy-failure terminal states.
3. No, not under the stated rules. Once the current tuple and action are known, the previous action adds no predictive information.
4. The odd/even phase affects the next step, so it must be added to the state, for example
   $(\text{location},\text{battery},\text{door},\text{step parity})$. The alternative is to rewrite the environment so that the rule no longer depends on hidden time.
:::

<a id="policy-vs-transition"></a>

## 2. Separate a policy from a transition

At state $s=(H,\text{charged},\text{unlocked})$, suppose a policy uses

$$
\pi(\text{go to }A\mid s)=0.60,
\quad
\pi(\text{go to }C\mid s)=0.30,
\quad
\pi(\text{wait}\mid s)=0.10.
$$

After the action “go to $A$” has been selected, the environment uses

$$
p(A\mid s,\text{go to }A)=0.70,
\qquad
p(H\mid s,\text{go to }A)=0.20,
\qquad
p(C\mid s,\text{go to }A)=0.10.
$$

Explain what the numbers $0.60$ and $0.70$ mean. If no other action can reach $A$ in one step, what is the probability that the next state is $A$ under this policy?

::: details Show the answer
$0.60$ belongs to the agent's policy: it is the probability of selecting “go to $A$” in state $s$. The number $0.70$ belongs to the environment: after that action has already been selected, it is the probability of arriving at $A$.

Under the stated extra condition, both events must happen, so

$$
\Pr(S_{t+1}=A\mid S_t=s)=0.60\times 0.70=0.42.
$$

A random decision rule and a random environment response are two distinct sources of uncertainty.
:::

<a id="probability-normalization"></a>

## 3. Check probability normalization

For a fixed state-action pair, a draft transition row lists

$$
p(A\mid s,a)=0.70,
\qquad
p(H\mid s,a)=0.20,
\qquad
p(C\mid s,a)=q.
$$

1. Find $q$.
2. Another row contains probabilities $0.72$, $0.23$, and $0.11$. Is it valid?
3. What two conditions must every transition row satisfy?

::: details Show the answer
1. The probabilities for the fixed $(s,a)$ must sum to one, so $q=1-0.70-0.20=0.10$.
2. No. The second row sums to $1.06$. It is not a probability distribution and should be rejected or corrected at its source, rather than silently accepted by the simulator.
3. Every entry must be nonnegative, and the probabilities over all possible next states must sum to one:
   $$
   p(s'\mid s,a)\ge 0,
   \qquad
   \sum_{s'\in\mathcal S}p(s'\mid s,a)=1.
   $$
:::

<a id="reward-and-return"></a>

## 4. Distinguish reward from return

Starting at time $t$, one episode produces the following rewards:

| Step | Event | Reward |
| --- | --- | ---: |
| $t\to t+1$ | Move from $H$ to $C$ | $R_{t+1}=-1$ |
| $t+1\to t+2$ | Recharge at $C$ | $R_{t+2}=-2$ |
| $t+2\to t+3$ | Return from $C$ to $H$ | $R_{t+3}=-1$ |
| $t+3\to t+4$ | Enter $A$ and terminate | $R_{t+4}=+8$ |

1. What is the immediate reward after the first transition?
2. What is the undiscounted return from time $t$?
3. Hand-calculate the discounted return when $\gamma=0.5$:
   $$
   G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\gamma^3R_{t+4}.
   $$
4. Why is the final reward alone not a summary of the trajectory?

::: details Show the answer
The first immediate reward is $R_{t+1}=-1$. The undiscounted return is

$$
-1-2-1+8=4.
$$

With $\gamma=0.5$,

$$
\begin{aligned}
G_t
&=-1+0.5(-2)+0.5^2(-1)+0.5^3(8)\\
&=-1-1-0.25+1\\
&=-1.25.
\end{aligned}
$$

A reward describes one transition. A return combines rewards across multiple future transitions, and discounting changes how strongly later rewards contribute. Therefore the positive terminal reward $+8$ does not, by itself, determine either return.
:::

<a id="terminal-and-goal"></a>

## 5. Classify goals and terminal states

Classify each location or condition below as a goal, a terminal state, both, or neither:

1. archive $A$, where the parcel is delivered and the episode ends;
2. charging bay $C$, which may help complete the delivery but does not end the episode; and
3. the energy-failure state, which ends the episode without delivering the parcel.

::: details Show the answer
- Archive $A$ is both a goal and a terminal state.
- Charging bay $C$ may be a useful intermediate objective, but it is not terminal under these rules.
- Energy failure is terminal but is not a goal.

“Goal” describes a desired task outcome. “Terminal” describes where an episode stops. They often coincide, but neither term implies the other.
:::

<a id="assemble-mdp"></a>

## 6. Assemble the MDP

Match each modeling question to the object that answers it:

| Modeling question | Object to provide |
| --- | --- |
| What situations can occur? | ? |
| What may the cart request in each situation? | ? |
| What can happen after a request? | ? |
| What immediate feedback accompanies a transition? | ? |
| How are later rewards weighted? | ? |
| Where can an episode begin and end? | ? |

Finally, decide whether the policy from Exercise 2 is part of the environment dynamics or a separate decision rule applied to the same environment.

::: details Show the answer
The task needs:

1. a state space $\mathcal S$, including sufficient nonterminal states and the terminal outcomes;
2. state-dependent action sets $\mathcal A(s)$;
3. a transition kernel $p(s'\mid s,a)$;
4. a reward rule, or an equivalent joint description of next state and reward;
5. a discount factor $\gamma$ when discounted return is used; and
6. an initial-state rule and terminal-state set for the episodic task.

Together these objects specify the finite sequential decision environment used here. The policy $\pi(a\mid s)$ remains a separate agent-side decision rule. Changing the policy need not change the transition or reward rules of the MDP.
:::

<a id="completion-criteria"></a>

## Completion criteria

You are ready to leave this checkpoint when you can do all of the following without opening the answers:

- [ ] explain why location alone loses predictive information in the courier task;
- [ ] identify whether a probability belongs to $\pi(a\mid s)$ or $p(s'\mid s,a)$;
- [ ] reject a transition row that is negative or does not sum to one;
- [ ] state the difference between one reward and a return;
- [ ] reproduce the calculation $G_t=-1.25$ for $\gamma=0.5$;
- [ ] give one example of “goal but nonterminal” or “terminal but not goal”; and
- [ ] name the state, action, transition, reward, discount, initial, and terminal parts of the task.

<a id="back-to-lab"></a>

## Back to the experiment

Return to the [Grid World concept lab](/en/labs/ch01-gridworld). Use its numeric transition table to point out the current state, requested action, actual next state, immediate reward, cumulative return, discounted return, and terminal event in one complete run. You can also revisit the [Chapter 1 overview](./) to check the full concept map.
