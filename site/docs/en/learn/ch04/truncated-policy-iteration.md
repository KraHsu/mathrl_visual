---
id: ch04-truncated-policy-iteration
translation_key: ch04-truncated-policy-iteration
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d16a55302a9aff5fad518fb18a518d202376ac97
source_pdf_sha256: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Truncated policy iteration: one continuum of schedules"
description: Limit the inner policy-evaluation depth, relate the endpoints to value and policy iteration, and report approximation honestly.
outline: deep
---

# Truncated policy iteration: one continuum of schedules

Policy iteration's inner evaluation can be stopped after a finite number of sweeps. The resulting method is often called truncated policy iteration (truncated PI), modified policy iteration, or finite-depth policy iteration. The name matters less than the contract: state exactly how many fixed-policy updates were performed and what value those updates started from.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. write the inner and outer loops of truncated PI;
2. explain the endpoint relationship with value iteration and policy iteration;
3. identify when a finite-depth vector is only an approximation;
4. choose a fixed or adaptive inner depth without confusing it with convergence; and
5. compare schedules by work and information, not by iteration labels alone.

<a id="inner-loop"></a>

## A finite inner evaluation

At outer round $k$, hold $\pi_k$ fixed and begin with an explicitly named vector $u_0$. Apply

$$
u_{j+1}=T_{\pi_k}u_j,
\qquad j=0,1,\ldots,j_{\mathrm{eval}}-1,
$$

then set $v_k=u_{j_{\mathrm{eval}}}$ and improve the policy using

$$
q_k(s,a)=B_{v_k}(s,a),
\qquad
\pi_{k+1}(\cdot\mid s)\subseteq
\arg\max_a q_k(s,a).
$$

The phrase “truncate” refers to stopping the **inner** fixed-policy sequence, not to deleting outcomes from the model. Every inner sweep still sums the complete stochastic outcome row.

<a id="endpoints"></a>

## The two endpoints—and the condition behind them

The depth axis has a useful interpretation:

| Inner depth | Schedule | Qualification |
| ---: | --- | --- |
| $j_{\mathrm{eval}}=1$ | value-iteration-like | with a matched initialization and a policy greedy with respect to the previous vector, the one inner backup is the $T_*$ backup; arbitrary initialization can make the traces differ |
| finite $j_{\mathrm{eval}}>1$ | truncated PI | more fixed-policy propagation per outer improvement, but the returned vector is still approximate unless separately converged |
| $j_{\mathrm{eval}}\to\infty$ | policy iteration | the inner limit is $v_{\pi_k}$ under the contraction assumptions |

Thus “value iteration is truncated PI with depth one” is a statement about a matched schedule, not a license to rename every one-step update. The initial vector and when the greedy policy is formed must be visible in a reproducible trace.

<a id="algorithm"></a>

## Outer and inner pseudocode

```text
input: known model, initial policy π0, inner depth J
set v ← an explicit initial vector
repeat until the outer stopping rule fires:
    old_policy ← π
    for j = 1 … J:
        v ← synchronous fixed-policy backup Tπ(v)
    for each nonterminal state s:
        q[s,a] ← B_v(s,a) for every action a
        π ← a policy supported on argmax_a q[s,a]
    record inner residuals, policy-change mask, and v
return π, v, and whether the outer run was stable or truncated
```

An implementation may reset the inner vector to the previous outer vector, carry it forward, or use a direct solve. These choices affect the path and must be part of the experiment configuration. The lab uses a carry-forward vector so that changing $J$ changes only the amount of inner work.

<a id="monotonicity"></a>

## What finite evaluation does—and does not—guarantee

If the inner sequence starts at the previous policy's exact value and the new policy is chosen greedily from that value, monotonicity arguments show that each fixed-policy backup does not move below the previous value in the usual componentwise order. This is a useful explanatory condition, not a blanket property of every approximate implementation.

With an arbitrary approximate starting vector, a finite inner sweep may move one coordinate down, and a policy can appear to regress before later rounds recover. That does not automatically indicate a bug. It does mean the trace must report the initialization, inner residual, and outer policy change rather than displaying only a rising “score.”

The finite-depth vector is not generally $v_{\pi_k}$:

$$
\|v_k-v_{\pi_k}\|_\infty
\leq \gamma^{j_{\mathrm{eval}}}
\|u_0-v_{\pi_k}\|_\infty
$$

under the fixed-policy contraction. The bound explains why extra inner work can help, but it does not choose a universally best depth.

<a id="tradeoffs"></a>

## Compare work, not just outer rounds

For $K$ outer rounds, $J$ inner sweeps, $n$ states, $m$ actions, and $d$ outcomes per action, the dominant model-query work is approximately $O(KJnd)$ for fixed-policy evaluation plus $O(Knmd)$ for greedy improvement. A policy-iteration trace with few outer rounds can therefore perform more model work than a value-iteration trace with many cheap rounds.

| Question | Small $J$ | Large $J$ |
| --- | --- | --- |
| How often is the policy reconsidered? | frequently | infrequently |
| How accurate is each evaluated vector? | lower | higher |
| Inner work per outer round | lower | higher |
| Useful when | action choices change rapidly | policy evaluation propagates useful structure |

Adaptive schemes can increase $J$ when the greedy set is unstable and decrease it when the inner residual is already small. Such a scheme is still truncated PI; its adaptation rule belongs in the recorded algorithm version.

<a id="stopping"></a>

## Two layers of stopping

The planner should expose two independent tests:

- **inner test:** did $\|T_{\pi_k}u_j-u_j\|_\infty$ fall below the inner tolerance, or did the fixed depth end first?
- **outer test:** did the greedy policy/set stop changing, or did the outer budget end first?

If a fixed depth is requested, reaching the inner tolerance early is useful information but does not authorize silently spending extra sweeps unless the configuration says “adaptive.” Conversely, reaching the outer policy budget with a small last update is still a truncated run if the declared policy-stability test was not satisfied.

<a id="lab"></a>

## Sweep the depth in the planner

Open the [planning lab](/en/labs/ch04-planning-grid), select **Truncated PI**, and compare depths $J=1$, $J=2$, and $J=8$ from the same initial policy and model. Keep the model and stopping tolerances fixed. The table should show outer rounds, inner sweeps, policy changes, the outer-step maximum update magnitude, the optimality residual, and total model backups. Then repeat with the 20% wind preset; this tests sensitivity to dynamics rather than a hidden change of schedule.

<a id="read-next"></a>

## Next: name the common pattern

The depth continuum is one instance of [generalized policy iteration](./generalized-policy-iteration): a value estimate is improved and a policy is improved in an interacting loop. The next unit also draws the boundary between a known model, model-based learning, and model-free learning.
