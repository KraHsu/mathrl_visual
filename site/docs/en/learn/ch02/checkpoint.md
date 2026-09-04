---
id: ch02-checkpoint
translation_key: ch02-checkpoint
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.9-2.10"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Chapter 2 checkpoint
description: Evaluate one fixed policy by Bellman equations, a matrix system, iterative updates, action values, and a residual check.
outline: deep
---

# Chapter 2 checkpoint

This checkpoint uses one small, original model from start to finish. Keep the policy fixed, derive its Bellman equations, solve the same evaluation problem in matrix form, reproduce several iterative updates, and then connect state values to action values.

::: info Original companion exercise
The scenario, model, numbers, prompts, and answers on this page are original companion material. They use the topic scope of the book without reproducing its prose, figures, tables, questions, or code.
:::

::: warning Evaluation boundary
Every question evaluates the supplied policy $\pi$. Do not replace its probabilities or use the calculated values to modify it; policy selection and policy change are outside this checkpoint.
:::

<a id="scenario"></a>

## Scenario: a night document queue

A document service has two nonterminal states:

- $Q$: a document is waiting in the queue;
- $R$: a document is under review.

State $T$ is terminal. The discount factor is $\gamma=0.5$, and $v_\pi(T)=0$. Conditional on each action, the next state and reward are deterministic. The fixed policy and environment model are:

| Current state | Action | $\pi(a\mid s)$ | Next state | Reward |
| --- | --- | ---: | --- | ---: |
| $Q$ | hold | $0.50$ | $Q$ | $-1$ |
| $Q$ | forward | $0.50$ | $R$ | $+1$ |
| $Q$ | inspect | $0$ | $T$ | $+2$ |
| $R$ | return | $0.25$ | $Q$ | $0$ |
| $R$ | recheck | $0.25$ | $R$ | $-2$ |
| $R$ | submit | $0.50$ | $T$ | $+4$ |

The action “inspect” is available at $Q$, even though this particular policy assigns it probability zero. All calculations below concern this exact policy and model.

<a id="model-audit"></a>

## 1. Audit the supplied model

1. Do the policy probabilities form a valid distribution at both nonterminal states?
2. Which uncertainty remains after the action at a state is known?
3. Compute the policy-induced expected immediate-reward vector $\boldsymbol r_\pi$ over the ordered nonterminal states $(Q,R)$.
4. Compute the policy-induced transition matrix $P_\pi$ when its columns include only $(Q,R)$. Why may a row of this matrix sum to less than one?

::: details Show the answer
At $Q$, the probabilities sum to $0.50+0.50+0=1$. At $R$, they sum to $0.25+0.25+0.50=1$. Every entry is nonnegative, so both policy rows are valid.

Once an action is known, the table gives a deterministic next state and reward. The remaining one-step uncertainty under $\pi$ is therefore which action the policy samples.

The expected immediate rewards are

$$
\begin{aligned}
r_\pi(Q)&=0.50(-1)+0.50(1)+0(2)=0,\\
r_\pi(R)&=0.25(0)+0.25(-2)+0.50(4)=1.5.
\end{aligned}
$$

Thus

$$
\boldsymbol r_\pi=
\begin{bmatrix}0\\1.5\end{bmatrix},
\qquad
P_\pi=
\begin{bmatrix}
0.50&0.50\\
0.25&0.25
\end{bmatrix}.
$$

The second row sums to $0.50$ because the omitted probability $0.50$ goes from $R$ to terminal state $T$. This reduced matrix records transitions among nonterminal states only. A full matrix that included $T$ would retain that probability in a terminal-state column.
:::

<a id="bellman-equations"></a>

## 2. Write the Bellman equations

Starting from

