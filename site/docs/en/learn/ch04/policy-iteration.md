---
id: ch04-policy-iteration
translation_key: ch04-policy-iteration
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Policy iteration: evaluate, then improve"
description: Separate fixed-policy evaluation from greedy improvement, prove monotone progress, and define a stable stopping test.
outline: deep
---

# Policy iteration: evaluate, then improve

Policy iteration changes the schedule used by value iteration. Instead of taking one optimality backup and immediately moving on, it commits to a policy, evaluates that policy, and then asks whether a different action would be better against the evaluated values.

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. write the fixed-policy Bellman equation and its linear-system form;
2. distinguish exact policy evaluation from a finite iterative approximation;
3. state the policy-improvement inequality and its assumptions;
4. explain why a stable greedy policy solves the optimality equation; and
5. handle ties and approximate evaluation without reporting a false convergence.

<a id="fixed-policy"></a>

## Hold the policy fixed

For a policy $\pi$, average the action backups before taking any maximum:

$$
(T_\pi v)(s)=\sum_a\pi(a\mid s)
\sum_{s',r}p(s',r\mid s,a)[r+\gamma v(s')].
$$

Its state value is the fixed point

$$
v_\pi=T_\pi v_\pi.
$$

When the model is represented by an expected-reward vector $r_\pi$ and a policy-induced transition matrix $P_\pi$, this becomes

$$
v_\pi=r_\pi+\gamma P_\pi v_\pi,
\qquad
(I-\gamma P_\pi)v_\pi=r_\pi.
$$

The linear system is a convenient description, not a requirement that a browser explicitly invert a matrix. Direct solves, iterative sweeps, or a sparse method are valid implementations if they expose their tolerance and numerical status.

<a id="evaluation"></a>

## The evaluation subproblem

There are three useful meanings of “evaluate”:

| Mode | Computation | Status of the returned vector |
| --- | --- | --- |
| direct | solve $(I-\gamma P_\pi)u=r_\pi$ | an approximation to the exact fixed point, subject to linear-solver error |
| iterative | $u_{j+1}=T_\pi u_j$ until a residual threshold | a certified approximation when the contraction assumptions and tolerance are stated |
| finite-depth | perform exactly $j_{\mathrm{eval}}$ sweeps | a work-limited estimate; not automatically $v_\pi$ |

The outer algorithm can use direct or iterative evaluation. The third row belongs naturally to truncated policy iteration and is discussed separately. A trace should preserve the outer index $k$ (which policy is being evaluated) and the inner index $j$ (which evaluation sweep is running); collapsing them makes the schedule impossible to audit.

<a id="improvement"></a>

## Improve with a complete action comparison

Once $v_{\pi_k}$ is available, compute

$$
q_{\pi_k}(s,a)=B_{v_{\pi_k}}(s,a).
$$

Choose a new policy whose support is contained in the maximizing set:

$$
\mathcal A_k^+(s)=\arg\max_{a\in A(s)}q_{\pi_k}(s,a),
\qquad
\pi_{k+1}(a\mid s)>0\Rightarrow a\in\mathcal A_k^+(s).
$$

The usual implementation chooses one deterministic member per state, while the lab keeps all ties visible. Terminal states again have no policy row.

Why does this help? The greedy choice satisfies

$$
(T_{\pi_{k+1}}v_{\pi_k})(s)
\geq(T_{\pi_k}v_{\pi_k})(s)=v_{\pi_k}(s)
$$

for every state. Both $T_\pi$ operators are monotone and $\gamma$-contractive. Repeatedly applying $T_{\pi_{k+1}}$ to the inequality gives

$$
v_{\pi_{k+1}}\geq v_{\pi_k}
$$

componentwise. A strict one-step advantage can yield strict improvement in states that can reach it; it need not make every state strictly larger.

<a id="convergence"></a>

## Why a stable policy is optimal

Suppose exact evaluation finds $v_{\pi}$ and no state has an action backup larger than the policy's current value:

$$
\max_a B_{v_\pi}(s,a)=v_\pi(s)
\quad\text{for every nonterminal }s.
$$

Then $T_*v_\pi=v_\pi$. Chapter 3's uniqueness result identifies this fixed point with $v_*$. Thus policy iteration need not compare every possible policy explicitly; it only needs to find a policy that is greedy with respect to its own evaluated value.

With deterministic policies and a deterministic tie rule, every nonterminal state has finitely many policy choices. Each strict improvement changes at least one choice and cannot decrease any value, so the outer loop terminates after finitely many changes. If ties are resolved inconsistently, two equally good policies can alternate forever even though their values are identical. The implementation should either preserve tie sets, canonicalize them, or stop when the greedy **set** is unchanged.

<a id="implementation"></a>

## Outer-loop pseudocode

```text
input: known model, initial policy π0
for k = 0, 1, …:
    evaluate πk:
        solve vπk = Tπk vπk (directly or to a declared inner tolerance)
    for each nonterminal state s:
        compute qπk(s,a) for every legal action a
        greedy[s] ← argmax_a qπk(s,a)
    if greedy policy/set is unchanged from πk:
        return πk, vπk, stable
    πk+1 ← deterministic or stochastic policy supported on greedy[s]
return truncated with the last diagnostic
```

The outer stopping test and the inner evaluation test must be reported separately. Reaching an inner sweep cap does not mean the policy was evaluated exactly, and finding a small inner residual does not by itself mean the policy is optimal.

<a id="shared-grid"></a>

## Read the schedule in the shared Grid World

The planning lab starts from a deterministic representative of the zero-vector greedy sets (the lowest documented action code at each state), rather than silently inventing a terminal action. Policy iteration first evaluates that visible initial policy; only after that evaluation does it compare moving actions. In later outer rounds, states near the goal usually acquire decisive greedy choices before distant states, but this is a feature of the particular model, not a theorem that spatial diagrams always reveal.

Turn on the 20% wind preset only after observing the no-wind run. The policy evaluator and the greedy comparison both receive the same changed outcome ledger. Wind is not an extra post-decision action, and a policy iteration trace must not select a different action for each slipped outcome.

<a id="stopping"></a>

## Three honest stopping states

The UI distinguishes:

- **stable:** the evaluated policy's greedy set is unchanged and the inner evaluation passed its tolerance;
- **inner-truncated:** the policy-improvement step used an approximate value because its evaluation budget ended; and
- **outer-truncated:** the maximum number of policy improvements was reached before stability.

If an approximate evaluation makes two actions nearly tied, report the tie tolerance and keep the ambiguity visible. A rounded table should never be the sole reason for declaring a policy stable.

<a id="pitfalls"></a>

## Common schedule mistakes

1. **Calling one $T_*$ sweep policy iteration.** That is value iteration unless a policy was fixed and evaluated separately.
2. **Using $v_{k+1}$ while computing another state's backup.** That silently changes the declared evaluation method.
3. **Maximizing after observing a stochastic outcome.** The action must be selected before the model reveals the outcome.
4. **Treating a tie-break as a mathematical fact.** One deterministic representative is an implementation choice; the maximizing set is the mathematical object.
5. **Confusing policy stability with numerical precision.** Both the inner residual and the outer greedy test matter.

<a id="lab"></a>

## Observe it in the planner

In the [planning lab](/en/labs/ch04-planning-grid), choose **Policy iteration** and open the trace table. Each outer row identifies the policy, the number of inner evaluation sweeps, the evaluated value vector, the best action per state, and whether the policy changed. Compare it with a value-iteration run using the same initial values; the final optimal value should agree within tolerance even though the intermediate schedules differ.

<a id="read-next"></a>

## Next: stop the inner solve on purpose

Exact evaluation can be expensive when the model is large. [Truncated policy iteration](./truncated-policy-iteration) keeps the outer policy-improvement idea but limits the number of inner sweeps, placing value iteration and policy iteration on one continuum.
