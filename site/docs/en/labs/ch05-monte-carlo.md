---
id: exp-ch05-monte-carlo
translation_key: exp-ch05-monte-carlo
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.1-5.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Monte Carlo episode lab
description: Reproduce return estimates with seeded episodes, compare visit strategies, and inspect MC Basic, exploring starts, and epsilon-greedy control.
aside: false
outline: deep
---

# Monte Carlo episode lab

This lab makes the Chapter 5 model-free boundary inspectable. Rust/Wasm generates or replays episodes in a Worker; Vue shows the realized trajectory, backward return ledger, visit counts, running means, policy probabilities, and replay metadata. No transition-probability table is used by the learner's update.

::: info Original companion experiment
The environment presets, controls, trace format, questions, and fallback calculations on this page are original companion material. They reference the upstream chapter's topics without redistributing its prose, figures, tables, examples, questions, or code.
:::

::: warning Model-free boundary
The environment may have stochastic movement (including the optional wind preset), but the MC update receives only the realized state and reward. It must not multiply by hidden probabilities or take a maximum after seeing an outcome.
:::

<MonteCarloLab locale="en" />

<noscript>
The interactive controls need JavaScript, but the episode format, return recurrence, visit rules, epsilon formula, and manual audit below remain available.
</noscript>

<a id="experiment-question"></a>

## Experiment question

How do sample usage and action-selection rules change the evidence available to a model-free learner? Keep the environment, discount factor, episode cap, and seed fixed while changing one factor at a time:

1. **MC Basic** versus **MC Exploring Starts** versus **MC ε-greedy**;
2. initial, first-visit, versus every-visit accounting; and
3. a no-wind environment versus the optional 20% wind preset.

The final item changes the distribution of realized episodes. It does not expose that distribution to the estimator.

<a id="environment"></a>

## Episodic environment and controls

The default environment is a finite 4×4 Grid World shared with the earlier chapters. State IDs are row-major, state 0 is the start, state 15 is a terminating goal, and states 6 and 9 are hazards. Actions are up, right, down, left, and stay. The environment emits an immediate reward on each transition and ends on the goal or an explicit time limit; entering a hazard supplies its hazard reward but does **not** terminate the episode.

The lab controls are intentionally explicit:

| Control | Baseline | Meaning |
| --- | ---: | --- |
| algorithm mode | MC Basic | return estimator and policy schedule |
| visit strategy | initial | which occurrences receive a return sample |
| discount $\gamma$ | 0.9 | return weighting |
| $\varepsilon$ | 0.2 | policy softness for ε-greedy mode |
| episodes | 100 | sample budget |
| maximum steps | 40 | natural termination versus time-limit truncation |
| seed | `5eed` | deterministic replay key (hexadecimal) |
| wind | off | optional stochastic directional outcomes |

The Worker and Rust/Wasm engine validate the same ranges as the UI. An invalid value should produce a recoverable message rather than silently clamping a scientific parameter.

<a id="trace-contract"></a>

## What one trace records

Every episode should expose at least:

| Field | Why it matters |
| --- | --- |
| episode index and seed | replay and comparison |
| start state/action | distinguish ordinary starts from exploring starts |
| step list $(s_t,a_t,r_{t+1},s_{t+1})$ | evidence for each realized transition |
| terminated/truncated flag | define the return horizon |
| suffix return $G_t$ | connect a visit to its sample |
| credited flag | verify initial/first/every filtering |
| count and running mean | inspect the estimator update |
| policy probabilities and ε | separate exploitation from exploration |

If a field is unavailable because a browser has JavaScript disabled, the static instructions below still define how to reconstruct it.

<a id="algorithm-modes"></a>

## Three modes, one return primitive

| Mode | Start protocol | Policy update | Typical observation |
| --- | --- | --- | --- |
| MC Basic | deterministic lexicographic 75-pair sweep | greedy after each completed episode | one credited return per episode with `initial` |
| MC Exploring Starts | seeded permutation of the 75 legal pairs, explicit forced pair | greedy after each completed episode | broader counts with `first`/`every` |
| MC ε-greedy | ordinary state start | ε-greedy around current $Q$ maxima | persistent non-greedy action visits |

The exact timing of policy updates is part of the trace. A mode label without that timing is not enough to reproduce a run.

<a id="return-calculation"></a>

## Return calculation

For an episode with rewards $R_1,\ldots,R_T$, the Worker scans from the end:

$$
G\leftarrow0,
\qquad
G_t=R_{t+1}+\gamma G_{t+1}.
$$

