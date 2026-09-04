---
id: ch03-factors
translation_key: ch03-factors
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: How discount, rewards, and dynamics shape optimal behavior
description: Analyze how planning horizon, reward transformations, terminal conventions, and stochastic transitions change values and greedy policies.
outline: deep
---

# How discount, rewards, and dynamics shape optimal behavior

An optimal policy is never optimal in isolation. It is optimal for a particular discount factor, reward definition, transition model, and terminal convention. Change one of those inputs and the Bellman equation describes a different decision problem.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. predict how $\gamma$ changes the relative influence of delayed outcomes;
2. identify reward transformations that preserve policy rankings under stated assumptions;
3. explain why adding a constant can change behavior in variable-length episodic tasks; and
4. reason about route changes caused by stochastic wind or hazards.

<a id="three-inputs"></a>

## Three inputs enter every action backup

Write

$$
q_v(s,a)
=\sum_{s',r}p(s',r\mid s,a)
[r+\gamma v(s')].
$$

The maximizing action can change through three distinct channels:

- **discount:** $\gamma$ changes the weight of all continuation values;
- **reward:** the numbers attached to outcomes change immediate and future returns; and
- **dynamics:** $p(s',r\mid s,a)$ changes which outcomes are likely.

When comparing experiments, change one channel at a time and expose the complete numeric backups. Otherwise a changed arrow cannot be attributed to a specific model change.

<a id="discount-example"></a>

## Discounting changes planning horizon

Consider two deterministic choices from state $x$:

- action early terminates immediately with reward $2$;
- action delayed gives reward $0$ now, reaches $y$, then yields reward $3$ one step later.

Their returns are

$$
q(x,\text{early})=2,
\qquad
q(x,\text{delayed})=3\gamma.
$$

The delayed option is preferred when $\gamma>2/3$, ties at $2/3$, and loses below $2/3$. Nothing about the transition graph changed; only the relative weight of later reward did.

At $\gamma=0$, $T_*v$ ignores $v$ and selects the largest expected immediate reward. As $\gamma$ approaches one, distant consequences matter more and the contraction error bound becomes less sharp because $1/(1-\gamma)$ grows.

<a id="reward-effects"></a>

## Reward design changes the objective, not merely the display

Increasing a goal reward can make a long route worthwhile. Making hazard entry more negative can favor a longer but safer route. Making every ordinary movement costly can favor fewer steps. These are changes to the optimization target, so a changed policy can be the correct response rather than instability.

Positive scaling is the simplest ranking-preserving transformation. If every reward is replaced by

$$
r'=\alpha r,
\qquad \alpha>0,
$$

then every return and value is multiplied by $\alpha$, so action ordering is unchanged whenever the original returns are well defined. A negative scale reverses preferences and is not invariant.

<a id="affine-invariance"></a>

## When an affine reward transformation preserves policies

In a continuing discounted MDP where every trajectory contributes one reward at every time step forever, let

$$
r'=\alpha r+\beta,
\qquad \alpha>0.
$$

Then, for any policy,

$$
G'
=\sum_{t=0}^{\infty}\gamma^t(\alpha R_{t+1}+\beta)
=\alpha G+\frac{\beta}{1-\gamma}.
$$

The additive term is the same for every policy and state under this convention. Consequently,

$$
v_*'=\alpha v_*+\frac{\beta}{1-\gamma}\mathbf 1,
$$

and optimal policy rankings are preserved. The assumptions—continuing rewards at every time index, common $\gamma<1$, and positive $\alpha$—are part of the statement.

This result should not be shortened to “adding a constant never changes a policy.” Terminal conventions determine how many shifted rewards are actually accumulated.

<a id="episodic-caveat"></a>

## Why the site's terminating Grid World is different

The shared Grid World defaults to `GoalMode::Terminate`: after goal entry, the episodic return stops. If an episode lasts $T$ transitions, adding $\beta$ changes its return by

$$
\beta\sum_{t=0}^{T-1}\gamma^t
=\beta\frac{1-\gamma^T}{1-\gamma},
$$

which depends on episode length.

An original two-route counterexample makes the issue explicit. Suppose “short” terminates after one zero-reward transition, while “long” terminates after two zero-reward transitions. Originally both returns are zero. Add $+1$ to every emitted reward. The short return becomes $1$, while the long return becomes $1+\gamma>1$ for $\gamma>0$. The same constant changed the preference because the two episodes contain different numbers of rewards.

One can model terminal states as continuing absorbing states with a transformed reward convention, but that is a different return definition unless the post-terminal rewards are handled consistently. The lab must display the active goal mode rather than silently applying a continuing-task invariance to a terminating task.

<a id="dynamics"></a>

## Wind changes action reliability

With no wind, requesting “right” in the shared Grid World produces the intended cardinal action with probability one. At wind probability $w$, the implementation assigns

$$
1-\frac{3w}{4}
$$

to the requested cardinal action and $w/4$ to each of the other three cardinal actions. Thus at the guided $w=0.2$, the intended action has probability $0.85$ and each alternative has probability $0.05$. “Stay” remains a deterministic self-loop.

The action backup must average all those outcomes before comparing actions. A short route beside a hazard or boundary may have high value when deterministic but lower expected value under wind because rare deviations are costly. The optimal response can be a route with more steps but greater clearance.

<a id="detours"></a>

## Diagnose route changes systematically

When an optimal arrow changes after a parameter edit:

1. record the old and new $\gamma$, reward vector, goal mode, and wind probability;
2. inspect every outcome probability for the affected state-action rows;
3. recompute the complete expected backup for each competing action;
4. compare the numeric margin, not only the chosen arrow; and
5. determine whether the change is a true crossing, a tie within tolerance, or a display-rounding artifact.

In the default 4×4 world, hazards $s_6$ and $s_9$ penalize **entry** but do not terminate the episode. That distinction matters: the value of starting on a hazard cell need not itself contain the hazard-entry penalty. Read the reward rule on transitions, not as a permanent state label.

<a id="self-check"></a>

## Self-check

1. Why does multiplying all rewards by $3$ preserve action rankings?
2. Why can adding $+1$ fail to preserve rankings under `GoalMode::Terminate`?
3. At wind $w=0.4$, what probabilities apply to the requested cardinal action and each other cardinal action?

::: details Check your answer
A positive scale multiplies every well-defined return by the same positive factor. In a terminating variable-length episode, an additive shift is accumulated a route-dependent number of times. At $w=0.4$, the requested action has probability $1-3(0.4)/4=0.70$, and each of the other three cardinal actions has probability $0.10$.
:::

<a id="chapter-links"></a>

## Continue through Chapter 3

Apply all three factors in the [Chapter checkpoint](./checkpoint), or compare them directly in the [Bellman optimality Grid World lab](/en/labs/bellman-optimality-grid).

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