$$
v_\pi(s)=\sum_a\pi(a\mid s)
\left[r(s,a)+\gamma v_\pi(s'(s,a))\right],
$$

write one scalar Bellman equation for $Q$ and one for $R$. Simplify both equations, but do not solve them yet.

::: details Show the answer
At $Q$, the zero-probability action makes no contribution to the state-value average:

$$
\begin{aligned}
v_\pi(Q)
&=0.50[-1+0.5v_\pi(Q)]
 +0.50[1+0.5v_\pi(R)]
 +0[2+0.5v_\pi(T)]\\
&=0.25v_\pi(Q)+0.25v_\pi(R).
\end{aligned}
$$

At $R$,

$$
\begin{aligned}
v_\pi(R)
&=0.25[0+0.5v_\pi(Q)]
 +0.25[-2+0.5v_\pi(R)]
 +0.50[4+0.5v_\pi(T)]\\
&=1.5+0.125v_\pi(Q)+0.125v_\pi(R).
\end{aligned}
$$

The immediate reward on a transition into $T$ is included. Only the continuation after that transition is zero.
:::

<a id="matrix-solution"></a>

## 3. Build and solve the matrix system

Use the ordered value vector

$$
\boldsymbol v_\pi=
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}
$$

and the quantities from Exercise 1.

1. Write $\boldsymbol v_\pi=\boldsymbol r_\pi+\gamma P_\pi\boldsymbol v_\pi$.
2. Rearrange it as $(I-\gamma P_\pi)\boldsymbol v_\pi=\boldsymbol r_\pi$.
3. Solve for both state values and substitute them into the two scalar equations as a check.

::: details Show the answer
The matrix equation is

$$
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}
=
\begin{bmatrix}0\\1.5\end{bmatrix}
+0.5
\begin{bmatrix}
0.50&0.50\\
0.25&0.25
\end{bmatrix}
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}.
$$

Moving the continuation term to the left gives

$$
\begin{bmatrix}
0.75&-0.25\\
-0.125&0.875
\end{bmatrix}
\begin{bmatrix}v_\pi(Q)\\v_\pi(R)\end{bmatrix}
=
\begin{bmatrix}0\\1.5\end{bmatrix}.
$$

The first row implies $v_\pi(R)=3v_\pi(Q)$. Substitution into the second row gives

$$
\boxed{v_\pi(Q)=0.6,
\qquad
v_\pi(R)=1.8.}
$$

Checking the scalar equations:

$$
0.25(0.6)+0.25(1.8)=0.6,
$$

and

$$
1.5+0.125(0.6)+0.125(1.8)=1.8.
$$

Both equations reproduce the proposed values.
:::

<a id="iterative-evaluation"></a>

## 4. Reproduce iterative policy evaluation

Initialize

$$
\boldsymbol v^{(0)}=
\begin{bmatrix}0\\0\end{bmatrix}
$$

and apply synchronous updates

$$
\boldsymbol v^{(k+1)}
=\boldsymbol r_\pi+\gamma P_\pi\boldsymbol v^{(k)}.
$$

Compute $\boldsymbol v^{(1)}$, $\boldsymbol v^{(2)}$, and $\boldsymbol v^{(3)}$. In a synchronous update, both new components must use only values from the previous vector.

::: details Show the answer
The first three updates are

$$
\begin{aligned}
\boldsymbol v^{(1)}
&=\begin{bmatrix}0\\1.5\end{bmatrix},\\[4pt]
\boldsymbol v^{(2)}
&=\begin{bmatrix}0.375\\1.6875\end{bmatrix},\\[4pt]
\boldsymbol v^{(3)}
&=\begin{bmatrix}0.515625\\1.7578125\end{bmatrix}.
\end{aligned}
$$

For example, the third update is

$$
\begin{aligned}
v^{(3)}(Q)
&=0.25(0.375)+0.25(1.6875)=0.515625,\\
v^{(3)}(R)
&=1.5+0.125(0.375)+0.125(1.6875)=1.7578125.
\end{aligned}
$$

The vectors are moving toward the closed-form solution $(0.6,1.8)^\mathsf T$. They are approximations after a stated number of updates, not separate definitions of value.
:::

<a id="action-values"></a>

## 5. Recover state values from action values

Using the exact state values from Exercise 3, calculate every action value at $Q$:

