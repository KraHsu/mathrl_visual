---
id: ch03-contraction
translation_key: ch03-contraction
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.3.3-3.3.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Contraction and the optimal fixed point
description: Prove that the Bellman optimality operator is a gamma-contraction, derive uniqueness and convergence, and turn residuals into error bounds.
outline: deep
---

# Contraction and the optimal fixed point

The maximum in $T_*$ makes the Bellman optimality equation nonlinear, but it does not destroy stability. Discounting limits how strongly any disagreement about future values can affect a one-step backup.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. state the contraction fixed-point theorem in the setting of finite value vectors;
2. prove the inequality that controls a maximum of action backups;
3. prove that $T_*$ is a $\gamma$-contraction in the infinity norm;
4. distinguish an upper bound of $\gamma$ from an exact shrinkage ratio; and
5. use a Bellman residual to bound distance from $v_*$.

<a id="fixed-points"></a>

## Values as points in a complete metric space

For $n$ finite states, a value function is a vector in $\mathbb R^n$. Use the infinity norm (maximum norm)

$$
\lVert v\rVert_\infty=\max_s|v(s)|
$$

and its induced distance $d(u,v)=\lVert u-v\rVert_\infty$. This space is complete: every Cauchy sequence of finite real vectors has a limit in the same space.

A fixed point of an operator $T$ is a vector $v$ satisfying $Tv=v$. The Bellman optimality equation asserts that $v_*$ is a fixed point of $T_*$. To show that this solution is unique and approachable, we need to control how $T_*$ transforms the distance between two arbitrary vectors.

<a id="contraction-theorem"></a>

## The contraction fixed-point theorem

An operator $T$ is a contraction with modulus $c<1$ when

$$
\lVert Tu-Tv\rVert_\infty
\leq c\lVert u-v\rVert_\infty
$$

for every $u,v$. On a complete metric space, such an operator has exactly one fixed point $v^\dagger$. Moreover, from any initial vector $v_0$, the repeated sequence $v_{k+1}=Tv_k$ converges to $v^\dagger$.

The inequality says the distance after applying $T$ is **at most** $c$ times the old distance. It need not equal that bound. Some differences may disappear entirely after one backup, while others attain the bound.

<a id="max-lemma"></a>

## A maximum cannot amplify the largest coordinate disagreement

For two finite lists of real numbers $(x_a)$ and $(y_a)$,

$$
\left|\max_a x_a-\max_a y_a\right|
\leq\max_a|x_a-y_a|.
$$

To see one direction, let $a_x$ maximize $x_a$. Then

$$
\max_a x_a-\max_a y_a
=x_{a_x}-\max_a y_a
\leq x_{a_x}-y_{a_x}
\leq\max_a|x_a-y_a|.
$$

Swap $x$ and $y$ for the reverse direction. This lemma is crucial because the maximizing action for $u$ need not be the maximizing action for $v$.

<a id="operator-proof"></a>

## Prove the Bellman optimality contraction

Let

$$
B_u(s,a)=\sum_{s',r}p(s',r\mid s,a)
[r+\gamma u(s')]
$$

and define $B_v$ analogously. At a fixed state, the maximum lemma gives

$$
|(T_*u)(s)-(T_*v)(s)|
\leq\max_a|B_u(s,a)-B_v(s,a)|.
$$

The immediate rewards cancel in each action difference:

$$
\begin{aligned}
|B_u(s,a)-B_v(s,a)|
&=\gamma\left|
\sum_{s',r}p(s',r\mid s,a)[u(s')-v(s')]
\right|\\
&\leq\gamma
\sum_{s',r}p(s',r\mid s,a)|u(s')-v(s')|\\
&\leq\gamma\lVert u-v\rVert_\infty.
\end{aligned}
$$

Taking the maximum over actions and then states yields

$$
\boxed{
\lVert T_*u-T_*v\rVert_\infty
\leq\gamma\lVert u-v\rVert_\infty.
}
$$

For $0\leq\gamma<1$, $T_*$ is therefore a contraction with modulus **at most** $\gamma$.

<a id="consequences"></a>

## What the contraction proves

The theorem gives three related conclusions:

1. **Uniqueness:** $T_*$ has exactly one fixed point, so the optimal value function is unique.
2. **Global convergence:** for any finite initial vector, $v_{k+1}=T_*v_k$ approaches that fixed point.
3. **Geometric error control:**

$$
\lVert v_k-v_*\rVert_\infty
\leq\gamma^k\lVert v_0-v_*\rVert_\infty.
$$

This last expression is an upper bound, not a prediction that every observed error ratio equals $\gamma$. In the queue example, two applications happen to reach the exact fixed point because its simple deterministic structure eliminates the remaining disagreement faster than the worst-case guarantee.

The convergence statement explains repeated optimality backups mathematically. [Chapter 4](../ch04/) turns that repeated operation into a complete algorithm, including implementation choices and stopping behavior.

<a id="residual-bound"></a>

## Certify an approximate value with its residual

For any candidate $v$, define its Bellman optimality residual

$$
\rho(v)=\lVert T_*v-v\rVert_\infty.
$$

Insert the fixed point and use the triangle inequality:

$$
\begin{aligned}
\lVert v-v_*\rVert_\infty
&\leq\lVert v-T_*v\rVert_\infty
 +\lVert T_*v-T_*v_*\rVert_\infty\\
&\leq\rho(v)+\gamma\lVert v-v_*\rVert_\infty.
\end{aligned}
$$

Rearranging gives the a posteriori certificate

$$
\boxed{
\lVert v-v_*\rVert_\infty
\leq\frac{\rho(v)}{1-\gamma}.
}
$$

For the queue candidate $v=(2.8,4)$, $T_*v=(3,4)$, so $\rho(v)=0.2$. With $\gamma=0.5$, the bound is $0.2/(1-0.5)=0.4$. The actual maximum error from $(3,4)$ is $0.2$, safely below the certificate.

The factor $1/(1-\gamma)$ can be large when $\gamma$ is near one. A small residual then gives a weaker value-error guarantee than it would at a shorter horizon.

<a id="boundaries"></a>

## Where this proof stops

At $\gamma=1$, the displayed inequality becomes nonexpansive at best:

$$
\lVert T_*u-T_*v\rVert_\infty
\leq\lVert u-v\rVert_\infty.
$$

That is not a contraction and does not by itself prove a unique fixed point or convergence. Proper episodic policies, transient dynamics, stochastic-shortest-path assumptions, or a weighted norm may recover useful results, but none follows merely by setting $\gamma=1$ in this chapter's proof.

The proof also relies on valid probability rows and bounded finite values. If a model row does not sum to one, or returns can diverge, the displayed steps no longer certify the intended MDP.

<a id="self-check"></a>

## Self-check

Suppose $\gamma=0.8$, two initial vectors differ by at most $5$, and a candidate vector has residual $0.03$.

1. What upper bound applies after one optimality backup?
2. What upper bound applies after three backups?
3. What value-error certificate follows from the residual?

::: details Check your answer
After one backup the distance is at most $0.8(5)=4$. After three it is at most $0.8^3(5)=2.56$. The residual certificate is $0.03/(1-0.8)=0.15$. Each is an upper bound; observed distances may be smaller.
:::

<a id="chapter-links"></a>

## Continue through Chapter 3

Next, use the unique fixed point to [recover optimal policies](./greedy-policies), or inspect the consecutive-image contraction witness in the [Grid World lab](/en/labs/bellman-optimality-grid).

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
