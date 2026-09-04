---
id: exp-ch02-grid-policy-evaluation
translation_key: exp-ch02-grid-policy-evaluation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 36ac85b83cef0cbbf041e7142ab816a9c5acd4de
source_pdf_sha256: a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa
source_sections: "2.3-2.8"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Shared 4×4 Grid World policy-evaluation lab
description: Evaluate a supplied fixed policy over all 16 states with synchronous Bellman expectation backups, a matrix view, and an exact reference solution.
aside: false
outline: deep
---

# Shared 4×4 Grid World policy-evaluation lab

This is the chapter-scale companion experiment for Chapter 2. It evaluates a supplied policy on the **same 4×4 Grid World** used by Chapters 1, 3, and 4. Rust/Wasm owns the Bellman arithmetic in a browser Worker; Vue exposes the 16-state heatmap, the selected state's terms, the policy-induced matrix, and a numerical table for every dense view.

::: info Fixed-policy boundary
The policy is an input to evaluation, not an output. The lab never takes a maximum over actions, improves the policy, or performs value iteration. The separate [four-state Bellman scaffold](/en/labs/bellman-grid) remains as a compact preflight for reading one backup ledger.
:::

<GridPolicyEvaluationLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the complete 16-state model, first synchronous vector, matrix equation, and paper procedure remain available below.
</noscript>

<a id="shared-model"></a>

## One model shared across chapters

The state index is row-major:

$$
s=4r+c,qquad r,cin\{0,1,2,3\}.
$$

State $0$ is the start, state $15$ is the terminating goal, and states $6$ and $9$ are hazards. Moving outside the board leaves the agent in place and emits the boundary reward. Entering a hazard emits the hazard reward. Entering state $15$ emits the goal reward and ends the episode; the continuation value after that transition is zero.

For a requested action $a$, the shared environment first forms

$$
p(s'\mid s,a),
$$

including the optional wind probability. The default fixed policy is uniform on the five actions:

$$
\pi(a\mid s)=\frac15\quad(s\ne15),
\qquad
\pi(a\mid15)=0.
$$

The optional goal-seeking preset is still fixed before evaluation begins. It is useful for comparing two policy-induced value functions, but it is not learned by the experiment.

<a id="operator"></a>

## The 16-state Bellman expectation operator

After averaging both the supplied policy and the environment, define

$$
r_\pi(s)=\sum_a\pi(a\mid s)\sum_{s'}p(s'\mid s,a)r(s,a,s'),
$$

$$
P_\pi(s,s')=\sum_a\pi(a\mid s)p(s'\mid s,a).
$$

The fixed-policy equation is

$$
\boxed{v_\pi=r_\pi+\gamma P_\pi v_\pi}.
$$

For one selected state, the live ledger retains the unaggregated terms:

$$
(T_\pi V)(s)=\sum_a\sum_{s'}\pi(a\mid s)p(s'\mid s,a)
\left[r(s,a,s')+\gamma V(s')\right].
$$

Every term displays its policy probability, transition probability, reward, previous successor value, and combined contribution. This makes it possible to audit the scalar equation against the matrix row.

<a id="first-sweep"></a>

## Golden first sweep

Start with $V_0=0$, use the default rewards and no wind, and perform one **synchronous** sweep. Since every continuation value in $V_0$ is zero, the first vector is the policy-induced immediate-reward vector:

$$
\begin{aligned}
V_1={}&(-0.424,\,-0.232,\,-0.424,\,-0.424,\\
&-0.232,\,-0.424,\,-0.232,\,-0.424,\\
&-0.424,\,-0.232,\,-0.424,\,-0.024,\\
&-0.424,\,-0.424,\,-0.024,\,0)^{\mathsf T}.
\end{aligned}
$$

For example, state $0$ has two boundary outcomes (up and left), two ordinary moves (right and down), and a stay outcome. With the uniform policy, the five rewards are $-1,-0.04,-0.04,-1,-0.04$, whose average is $-0.424$. State $15$ has no post-termination row and remains zero.

All 16 values are computed from the same frozen $V_0$ and committed together. Reading a newly displayed value while calculating another state's row would silently turn the method into an asynchronous scheme.

<a id="matrix-and-reference"></a>

## Matrix form and an independent reference

The matrix tab exposes all 16 columns, including the terminal column. Rearranging gives

$$
(I-\gamma P_\pi)v_\pi=r_\pi.
$$

The Rust evaluator solves this 16×16 system with partial-pivoting Gaussian elimination. At the default configuration, the exact reference vector is approximately

$$
\begin{aligned}
v_\pi\approx(&-3.345201,-3.096646,-3.256641,-3.295713,\\
&-3.096646,-3.119565,-2.831253,-2.810181,\\
&-3.256641,-2.831253,-2.422653,-1.509235,\\
&-3.295713,-2.810181,-1.509235,0)^{\mathsf T}.
\end{aligned}
$$

The iterated vector and direct solution are two views of the same fixed policy. Their agreement is an implementation check, not a policy-improvement step.

<a id="residual-and-truncation"></a>

## Residual, convergence, and honest truncation

The live residual is always computed for the current vector:

$$
\delta_k=\lVert T_\pi V_k-V_k\rVert_\infty.
$$

With $0\le\gamma<1$ and a finite bounded model, $T_\pi$ is a contraction in the infinity norm. The UI reports **converged** only when $δ_k\le\varepsilon$. If the sweep cap is reached first, it reports **truncated**, even if the vector looks visually stable. Wind changes $P_\pi$; changing the policy preset changes both $r_\pi$ and $P_\pi$.

<a id="observation-tasks"></a>

## Observation tasks

1. Keep the uniform policy and no wind. Run one sweep and verify every entry of the golden $V_1$ vector.
2. Select state $0$ and compare the five policy-weighted terms with row $0$ of the matrix tab.
3. Enable 20% wind, reset, and explain which requested actions now contribute multiple actual-action rows while the policy remains unchanged.
4. Compare the current residual with the absolute change in one selected state. They are local and global quantities, so they need not match.
5. Set a strict tolerance and `Maximum sweeps = 1`. Run to the limit and verify that truncation is not called convergence.
6. Switch to the goal-seeking fixed policy, then reset. Explain why a new fixed point does not imply that the evaluator optimized the policy.

<a id="no-javascript"></a>

## Paper procedure without JavaScript

To reproduce the experiment by hand, enumerate all nonterminal states and actions, query the shared transition rows, multiply each row by $π(a\mid s)$, and aggregate equal next states into $P_\pi$. Then:

1. set all 16 entries of $V_0$ to zero;
2. calculate every row of $r_\pi+\gamma P_\pi V_k$ from the same old vector;
3. replace the entire vector at once;
4. compute $δ_k$ as the largest absolute difference between the next target and the current vector; and
5. stop only at the requested tolerance or an explicitly reported sweep cap.

The matrix table and selected-state ledger provide a numerical alternative to every visual element, so dense arrows and color intensity are never the sole source of information.

<a id="chapter-links"></a>

## Connect the experiment to Chapter 2

Read [state values](/en/learn/ch02/state-values) for the expectation being estimated, [the Bellman equation](/en/learn/ch02/bellman-equation) for the one-step decomposition, [matrix form](/en/learn/ch02/matrix-form) for the linear system, and [iterative policy evaluation](/en/learn/ch02/policy-evaluation) for the contraction and residual discussion.
