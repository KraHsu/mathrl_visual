---
id: ch04-checkpoint
translation_key: ch04-checkpoint
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Chapter 4 checkpoint
description: Compare value iteration, policy iteration, and truncated policy iteration on one original finite MDP, then audit the shared Grid World.
outline: deep
---

# Chapter 4 checkpoint

This checkpoint uses a small original model so that every number can be recomputed by hand. It then asks you to transfer the same questions to the 4×4 planning lab. Keep the model, initialization, tie rule, and stopping tests visible while you work.

::: info Original companion exercise
The scenario, model, numbers, prompts, and explanations on this page are original companion material. They follow the chapter's topic scope without reproducing upstream prose, proofs, figures, tables, questions, or code.
:::

::: warning Model boundary
All three calculations below receive the complete deterministic model. They are planning procedures, not a demonstration that an agent learned transitions from experience.
:::

<a id="scenario"></a>

## Scenario and model

There are two nonterminal states, $X$ and $Y$, and a terminal state $T$. The discount factor is $\gamma=0.5$. Each row below has probability one for the displayed outcome.

| State | Action | Next state | Reward |
| --- | --- | --- | ---: |
| $X$ | wait | $X$ | $0$ |
| $X$ | route | $Y$ | $+1$ |
| $X$ | exit | $T$ | $+0.5$ |
| $Y$ | back | $X$ | $0$ |
| $Y$ | wait | $Y$ | $0$ |
| $Y$ | finish | $T$ | $+2$ |

The initial policy $\pi_0$ chooses **wait** at both states. For reproducibility, use the state order $(X,Y,T)$ and set $v_0=(0,0,0)$.

<a id="audit"></a>

## 1. Audit the one-step model

1. Which rows are decision rows and which row is the terminal boundary condition?
2. Write $B_v(s,a)$ for all six state–action pairs.
3. Why must a planner compare the three complete backups at $X$ before choosing an action?

::: details Check the answer
$X$ and $Y$ are decision states; $T$ has no action row and its continuation value is fixed at zero. Since outcomes are deterministic,

$$
\begin{array}{lll}
B_v(X,\mathrm{wait})=0+0.5v(X), &
B_v(X,\mathrm{route})=1+0.5v(Y), &
B_v(X,\mathrm{exit})=0.5,\\
B_v(Y,\mathrm{back})=0+0.5v(X), &
B_v(Y,\mathrm{wait})=0+0.5v(Y), &
B_v(Y,\mathrm{finish})=2.
\end{array}
$$

The maximum belongs outside the action backup. In a stochastic variant, each backup would first sum all outcome probabilities; choosing after an outcome would give the agent information it does not have.
:::

<a id="value-iteration"></a>

## 2. Run two value-iteration sweeps

Starting from $v_0=(0,0)$, calculate $v_1=T_*v_0$ and $v_2=T_*v_1$. Record the greedy action set at each state.

::: details Check the answer
At $v_0$, the action backups are

$$
q_0(X)=(0,1,0.5),
\qquad q_0(Y)=(0,0,2),
$$

in the table's action order. Thus

$$
v_1=(1,2),
\qquad
\operatorname{greedy}_1(X)=\{\mathrm{route}\},
\quad
\operatorname{greedy}_1(Y)=\{\mathrm{finish}\}.
$$

Against $v_1$,

$$
q_1(X)=(0.5,2,0.5),
\qquad
q_1(Y)=(0.5,1,2),
$$

so $v_2=(2,2)$ and the same greedy actions remain. A further sweep leaves $(2,2)$ unchanged. The first vector is an operator iterate; the second happens to be the optimal fixed point for this model.
:::

<a id="policy-iteration"></a>

## 3. Run policy iteration from $\pi_0$

1. Evaluate the initial wait/wait policy exactly.
2. Improve it using the evaluated values.
3. Evaluate the improved policy and test stability.

::: details Check the answer
For $\pi_0$,

$$
v_{\pi_0}(X)=0.5v_{\pi_0}(X),
\qquad
v_{\pi_0}(Y)=0.5v_{\pi_0}(Y),
$$

so $v_{\pi_0}=(0,0)$. The first greedy improvement chooses route at $X$ and finish at $Y$. Evaluating that policy gives

$$
v_{\pi_1}(Y)=2,
\qquad
v_{\pi_1}(X)=1+0.5v_{\pi_1}(Y)=2.
$$