$$
q_\pi(Q,a)=r(Q,a)+0.5v_\pi(s'(Q,a)).
$$

Then verify

$$
v_\pi(Q)=\sum_a\pi(a\mid Q)q_\pi(Q,a).
$$

Finally, explain why $\pi(\text{inspect}\mid Q)=0$ does not require $q_\pi(Q,\text{inspect})=0$.

::: details Show the answer
The three action values are

$$
\begin{aligned}
q_\pi(Q,\text{hold})
&=-1+0.5(0.6)=-0.7,\\
q_\pi(Q,\text{forward})
&=1+0.5(1.8)=1.9,\\
q_\pi(Q,\text{inspect})
&=2+0.5(0)=2.
\end{aligned}
$$

Averaging with the fixed policy gives

$$
0.50(-0.7)+0.50(1.9)+0(2)=0.6=v_\pi(Q).
$$

The operational definition of $q_\pi(Q,\text{inspect})$ deliberately takes “inspect” once and then follows $\pi$. It is therefore well defined and equals $2$ even though that action does not naturally occur under the policy. The zero policy probability says only that this action contributes zero weight to $v_\pi(Q)$ under the supplied policy.
:::

<a id="residual-check"></a>

## 6. Audit an approximate result with a Bellman residual

Let $T_\pi$ denote the fixed-policy Bellman operator:

$$
T_\pi(\boldsymbol v)
=\boldsymbol r_\pi+\gamma P_\pi\boldsymbol v.
$$

For $\boldsymbol v^{(2)}=(0.375,1.6875)^\mathsf T$:

1. Compute $T_\pi(\boldsymbol v^{(2)})-\boldsymbol v^{(2)}$.
2. Give its infinity norm.
3. With $\gamma=0.5$, use
   $$
   \|\boldsymbol v-\boldsymbol v_\pi\|_\infty
   \leq
   \frac{\|T_\pi(\boldsymbol v)-\boldsymbol v\|_\infty}{1-\gamma}
   $$
   to give an error bound. Compare it with the actual infinity-norm error using the exact solution.

::: details Show the answer
Because $T_\pi(\boldsymbol v^{(2)})=\boldsymbol v^{(3)}$,

$$
T_\pi(\boldsymbol v^{(2)})-\boldsymbol v^{(2)}
=
\begin{bmatrix}
0.515625-0.375\\
1.7578125-1.6875
\end{bmatrix}
=
\begin{bmatrix}
0.140625\\
0.0703125
\end{bmatrix}.
$$

Its infinity norm is $0.140625$, so the residual bound is

$$
\|\boldsymbol v^{(2)}-\boldsymbol v_\pi\|_\infty
\leq \frac{0.140625}{1-0.5}=0.28125.
$$

The actual error is

$$
\max\{|0.375-0.6|,|1.6875-1.8|\}
=\max\{0.225,0.1125\}
=0.225,
$$

which is below the bound. The residual provides a check that does not require knowing the exact solution; here the exact solution lets us verify that the bound is conservative.
:::

<a id="completion-criteria"></a>

## Completion criteria

You are ready to leave Chapter 2 when you can do all of the following without opening the answers:

- [ ] keep policy probabilities separate from environment transitions and rewards;
- [ ] derive both scalar Bellman equations from the model table;
- [ ] explain why a nonterminal-only transition row may sum to less than one;
- [ ] construct $(I-\gamma P_\pi)\boldsymbol v_\pi=\boldsymbol r_\pi$ and solve it;
- [ ] perform synchronous policy-evaluation updates without mixing old and new components;
- [ ] define and calculate $q_\pi(s,a)$ by unfolding one transition;
- [ ] recover $v_\pi(s)$ as $\sum_a\pi(a\mid s)q_\pi(s,a)$;
- [ ] explain why $\pi(a\mid s)=0$ does not imply $q_\pi(s,a)=0$; and
- [ ] use a Bellman residual to audit an approximate value vector.

<a id="chapter-navigation"></a>

## Chapter 2 learning path

[Chapter 2 overview](./) · [State values](./state-values) · [Bellman equation](./bellman-equation) · [Matrix form](./matrix-form) · [Policy evaluation](./policy-evaluation) · [Action values](./action-values) · [Chapter checkpoint](./checkpoint) · [Bellman policy-evaluation lab](/en/labs/bellman-grid)
