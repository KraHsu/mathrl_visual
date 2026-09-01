---
id: ch02-bellman-equation
translation_key: ch02-bellman-equation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_sections: "2.4-2.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: The Bellman equation
description: Derive the fixed-policy Bellman expectation equation from a one-step decomposition of return.
outline: deep
---

# The Bellman equation

The Bellman equation is a consistency condition for expected returns. It says that a state's value must agree with the reward from the first transition plus the discounted value of what follows, averaged over every action and outcome allowed by the fixed policy and environment.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. decompose a return into its first reward and remaining return;
2. derive the Bellman expectation equation using conditional expectation;
3. expand one state's value into auditable probability-weighted terms; and
4. distinguish a Bellman equation from a sampled trajectory update.

<a id="return-decomposition"></a>

## Separate now from later

The return obeys the identity

$$
G_t=R_{t+1}+\gamma G_{t+1}.
$$

Substitute it into the state-value definition:

$$
v_\pi(s)
=\mathbb E_\pi[R_{t+1}+\gamma G_{t+1}\mid S_t=s].
$$

After the first transition reaches $S_{t+1}=s'$, the Markov property and continued use of the same policy imply

$$
\mathbb E_\pi[G_{t+1}\mid S_{t+1}=s']=v_\pi(s').
$$

Using the law of total expectation therefore replaces the random remaining return with the value of each possible successor state.

<a id="bellman-expectation-equation"></a>

## Average over actions and joint outcomes

Let $p(s',r\mid s,a)$ be the environment's joint distribution of next state and reward. For a fixed policy $\pi$,

$$
\boxed{
v_\pi(s)
=\sum_a\pi(a\mid s)
\sum_{s',r}p(s',r\mid s,a)
\left[r+\gamma v_\pi(s')\right]
}
$$

Read the calculation from the inside out:

1. $r+\gamma v_\pi(s')$ evaluates one possible first outcome;
2. $p(s',r\mid s,a)$ averages environment outcomes after action $a$; and
3. $\pi(a\mid s)$ averages the actions selected by the fixed policy.

The equation does not assume that reward and next state are conditionally independent. A joint outcome model keeps their relationship intact.

<a id="policy-induced-form"></a>

## Collect policy-induced quantities

Define the expected one-step reward and transition probabilities under $\pi$:

$$
r_\pi(s)
=\sum_a\pi(a\mid s)\sum_{s',r}p(s',r\mid s,a)r,
$$

$$
P_\pi(s,s')
=\sum_a\pi(a\mid s)\sum_r p(s',r\mid s,a).
$$

Then the same equation becomes

$$
v_\pi(s)
=r_\pi(s)+\gamma\sum_{s'}P_\pi(s,s')v_\pi(s').
$$

Neither $r_\pi$ nor $P_\pi$ changes during policy evaluation. If the policy changes, these policy-induced quantities must be rebuilt before evaluating the new policy.

<a id="worked-expansion"></a>

## Original one-state expansion

Suppose a fixed policy and environment together give two outcomes from state $x$:

- with probability $0.25$, receive reward $3$ and terminate; and
- with probability $0.75$, receive reward $-1$ and reach state $y$.

Let $\gamma=0.8$, $v_\pi(y)=2$, and assign the terminal state value zero. Then

$$
\begin{aligned}
v_\pi(x)
&=0.25[3+0.8(0)]
  +0.75[-1+0.8(2)]\\
&=0.75+0.45\\
&=1.20.
\end{aligned}
$$

Every bracket is a one-step target; every outer coefficient is an outcome probability. Writing the expansion this way makes missing probabilities, rewards, or successor values visible.

<a id="fixed-point-view"></a>

## A simultaneous fixed point

Define the fixed-policy Bellman operator

$$
(T_\pi v)(s)
=r_\pi(s)+\gamma\sum_{s'}P_\pi(s,s')v(s').
$$

The true value function satisfies

$$
v_\pi=T_\pi v_\pi.
$$

Values on the right-hand side can depend on one another or even on the same state. The equation is therefore not a claim that states can be solved in chronological order. It is a simultaneous system whose solution is self-consistent.

<a id="common-errors"></a>

## Common errors

- **Omitting the policy average:** this silently treats one action as if it were always selected.
- **Discounting the immediate reward:** the correct target is $r+\gamma v(s')$, not $\gamma[r+v(s')]$.
- **Adding terminal reward twice:** reward on entry belongs in $r$; the terminal continuation value is zero.
- **Using newly updated values halfway through a synchronous sweep:** that changes the update scheme.
- **Replacing the expectation with one sample:** one transition can estimate a term but is not the full model-based equation.
- **Taking a maximum over actions:** that would cross from fixed-policy evaluation into an optimality equation, which is outside this chapter.

<a id="self-check"></a>

## Self-check

For one state, a policy-induced model reaches $u$ with probability $0.4$ and reward $2$, or $w$ with probability $0.6$ and reward $-1$. Let $\gamma=0.5$, $v(u)=3$, and $v(w)=1$.

$$
(T_\pi v)(s)
=0.4[2+0.5(3)]+0.6[-1+0.5(1)]=1.1.
$$

Verify the arithmetic, then identify which numbers would remain fixed during policy evaluation and which entries belong to the current value estimate.

::: details Check your answer
The first term is $0.4(3.5)=1.4$ and the second is $0.6(-0.5)=-0.3$, giving $1.1$. Probabilities, rewards, and $\gamma$ are fixed model/configuration data; $v(u)$ and $v(w)$ are entries in the current value estimate.
:::

<a id="chapter-links"></a>

## Continue through Chapter 2

Next, gather the state equations into [matrix form](./matrix-form), or inspect their terms in the [Bellman lab](/en/labs/bellman-grid).

Chapter 2 pilot pages: [Overview](/en/learn/ch02/) · [State values](/en/learn/ch02/state-values) · [Bellman equation](/en/learn/ch02/bellman-equation) · [Matrix form](/en/learn/ch02/matrix-form) · [Policy evaluation](/en/learn/ch02/policy-evaluation) · [Action values](/en/learn/ch02/action-values) · [Checkpoint](/en/learn/ch02/checkpoint) · [Lab](/en/labs/bellman-grid)