With $(2,2)$, route remains the unique best action at $X$ and finish remains the unique best action at $Y$. The policy is stable and therefore optimal. Notice that Policy Iteration reaches the exact values after its evaluation solve, while Value Iteration exposed $(1,2)$ first.
:::

<a id="truncated"></a>

## 4. Insert a finite inner depth

Run truncated PI with $J=1$, carrying the value vector forward, and start from $\pi_0$ and $v_0=(0,0)$.

1. What does the first inner evaluation under $\pi_0$ return?
2. Which policy follows the first improvement?
3. How many inner sweeps are needed before the improved policy's value reaches $(2,2)$?
4. Why is this trace not identical to the first two Value Iteration vectors?

::: details Check the answer
The wait/wait policy maps $(0,0)$ to $(0,0)$, so the first finite evaluation returns the same vector and then improves the policy to route/finish. The next outer round's one inner sweep maps $(0,0)$ to $(1,2)$; the following one maps $(1,2)$ to $(2,2)$. Thus the exact value needs two inner sweeps after the policy change.

Value Iteration chooses the greedy policy and updates the value in the same sweep, whereas this truncated trace first evaluates the old policy and only then improves it. Depth one is not a universal identity; the initialization and timing have to match before the two schedules coincide.
:::

<a id="comparison"></a>

## 5. Compare the accounting

Fill the following table from your calculations:

| Procedure | Outer rounds to stable | Fixed-policy sweeps | First nonzero value vector | Final value |
| --- | ---: | ---: | --- | --- |
| Value iteration |  |  |  |  |
| Policy iteration |  |  |  |  |
| Truncated PI, $J=1$ |  |  |  |  |

::: details One possible accounting
Counting a Value Iteration sweep from $v_0$, the first nonzero vector is $(1,2)$ and the second is $(2,2)$. Policy Iteration has one evaluation of $\pi_0$ and one evaluation of $\pi_1$; the latter is exact if solved as a linear system. Truncated PI with $J=1$ has an initial zero evaluation, then two one-sweep evaluations after the policy change before the value reaches $(2,2)$. Other counters are possible if “outer round” is defined differently, which is why the trace must state its counter convention.
:::

<a id="shared-grid"></a>

## 6. Transfer the audit to the shared Grid World

Open the [planning lab](/en/labs/ch04-planning-grid) and use the baseline no-wind configuration. Check the following without relying on colour alone:

1. Does the first Value Iteration sweep contain the 16-state vector

   $$
   (-0.04,-0.04,-0.04,-0.04,-0.04,-0.04,-0.04,-0.04,
   -0.04,-0.04,-0.04,1,-0.04,-0.04,1,0)?
   $$

2. Does the planner keep state 15 as a terminal boundary with no policy row?
3. When actions tie, does the table retain all maximizing actions?
4. After the baseline run, what changes when the 20% wind preset is enabled?

The introductory [transition/Markov experiment](/en/labs/ch01-gridworld) gives a separate guided entry point: inspect the no-wind transition distribution first, then use its prompt to enable wind. In both labs, wind changes outcome probabilities before the planner or observer interprets them.

::: details Check the answer
The baseline first sweep is the displayed vector because only immediate rewards are visible from $v_0=0$. State 15 is terminal and remains zero in the continuation vector. The complete action ledger, rather than an arrow colour, determines tie sets. Enabling wind changes each affected requested-action row (for example, a nominal direction has probability $0.85$ and each alternate actual direction has $0.05$ at 20% slip); the max is still taken only after each row's expectation is computed.
:::

<a id="reflection"></a>

## 7. Reflection prompts

Answer in one or two sentences each:

- Which number in your table is a Bellman residual, and which is merely an update size?
- If the model probabilities were estimated from data, which claim would have to be weakened?
- What evidence would distinguish an inner-truncated run from an outer-truncated run?
- Why can two different tie-breaking policies share the same final value?

<a id="read-next"></a>

## Continue the audit

Compare your notes with the [summary](./summary) and [Q&A](./q-and-a), then return to the [planning lab](/en/labs/ch04-planning-grid) and reproduce the same run after changing only one factor at a time. Keep the Chapter 1 wind prompt in the introductory path so that stochastic transitions are understood before algorithm schedules are compared.
