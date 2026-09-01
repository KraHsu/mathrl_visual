---
id: ch02-action-values
translation_key: ch02-action-values
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_sections: "2.8"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Action values under a fixed policy
description: Define q_pi, unfold it by one transition, and recover a fixed policy's state value as a policy-weighted average.
---

# Action values under a fixed policy

A state value asks what return to expect when the current state is known and a given policy is followed. An **action value** asks a more specific evaluation question: what return should we expect if the first action is fixed as well, and the same given policy is followed afterward?

::: info Scope: evaluation only
The policy $\pi$ is supplied and held fixed throughout this page. The calculations describe that policy and the consequences of available first actions; they do not introduce a rule for selecting or changing the policy.
:::

<a id="action-value-definition"></a>

## Condition on the state and the first action

For a discounted return $G_t$ and a fixed policy $\pi$, the action-value function is

$$
q_\pi(s,a)
=\mathbb E_\pi\!\left[G_t\mid S_t=s,A_t=a\right].
$$

Interpret this notation operationally: deliberately take $a$ once, then follow $\pi$. When $\pi(a\mid s)=0$, it is not ordinary conditioning on an action event that occurs under $\pi$.

The conditioning has two parts:

- $S_t=s$ fixes the current state;
- $A_t=a$ fixes the action at the current step.

From time $t+1$ onward, actions are sampled from the fixed policy $\pi$. Thus $q_\pi(s,a)$ evaluates a one-action intervention followed by the ordinary continuation of $\pi$. It is defined for every available pair $(s,a)$ for which the model and return are well defined.

By contrast,

$$
v_\pi(s)=\mathbb E_\pi\!\left[G_t\mid S_t=s\right]
$$

does not condition on a particular first action. That first action is sampled from $\pi(\cdot\mid s)$.

<a id="one-step-decomposition"></a>

## Unfold one transition

Use the return identity

$$
G_t=R_{t+1}+\gamma G_{t+1}.
$$

After conditioning on $S_t=s$ and $A_t=a$, the continuation from the next state has value $v_\pi(S_{t+1})$. Therefore

$$
q_\pi(s,a)
=\mathbb E\!\left[
R_{t+1}+\gamma v_\pi(S_{t+1})
\mid S_t=s,A_t=a
\right].
$$

If the environment is described by the joint one-step model

$$
p(s',r\mid s,a)
=\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a),
$$

then the expectation becomes

$$
q_\pi(s,a)
=\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_\pi(s')\right].
$$

When the expected immediate reward is represented as $r(s,a,s')$ separately from $p(s'\mid s,a)$, the same calculation is

$$
q_\pi(s,a)
=\sum_{s'}p(s'\mid s,a)
\left[r(s,a,s')+\gamma v_\pi(s')\right].
$$

For a terminal successor, this page uses the convention $v_\pi(s_{\mathrm T})=0$: the transition's immediate reward remains, but there is no reward-bearing continuation after termination.

<a id="state-action-link"></a>

## Average action values with the policy

At state $s$, the fixed policy supplies the distribution of the first action. Applying the law of total expectation gives

$$
\boxed{
v_\pi(s)=\sum_{a\in\mathcal A(s)}\pi(a\mid s)q_\pi(s,a)
}.
$$

This is a policy-weighted average, not an unweighted average. The probabilities must be the probabilities used by the policy at that state, and they must sum to one over the available actions.

The two one-step views are consistent:

$$
\begin{aligned}
v_\pi(s)
&=\sum_a\pi(a\mid s)q_\pi(s,a)\\
&=\sum_a\pi(a\mid s)
  \sum_{s',r}p(s',r\mid s,a)
  \left[r+\gamma v_\pi(s')\right].
\end{aligned}
$$

The outer sum describes the policy's random action. The inner sum describes the environment's random response after that action is known.

<a id="worked-example"></a>

## Worked example: three dispatch commands

Consider an original dispatch model with current state $h$ and two possible successor states $x$ and $y$. A previous fixed-policy evaluation has produced

$$
v_\pi(x)=2,
\qquad
v_\pi(y)=-1,
\qquad
\gamma=0.5.
$$

Three commands are available at $h$:

| First action | One-step model | $\pi(a\mid h)$ |
| --- | --- | ---: |
| route | $x$ with probability $0.75$ and reward $1$; $y$ with probability $0.25$ and reward $-2$ | $0.40$ |
| queue | $x$ with probability $1$ and reward $-1$ | $0.60$ |
| inspect | $y$ with probability $1$ and reward $3$ | $0$ |

Unfolding one step gives

$$
\begin{aligned}
q_\pi(h,\text{route})
&=0.75[1+0.5(2)]
 +0.25[-2+0.5(-1)]\\
&=0.875,\\[4pt]
q_\pi(h,\text{queue})
&=-1+0.5(2)=0,\\[4pt]
q_\pi(h,\text{inspect})
&=3+0.5(-1)=2.5.
\end{aligned}
$$

Now average with the policy actually being evaluated:

$$
\begin{aligned}
v_\pi(h)
&=0.40(0.875)+0.60(0)+0(2.5)\\
&=0.35.
\end{aligned}
$$

Each action value fixes the first command and then evaluates the same continuation policy. The state value additionally averages over which first command that policy actually issues.

<a id="zero-policy-probability"></a>

## Zero policy probability does not imply zero action value

In the example,

$$
\pi(\text{inspect}\mid h)=0
\qquad\text{but}\qquad
q_\pi(h,\text{inspect})=2.5.
$$

There is no contradiction. The probability $\pi(a\mid s)$ answers “how often does the fixed policy take this action here?” The value $q_\pi(s,a)$ answers “what return follows if this action is fixed now and the policy is used afterward?”

A zero policy probability removes the term from the weighted average for $v_\pi(s)$. It does **not** multiply the definition of $q_\pi(s,a)$, and it does not erase the environment model for that available action.

<a id="self-check"></a>

## Self-check

Suppose $\gamma=0.8$, $v_\pi(u)=3$, and action $a$ gives reward $-1$ before moving deterministically to $u$.

1. What is $q_\pi(s,a)$?
2. If $\pi(a\mid s)=0$, does your answer change?
3. What does become zero when $\pi(a\mid s)=0$?

::: details Check your answers
The one-step decomposition gives

$$
q_\pi(s,a)=-1+0.8(3)=1.4.
$$

The action value stays $1.4$ even if $\pi(a\mid s)=0$, because its operational definition fixes $a$ as the first action. What becomes zero is this action's contribution to the state-value average:

$$
\pi(a\mid s)q_\pi(s,a)=0(1.4)=0.
$$
:::

<a id="chapter-navigation"></a>

## Chapter 2 learning path

[Chapter 2 overview](./) · [State values](./state-values) · [Bellman equation](./bellman-equation) · [Matrix form](./matrix-form) · [Policy evaluation](./policy-evaluation) · [Action values](./action-values) · [Chapter checkpoint](./checkpoint) · [Bellman policy-evaluation lab](/en/labs/bellman-grid)
