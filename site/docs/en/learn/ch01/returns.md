---
id: ch01-returns
translation_key: ch01-returns
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Trajectories and returns
description: Turn a sequence of transitions into ordinary and discounted returns, and interpret the discount factor.
---

# Trajectories and returns

One transition tells us what happened next. A trajectory records what happened across several steps. A **return** then turns the rewards on that trajectory into one number. Keeping those three levels separate prevents a common mistake: one large reward is not automatically a good long-term result.

<a id="trajectory-record"></a>

## A trajectory is a time-ordered record

A finite trajectory beginning at time $t$ can be written as

$$
\tau_{t:T}=(s_t,a_t,r_{t+1},s_{t+1},a_{t+1},r_{t+2},\ldots,s_T).
$$

The index on $r_{t+1}$ matters. It is the reward observed **after** action $a_t$ takes the system from $s_t$ toward $s_{t+1}$. The trajectory keeps every transition visible; it has not yet decided how those rewards should be combined.

For a finite trajectory, giving every reward equal weight is the $\gamma=1$ case of the return:

$$
G_t\big|_{\gamma=1}=\sum_{k=0}^{T-t-1} r_{t+k+1}.
$$

Ordinary return gives every recorded reward the same weight, whether it arrives on the next step or much later.

<a id="discounted-return"></a>

## Discounting changes the weight of time

A discounted return uses a discount factor $\gamma$:

$$
G_t
=\sum_{k=0}^{T-t-1}\gamma^k r_{t+k+1},
\qquad 0\leq\gamma\leq 1.
$$

- $\gamma=0$ retains only the next reward.
- A larger $\gamma$ gives later rewards more influence.
- For a finite trajectory, $\gamma=1$ recovers the ordinary return.
- For an indefinitely continuing sum, choosing $\gamma<1$ is one common way to keep bounded rewards from accumulating without limit. Other continuing-task objectives also exist.

The discount factor changes how a trajectory is **evaluated**. It does not change the environment's transition probabilities, and it does not by itself change which rewards were observed.

<a id="worked-example"></a>

## Worked example: a warehouse delivery

Consider an original three-step delivery record. A cart spends energy leaving its dock, earns a delivery reward, and then parks safely:

$$
(r_{t+1},r_{t+2},r_{t+3})=(-2,5,1).
$$

The ordinary return is

$$
G_t\big|_{\gamma=1}=-2+5+1=4.
$$

With $\gamma=0.5$, each later reward has half the weight of the previous time offset:

| Offset $k$ | Reward $r_{t+k+1}$ | Weight $\gamma^k$ | Contribution |
| ---: | ---: | ---: | ---: |
| 0 | $-2$ | $1$ | $-2$ |
| 1 | $5$ | $0.5$ | $2.5$ |
| 2 | $1$ | $0.25$ | $0.25$ |

Therefore,

$$
G_t=-2+2.5+0.25=0.75
\qquad(\gamma=0.5).
$$

Both answers are correct; they answer different evaluation questions. The ordinary return says that the whole finite record nets $4$. The discounted return says that, under this chosen time weighting, the later gains offset the immediate cost by only $0.75$.

<a id="return-recursion"></a>

## The same sum viewed one step later

The return beginning at the next time is

$$
G_{t+1}=5+0.5(1)=5.5
\qquad(\gamma=0.5).
$$

Substituting it into the first step gives

$$
G_t=r_{t+1}+\gamma G_{t+1}
=-2+0.5(5.5)=0.75.
$$

This is an arithmetic identity for one recorded reward sequence. We have not introduced a state value, an expectation over possible futures, or a Bellman equation.

In the [Grid World concept lab](/en/labs/ch01-gridworld), the trajectory table exposes the same calculation one transition at a time. Change $\gamma$, replay the same actions with the same seed, and verify that the states and rewards stay fixed while the discounted return changes.

<a id="self-check"></a>

## Self-check

1. For rewards $(3,-1,4)$ and $\gamma=0.25$, what is the discounted return from the first step?
2. If you change only $\gamma$ and replay the same deterministic trajectory, should its next states change?

::: details Check your answers
The return is $3+0.25(-1)+0.25^2(4)=3$. The next states should not change: $\gamma$ belongs to the evaluation rule, not to the transition model.
:::
