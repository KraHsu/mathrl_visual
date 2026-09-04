---
id: ch03-checkpoint
translation_key: ch03-checkpoint
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 9806707397947da8e8d46be903d9ddb02c000211
source_pdf_sha256: 669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c
source_sections: "3.6-3.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Chapter 3 checkpoint
description: Connect policy improvement, Bellman optimality, contraction, residual certificates, policy ties, and model sensitivity in one original queue model.
outline: deep
---

# Chapter 3 checkpoint

This checkpoint continues the original night document queue from Chapter 2. The model is small enough to calculate completely, yet it exposes an important control lesson: one safe greedy improvement need not be the final optimal policy.

::: info Original companion exercise
The scenario, model, values, questions, and explanations on this page are original companion material. They follow the chapter's topic scope without reproducing upstream prose, proofs, figures, tables, examples, questions, or code.
:::

<a id="scenario"></a>

## Scenario and model audit

There are two nonterminal states, $Q$ (queued) and $R$ (under review), plus terminal state $T$. Let $\gamma=0.5$ and $v(T)=0$. Outcomes are deterministic after an action:

| State | Action | Next state | Reward |
| --- | --- | --- | ---: |
| $Q$ | hold | $Q$ | $-1$ |
| $Q$ | forward | $R$ | $+1$ |
| $Q$ | inspect | $T$ | $+2$ |
| $R$ | return | $Q$ | $0$ |
| $R$ | recheck | $R$ | $-2$ |
| $R$ | submit | $T$ | $+4$ |

The Chapter 2 policy uses probabilities $(0.5,0.5,0)$ at $Q$ and $(0.25,0.25,0.5)$ at $R$. Its evaluated values are

$$
v_\pi=(0.6,1.8)
$$

in state order $(Q,R)$. Confirm that every policy row is normalized and that terminal entry rewards $2$ and $4$ are counted even though the continuation value at $T$ is zero.

<a id="policy-improvement"></a>

## 1. Perform a greedy policy improvement

Using the supplied $v_\pi$, the action values are

$$
q_\pi(Q)=(-0.7,1.9,2),
\qquad
q_\pi(R)=(0.3,-1.1,4),
$$

