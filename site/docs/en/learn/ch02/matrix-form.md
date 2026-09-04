---
id: ch02-matrix-form
translation_key: ch02-matrix-form
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Matrix form of the Bellman equation
description: Assemble fixed-policy rewards, transitions, and state values into a linear system.
outline: deep
---

# Matrix form of the Bellman equation

Writing one Bellman equation per state reveals the logic. Writing all of them together reveals the linear algebra. For a finite state space and fixed policy, policy evaluation is a linear system.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. construct the reward vector $r_\pi$ and transition matrix $P_\pi$ in a declared state order;
2. translate between scalar Bellman equations and vector notation;
3. verify a proposed value vector by substitution; and
4. distinguish an exact linear solve from iterative policy evaluation.

<a id="vector-assembly"></a>

## Choose an order, then keep it everywhere

Let the finite state space be ordered as $(s_0,s_1,\ldots,s_{n-1})$. Define

$$
v_\pi=
\begin{bmatrix}
v_\pi(s_0)\\
v_\pi(s_1)\\
\vdots\\
v_\pi(s_{n-1})
\end{bmatrix},
\qquad
r_\pi=
\begin{bmatrix}
r_\pi(s_0)\\
r_\pi(s_1)\\
\vdots\\
r_\pi(s_{n-1})
\end{bmatrix},
$$

and put the probability of moving from row state $s_i$ to column state $s_j$ in

$$
[P_\pi]_{ij}=P_\pi(s_i,s_j).
$$

With an explicit zero-reward absorbing representation for a terminal state, every row of $P_\pi$ is nonnegative and sums to one:

$$
P_\pi\mathbf 1=\mathbf 1.
$$

If terminal states are omitted and only nonterminal states remain in the matrix, probability can leave the represented set and a row may sum to less than one. Both conventions work, but they must not be mixed within one calculation.

<a id="matrix-equation"></a>

## Collect all Bellman equations

The scalar equation

$$
v_\pi(s_i)=r_\pi(s_i)+\gamma\sum_jP_\pi(s_i,s_j)v_\pi(s_j)
$$

for every row becomes

$$
\boxed{v_\pi=r_\pi+\gamma P_\pi v_\pi}.
$$

Move the value terms to one side:

$$
(I-\gamma P_\pi)v_\pi=r_\pi.
$$

For a finite discounted problem with $0\leq\gamma<1$ and a stochastic $P_\pi$, $I-\gamma P_\pi$ is invertible, so

$$
v_\pi=(I-\gamma P_\pi)^{-1}r_\pi.
$$

This inverse is a mathematical expression, not usually an instruction to form a numerical matrix inverse explicitly. A linear-system solver is generally preferable.

<a id="worked-system"></a>

## Original three-state system

Consider two nonterminal states $a,b$ and a zero-reward absorbing terminal state $z$. A fixed policy induces

$$
P_\pi=
\begin{bmatrix}
0 & 0.6 & 0.4\\
0 & 0.5 & 0.5\\
0 & 0 & 1
\end{bmatrix},
\qquad
r_\pi=
\begin{bmatrix}
0.8\\
1.5\\
0
\end{bmatrix},
\qquad
\gamma=0.8.
$$

The proposed solution

$$
v_\pi=
\begin{bmatrix}
2\\
2.5\\
0
\end{bmatrix}
$$

can be checked without an inverse:

$$
P_\pi v_\pi=
\begin{bmatrix}
1.5\\
1.25\\
0
\end{bmatrix},
\qquad
r_\pi+0.8P_\pi v_\pi
=
\begin{bmatrix}
2\\
2.5\\
0
\end{bmatrix}.
$$

The result reproduces itself under the Bellman operator, so its Bellman residual is zero.

<a id="matrix-audit"></a>

## Audit a matrix before solving it

Check these items in order:

1. **State order:** rows of $P_\pi$, columns of $P_\pi$, $r_\pi$, and $v_\pi$ use the same ordering.
2. **Shape:** for $n$ represented states, $P_\pi$ is $n\times n$ and both vectors have length $n$.
3. **Probability:** entries are nonnegative; represented row sums match the chosen terminal convention.
4. **Reward meaning:** $r_\pi(s)$ is the expected immediate reward after leaving $s$, not a long-term return.
5. **Terminal rule:** an included absorbing terminal row has transition probability one to itself and expected reward zero.
6. **Residual:** substituting the solution into $r_\pi+\gamma P_\pi v$ reproduces $v$ within numerical tolerance.

Transposing $P_\pi$ accidentally is especially easy. This site uses row-state-to-column-state orientation, so multiplying $P_\pi v$ forms a probability-weighted sum of successor values for each current-state row.

<a id="closed-vs-iterative"></a>

## Two ways to solve the same fixed point

An exact linear solve targets $(I-\gamma P_\pi)v=r_\pi$ directly. Iterative policy evaluation repeatedly applies

$$
v_{k+1}=r_\pi+\gamma P_\pi v_k.
$$

Under the discounted finite-state assumptions above, both target the same $v_\pi$. The next unit explains why the iteration converges and how to measure progress. Neither method changes or improves the fixed policy.

<a id="self-check"></a>

## Self-check

In the worked system, use only the second row to solve for $v_\pi(b)$, then use the first row to solve for $v_\pi(a)$.

::: details Check your answer
The second row gives $v_\pi(b)=1.5+0.8[0.5v_\pi(b)]$, so $0.6v_\pi(b)=1.5$ and $v_\pi(b)=2.5$. The first gives $v_\pi(a)=0.8+0.8[0.6(2.5)]=2$ because $v_\pi(z)=0$.
:::

<a id="chapter-links"></a>

## Continue through Chapter 2

Continue to [Policy evaluation](./policy-evaluation) to turn the vector equation into observable synchronous sweeps.

Chapter 2 pilot pages: [Overview](/en/learn/ch02/) · [State values](/en/learn/ch02/state-values) · [Bellman equation](/en/learn/ch02/bellman-equation) · [Matrix form](/en/learn/ch02/matrix-form) · [Policy evaluation](/en/learn/ch02/policy-evaluation) · [Action values](/en/learn/ch02/action-values) · [Checkpoint](/en/learn/ch02/checkpoint) · [Lab](/en/labs/bellman-grid)