When a visit filter credits $(S_t,A_t)$, update

$$
N(S_t,A_t)\leftarrow N(S_t,A_t)+1,
\qquad
Q(S_t,A_t)\leftarrow Q(S_t,A_t)+
\frac{G_t-Q(S_t,A_t)}{N(S_t,A_t)}.
$$

The implementation may store a return sum instead, but the displayed mean must agree with the same count and credited returns. An unvisited pair has no estimate; it is not an observed value of zero.

<a id="epsilon-policy"></a>

## ε-greedy policy check

If a state has $m$ legal actions and one selected greedy representative, the lab uses

$$
\pi_\varepsilon(a\mid s)=
\begin{cases}
1-\varepsilon+\varepsilon/m, & a=a^*(s),\\[4pt]
\varepsilon/m, & a\ne a^*(s).
\end{cases}
$$

The abstract four-action example with $\varepsilon=0.2$ has row $0.85,0.05,0.05,0.05$. The default Grid World has five actions (including **stay**), so its corresponding row is $0.84,0.04,0.04,0.04,0.04$ when one action is uniquely greedy. Verify the applicable row sums to one and that the selected action is sampled **before** the environment emits a wind or slip outcome.

<a id="wind-protocol"></a>

## Wind protocol

Run the no-wind baseline first and save the seed. Then enable **wind 20%**. The environment's directional outcome probabilities become part of the sampling process; the MC learner still sees only realized transitions. Compare return variance and visit coverage, not just the final arrow map.

The introductory [transition/Markov experiment](/en/labs/ch01-gridworld) includes a guided prompt that asks the learner to turn on wind after inspecting the deterministic baseline. This lab assumes that prerequisite and keeps the wind control explicit in its replay metadata.

<a id="audit-panel"></a>

## Audit panel questions

Use the live audit panel, then answer:

1. Does each credited visit have exactly one suffix return?
2. Does first-visit suppress later occurrences of the same key in one episode?
3. Does every-visit include repeated keys, even when their suffixes differ?
4. Are `terminated` and `truncated` distinct?
5. Does an ε-greedy row sum to one for every visited state?
6. Can changing only the seed change a finite estimate while preserving the configuration?
7. Is any hidden transition probability used inside the MC update?

The intended answers are yes, yes, yes, yes, yes, yes, and no. A failed answer is a useful diagnostic; it is not a reason to hide the trace.

<a id="comparison-table"></a>

## Comparison worksheet

Reset before each row and record the same fields:

| Run | Mode | Visit | ε | Wind | Episodes | Covered pairs | Mean return | Truncated episodes |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| A | MC Basic | initial | 0 | off |  |  |  |  |
| B | Exploring Starts | first | 0 | off |  |  |  |  |
| C | Exploring Starts | every | 0 | off |  |  |  |  |
| D | ε-greedy | every | 0.2 | off |  |  |  |  |
| E | ε-greedy | every | 0.2 | on |  |  |  |  |

Do not rank rows by mean return alone. Coverage, variance, and the policy-generation rule are part of the result.

<a id="manual-check"></a>

## No-JavaScript manual check

Use the small checkpoint trajectory below:

```text
(X, go), 0, (Y, back), −0.2, (X, go), 0, (Y, finish), +1, terminal
```

With $\gamma=0.5$, the backward returns are $1$, $0.5$, $0.05$, and $0.025$. For every-visit, the final mean for $(X,\mathrm{go})$ is $(0.5+0.025)/2=0.2625$; $(X,\mathrm{quit})$ remains unvisited. For the abstract four-action check at $\varepsilon=0.2$, verify $(.85,.05,.05,.05)$; for the default five-action Grid World, verify $(.84,.04,.04,.04,.04)$. These checks require no animation or network request.

<a id="reproducibility"></a>

## Reproducibility notes

The run is identified by the algorithm mode, visit strategy, discount, ε schedule, start protocol, wind setting, episode/step caps, seed, and engine version. Exporting the episode trace is stronger evidence than exporting only the final heatmap. If replay differs, compare the first differing random draw or transition rather than rounding the final means until they match.

<a id="read-next"></a>

## Continue

Return to [MC Basic](../learn/ch05/mc-basic), [Exploring Starts](../learn/ch05/exploring-starts), and [epsilon-greedy](../learn/ch05/epsilon-greedy) while changing one lab control at a time. Finish with the [chapter checkpoint](../learn/ch05/checkpoint).