in table order. Reconstruct all six numbers from $r+0.5v_\pi(s')$, then answer:

1. Which action does a deterministic policy greedy with respect to $q_\pi$ choose in each state?
2. Why does each selected value dominate the old policy average?
3. What are the values of the improved policy?
4. Is that improved policy already optimal?

::: details Check your answer
The greedy policy chooses inspect at $Q$ and submit at $R$. The selected action value is a maximum and therefore cannot be below the old policy-weighted average. Both actions terminate immediately, so the improved-policy values are $(2,4)$.

The policy is improved but not optimal. Re-evaluate “forward” using the new continuation value at $R$:

$$
1+0.5(4)=3>2.
$$

A second greedy step changes $Q$ to forward while retaining submit at $R$.
:::

<a id="optimality-equations"></a>

## 2. Write and solve the optimality equations

For an arbitrary vector $v=(v_Q,v_R)$, write every complete action backup before taking a maximum:

$$
\begin{aligned}
(T_*v)(Q)
&=\max\{-1+0.5v_Q,\ 1+0.5v_R,\ 2\},\\
(T_*v)(R)
&=\max\{0.5v_Q,\ -2+0.5v_R,\ 4\}.
\end{aligned}
$$

Propose $v_*=(3,4)$, substitute it into both equations, and verify all competing actions rather than only the proposed maximizers.

::: details Check your answer
At $Q$, the three backups are $(0.5,3,2)$, whose maximum is $3$. At $R$, they are $(1.5,0,4)$, whose maximum is $4$. Thus $T_*v_*=v_*$.

The maximizing actions are forward at $Q$ and submit at $R$. Their fixed-policy equations are $v(Q)=1+0.5v(R)$ and $v(R)=4$, which also solve to $(3,4)$. The contraction result makes this Bellman optimality fixed point unique.
:::

<a id="sweeps"></a>

## 3. Trace synchronous optimality backups

Start from

$$
v^{(0)}=(0,0)
$$

and freeze the old vector throughout each sweep. The first two applications are

$$
v^{(1)}=(2,4),
\qquad
v^{(2)}=(3,4).
$$

The current-vector residual sequence is

$$
\lVert T_*v^{(0)}-v^{(0)}\rVert_\infty=4,
$$

$$
\lVert T_*v^{(1)}-v^{(1)}\rVert_\infty=1,
$$

$$
\lVert T_*v^{(2)}-v^{(2)}\rVert_\infty=0.
$$

Explain why “inspect” is greedy at $Q$ in the first image but “forward” becomes greedy after the value $4$ has propagated from $R$. This is not an in-place update: both coordinates in a sweep read the same frozen input.

<a id="contraction"></a>

## 4. Check a two-trace contraction

Use two initial vectors

$$
u_0=(0,0),
\qquad
w_0=(10,10),
$$

whose infinity-norm distance is $d_0=10$. Applying the same operator gives

$$
u_1=(2,4),
\qquad
w_1=(6,5),
\qquad
d_1=4,
$$

and

$$
u_2=(3,4),
\qquad
w_2=(3.5,4),
\qquad
d_2=0.5.
$$

Verify

$$
d_1=4\leq0.5d_0=5,
\qquad
d_2=0.5\leq0.5d_1=2.
$$

The observed ratios are $0.4$ and $0.125$, not exactly $\gamma=0.5$. The theorem promises shrinkage by a factor **at most** $\gamma$; the actual model can contract faster.

<a id="residual"></a>

## 5. Turn a residual into a certificate

Take the approximation

$$
\tilde v=(2.8,4).
$$

Its Bellman image is $(3,4)$, so

$$
\rho(\tilde v)=\lVert T_*\tilde v-\tilde v\rVert_\infty=0.2.
$$

With $\gamma=0.5$,

$$
\lVert\tilde v-v_*\rVert_\infty
\leq\frac{0.2}{1-0.5}=0.4.
$$

The actual error is $\max(|2.8-3|,|4-4|)=0.2$. State clearly which number is observed, which is guaranteed, and why the bound need not be tight.

<a id="ties"></a>

## 6. Create multiple optimal policies without multiple optimal values

Change only the inspect reward from $2$ to $3$. At $v_*=(3,4)$,

$$
q_*(Q)=(0.5,3,3),
$$

so forward and inspect tie. At $R$, submit remains the unique maximizer. The value function is still the unique $(3,4)$, but there are now:

- a deterministic optimum that forwards at $Q$;
- a deterministic optimum that inspects at $Q$; and
- infinitely many stochastic optima that mix only those two actions at $Q$.

Explain why putting positive probability on hold would break the greedy equality $T_{\pi_*}v_*=T_*v_*$.

<a id="factors"></a>

## 7. Change the decision problem carefully

Analyze each counterfactual separately:

1. **Discount:** solve where inspect reward $2$ ties forward when $R$ can optimally submit for $4$. Since forward is $1+4\gamma$, the tie occurs at $\gamma=0.25$.
2. **Positive scaling:** multiplying all rewards by $10$ multiplies all values by $10$ and preserves the maximizing actions.
3. **Continuing affine shift:** under a truly continuing infinite-horizon convention, adding $\beta$ to every reward shifts every policy value by $\beta/(1-\gamma)$.
4. **Episodic caveat:** under variable-length termination, the number of shifted rewards depends on episode length, so a constant addition can change a policy.
5. **Dynamics:** if forwarding sometimes sends a document back to $Q$ with a penalty, recompute its full expectation before comparing it with immediate inspection.

Do not transfer the continuing-task affine rule to a terminating model without first reconciling the return convention.

<a id="integrated-check"></a>

## Integrated check

Without looking back, complete this audit in order:

1. write the joint-outcome definition of $q_*(s,a)$;
2. write both queue optimality equations;
3. explain why a maximum over policy probabilities has a deterministic maximizer;
4. show that $(3,4)$ is a fixed point;
5. recover every maximizing action;
6. state why the fixed point is unique for $\gamma=0.5$;
7. calculate the residual at $(2.8,4)$;
8. turn it into an infinity-norm error certificate;
9. construct a reward edit that creates tied optimal policies; and
10. identify which claims would no longer follow automatically at $\gamma=1$.

::: details Completion criteria
A complete answer keeps the environment expectation inside each action backup and the action maximum outside it; distinguishes $q_\pi$ from $q_*$; checks all unselected actions; says the contraction modulus is at most $\gamma$; separates residual, certified bound, and actual error; treats argmax as a set under ties; and refuses to apply the discounted contraction proof at $\gamma=1$.
:::

<a id="chapter-links"></a>

## Continue from the checkpoint

Use the [Bellman optimality Grid World lab](/en/labs/bellman-optimality-grid) to repeat this audit over 16 states and five actions. Then continue to Chapter 4 for complete value-iteration and policy-iteration algorithms.

Chapter 3 pages: [Overview](/en/learn/ch03/) · [Policy improvement](/en/learn/ch03/policy-improvement) · [Optimal values](/en/learn/ch03/optimal-values) · [Optimality equation](/en/learn/ch03/optimality-equation) · [Contraction](/en/learn/ch03/contraction) · [Greedy policies](/en/learn/ch03/greedy-policies) · [Model factors](/en/learn/ch03/factors) · [Checkpoint](/en/learn/ch03/checkpoint) · [Lab](/en/labs/bellman-optimality-grid)
