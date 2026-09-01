---
id: ch04-q-and-a
translation_key: ch04-q-and-a
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Chapter 4 Q&A
description: Short original answers to common questions about value iteration, policy iteration, truncation, GPI, and model access.
outline: deep
---

# Chapter 4 Q&A

These answers are quick checks, not substitutes for the derivations in the chapter. If an answer depends on a tolerance, initialization, or model assumption, that dependency is part of the answer.

<a id="q1"></a>

## Is value iteration guaranteed to find an optimal value?

Under the finite, bounded, discounted assumptions and an exact known model, yes: it repeatedly applies the $\gamma$-contraction $T_*$. Reading a maximizing action set at the limiting value yields an optimal policy (possibly one of several tied policies). A finite run returns an approximation or a truncated result; the guarantee is about the limiting sequence (or an explicitly certified residual), not about a rounded heatmap.

<a id="q2"></a>

## Is every value-iteration vector a state value?

No. $v_k$ is an iterate of $T_*$. It becomes a state value of a policy only if it happens to satisfy a fixed-policy equation $v_k=T_\pi v_k$. The associated $q_k(s,a)$ is an action backup against the iterate, not automatically $q_\pi$.

<a id="q3"></a>

## Why does value iteration need a frozen copy?

The declared recurrence is synchronous: every state in $v_{k+1}$ reads $v_k$. Reusing a newly written coordinate creates an asynchronous variant with a different trace and potentially different finite-run behavior. It may still converge under suitable conditions, but it must be named and tested separately.

<a id="q4"></a>

## What are the two steps of policy iteration?

First evaluate the current policy by solving $v_\pi=T_\pi v_\pi$ (directly or to a declared inner tolerance). Then improve the policy by selecting actions that maximize $B_{v_\pi}(s,a)$. Stop only when the policy or its maximizing action set is stable, with the evaluation status reported separately.

<a id="q5"></a>

## Does a greedy improvement always make every state strictly better?

It makes the new policy no worse componentwise under exact evaluation. Strict improvement at one state may not propagate to every state—for example, another state might never reach that state. A theorem about nondecrease is not a promise of a strictly rising value in every cell.

<a id="q6"></a>

## Can two optimal policies be different?

Yes. If two actions have equal optimal backup at a state, any distribution supported on those maximizing actions is compatible with the same optimal value. A deterministic tie-break is useful for reproducibility, but it should not erase the mathematical tie set.

<a id="q7"></a>

## What does “truncated” refer to?

In truncated policy iteration it refers to stopping the inner fixed-policy evaluation after a finite number of sweeps. It does not mean deleting rare transitions, clipping rewards, or pretending that an outer work cap proves convergence.

<a id="q8"></a>

## Is depth one exactly value iteration?

Only with a matched schedule: the inner update must start from the vector used by the preceding optimality backup, and the policy must be formed at the corresponding point. With a different initialization or carry-forward rule, depth one is merely Value-Iteration-like. The lab records these choices so the slogan can be checked rather than assumed.

<a id="q9"></a>

## How should I choose an inner depth?

There is no universal best number. Small depths reconsider the policy often and spend little work per outer round; large depths produce more accurate policy values but may spend work on a policy that will soon change. Compare total model backups, inner residuals, and outer changes. An adaptive rule is valid if it is recorded.

<a id="q10"></a>

## Is a small update the same as convergence?

No. A small update $\|v_{k+1}-v_k\|_\infty$ describes one step. A Bellman residual $\|T_*v_k-v_k\|_\infty$ tests the fixed point, and a policy-stability test checks the outer decision rule. A sweep cap only says the budget ended.

<a id="q11"></a>

## Does stochastic wind let the agent choose after seeing the slip?

No. For a requested action, first average all actual outcomes:

$$
q_v(s,a)=\sum_{s',r}p(s',r\mid s,a)[r+\gamma v(s')],
$$

then compare the requested actions. Taking a maximum separately for each realized outcome gives the agent extra information and solves a different problem.

<a id="q12"></a>

## Are these already model-free reinforcement-learning algorithms?

No. The chapter's planner is given $p(s',r\mid s,a)$ and performs dynamic programming. A model-based RL method may estimate $\hat p,\hat r$ from experience before planning; a model-free method estimates values or policies without maintaining an explicit transition model. Similar GPI diagrams do not erase this data-source distinction.

<a id="q13"></a>

## What happens at a terminal state?

Under this companion's convention, entering the terminal state can deliver an immediate reward, while its continuation value is zero and no action row is created. A planner that adds a fictitious “stay at terminal” action changes the displayed model and can confuse policy counts.

<a id="read-next"></a>

## Where should I verify these answers?

Use the [summary](./summary) for the schedule table, then solve the [checkpoint](./checkpoint) and inspect the [planning lab](/en/labs/ch04-planning-grid). Start the lab without wind, and only then enable its 20% wind preset; the introductory Chapter 1 transition/Markov experiment provides the corresponding wind prompt for the first encounter with stochastic outcomes.
