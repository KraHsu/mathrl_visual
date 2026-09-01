---
id: ch01-rewards
translation_key: ch01-rewards
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Rewards
description: Treat reward as immediate feedback, distinguish it from return and intent, and identify unsafe reward shaping.
---

# Rewards

A reward is a number emitted by the environment after an action. It is immediate feedback about one transition, not a complete statement of what the designer ultimately wants.

That distinction matters: a learning algorithm can optimize the reward specification it receives, but it cannot recover intentions that were never encoded.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. place $r_{t+1}$ correctly on a transition timeline;
2. represent deterministic and stochastic reward rules;
3. distinguish immediate reward, return, and the intended task objective; and
4. identify common reward-shaping failure modes.

<a id="reward-as-feedback"></a>

## Reward belongs to the transition outcome

Use the following time order:

$$
s_t
\xrightarrow{\;a_t\;}
(s_{t+1},r_{t+1}).
$$

The agent observes state $s_t$, requests action $a_t$, and the environment produces the next state together with reward $r_{t+1}$. This indexing prevents the reward from being mistaken for information available before the action.

In a deterministic environment, a reward rule can be written

$$
r_{t+1}=r(s_t,a_t,s_{t+1}).
$$

Including $s_{t+1}$ makes rules such as “reward entering the goal” explicit. Other notations may average over the next state and write a reward as a function of $(s,a)$; the underlying timing is unchanged.

<a id="reward-model"></a>

## A stochastic reward model

When the same state-action pair can produce different next states or rewards, a joint outcome model is useful:

$$
p(s',r\mid s,a)
=
\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a),
$$

with

$$
p(s',r\mid s,a)\ge 0,
\qquad
\sum_{s',r}p(s',r\mid s,a)=1.
$$

Its expected one-step reward is

$$
\bar r(s,a)
=
\sum_{s',r}r\,p(s',r\mid s,a).
$$

An expectation summarizes one step. It is still not the long-term return of a policy.

<a id="gridworld-reward"></a>

## An original GridWorld comparison

The 4×4 lab uses a deterministic reward rule after the actual transition:

- ordinary move: $-0.04$;
- boundary collision: $-1$;
- entering hazard $s_6$ or $s_9$: $-1$; and
- entering goal $s_{15}$: $+1$.

With wind disabled, compare two six-step trajectories from $s_0$.

The right-edge trajectory avoids hazards:

$$
s_0\rightarrow s_1\rightarrow s_2\rightarrow s_3
\rightarrow s_7\rightarrow s_{11}\rightarrow s_{15}.
$$

For an undiscounted sum, its return is

$$
5(-0.04)+1=0.80.
$$

A second trajectory enters $s_6$:

$$
s_0\rightarrow s_1\rightarrow s_2\rightarrow s_6
\rightarrow s_{10}\rightarrow s_{11}\rightarrow s_{15},
$$

so its undiscounted return is

$$
4(-0.04)-1+1=-0.16.
$$

Both trajectories finish with the same immediate goal reward of $+1$, but their histories and returns differ. The last reward alone cannot evaluate the whole trajectory.

<a id="reward-versus-objective"></a>

## Reward is not the objective by itself

Rewards across time form a return:

$$
G_0
=
\sum_{t=0}^{T-1}\gamma^t r_{t+1}.
$$

A typical policy objective is to make expected return large:

$$
J(\pi)=\mathbb E_\pi[G_0].
$$

The intended objective might be described in words as “reach the goal promptly without entering hazardous cells.” The numeric reward rule is only a specification intended to represent that objective.

Three layers should remain separate:

1. **intent:** the behavior people actually want;
2. **reward specification:** the numbers supplied by the environment; and
3. **optimization objective:** the return an algorithm will later try to increase.

If these layers disagree, stronger optimization can make behavior worse rather than repair the specification.

<a id="reward-shaping-risks"></a>

## Reward shaping and its risks

**Reward shaping** adds intermediate feedback to make useful behavior easier to discover. It can help, but arbitrary bonuses or penalties can also change which policy is preferred.

| Shaping change | Intended effect | Possible failure |
| --- | --- | --- |
| Larger penalty per step | Encourage shorter routes | Encourage unsafe shortcuts or premature termination |
| Bonus for reaching a checkpoint | Provide denser feedback | Encourage cycling through the checkpoint repeatedly |
| Positive reward while remaining at the goal | Emphasize success | Create an unbounded incentive in a continuing task |
| Very large reward scale | Make feedback prominent | Hide smaller safety trade-offs and destabilize later learning |

Some carefully constructed shaping methods have policy-invariance guarantees under stated assumptions. An arbitrary “helpful” reward does not. Test reward rules against loops, shortcuts, boundary cases, and termination semantics before training an agent.

<a id="common-confusions"></a>

## Common confusions

- **Reward versus return:** reward describes one transition; return combines rewards across time.
- **Reward versus permission:** a reward of $-1$ discourages a transition but does not make it impossible.
- **Reward versus moral judgment:** positive and negative are numeric preferences within a task, not universal labels.
- **Goal versus terminal state:** a goal reward does not automatically stop an episode; termination is a separate rule.
- **Shaping versus harmless decoration:** changing rewards can change the task being optimized.

<a id="experiment-connection"></a>

## Experiment connection

Open the [Grid World concept lab](/en/labs/ch01-gridworld), set wind to 0% and discount factor to 1, and apply the configuration.

1. Enter right, right, right, down, down, down. Confirm cumulative return $0.80$.
2. Reset, then enter right, right, down, down, right, down. Confirm that visiting $s_6$ changes cumulative return to $-0.16$.
3. Set $\gamma$ below 1 and repeat. Inspect how the contribution of each later reward is discounted.
4. Explain which part of the experiment is the reward rule and which part is the episode-termination rule.

The lab evaluates trajectories chosen by you. It does not yet train an agent to maximize return.

<a id="check-understanding"></a>

## Check your understanding

1. A trajectory receives rewards $-0.04,-1,+1$. What is its undiscounted return? Does the final $+1$ make every earlier transition good?
2. With $\gamma=0.5$, what is the discounted return of rewards $0,0,+1$?
3. A designer awards $+1$ every time an agent enters a checkpoint. The agent learns to leave and re-enter forever. Is the optimizer disobeying the reward, or exposing a defect in it?

::: details Answers
1. The return is $-0.04$. No; the final immediate reward does not erase the earlier costs.
2. $0+0.5(0)+0.5^2(1)=0.25$.
3. It is exposing a specification defect. Repeated collection was rewarded even though it was not intended.
:::
