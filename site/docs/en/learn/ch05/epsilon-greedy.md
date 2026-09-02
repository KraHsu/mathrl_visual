---
id: ch05-epsilon-greedy
translation_key: ch05-epsilon-greedy
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "MC ε-greedy: soften the policy"
description: Derive epsilon-greedy action probabilities, remove forced starts, and keep the fixed-epsilon optimality claim precise.
outline: deep
---

# MC ε-greedy: soften the policy

Exploring starts solves coverage by controlling where an episode begins. A softer alternative controls what the policy does at every visited state. MC ε-greedy replaces a deterministic greedy choice with a distribution that still favours the best estimated action while assigning every legal action a nonzero probability.

::: info Original companion note
The probability table, sampler, and tie discussion below are original. They follow the upstream ε-greedy topic without reproducing its prose, formula layout, figures, pseudocode, or examples.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. define a soft policy and an ε-greedy policy;
2. derive the probabilities under the “uniform exploration may repeat the greedy action” convention;
3. sample an action without accidentally giving the greedy action the wrong mass;
4. explain how ε removes the exploring-starts requirement; and
5. qualify what “optimal” means when ε is fixed above zero.

<a id="soft-policy"></a>

## Soft policies provide coverage

A policy is **soft** when every legal action has positive probability at every nonterminal state:

$$
\pi(a\mid s)>0\quad\text{for all }a\in A(s).
$$

With a soft policy, a long enough episode can revisit many state–action pairs even when its start is drawn from a single ordinary distribution. This does not guarantee fast coverage: a tiny probability can still require a very long run. It removes the need to teleport to every pair, not the need to collect data.

<a id="formula"></a>

## Deriving the ε-greedy distribution

Let $a^*(s)$ be one representative of the maximizing actions in $Q(s,\cdot)$, let $m=|A(s)|$, and let $\varepsilon\in[0,1]$. Use the following sampler:

1. with probability $1-\varepsilon$, take $a^*(s)$;
2. with probability $\varepsilon$, draw uniformly from all $m$ legal actions (the greedy action may be drawn again).

The resulting probabilities are

$$
\pi_\varepsilon(a\mid s)=
\begin{cases}
1-\varepsilon+\dfrac{\varepsilon}{m}, & a=a^*(s),\\[6pt]
\dfrac{\varepsilon}{m}, & a\ne a^*(s).
\end{cases}
$$

Equivalently, the greedy action has mass $1-\frac{m-1}{m}\varepsilon$, and the other $m-1$ actions each have mass $\varepsilon/m$. The probabilities sum to one. Some libraries define exploration as “choose uniformly among non-greedy actions”; that is a different convention, so record the convention with the trace.

<a id="four-action-example"></a>

## Four-action example

Suppose $A(s)=\{\mathrm{up},\mathrm{right},\mathrm{down},\mathrm{left}\}$, $Q(s,\mathrm{right})$ is uniquely largest, and $\varepsilon=0.2$. Under the convention above:

| action | probability |
| --- | ---: |
| right (greedy) | $1-0.2+0.2/4=0.85$ |
| up | $0.05$ |
| down | $0.05$ |
| left | $0.05$ |

At $\varepsilon=0$, the policy is greedy. At $\varepsilon=1$, it is uniform. For $0<\varepsilon\le1$, every action remains discoverable. Do not confuse this policy probability with an environment's wind probability: one is the agent's choice, the other is a transition outcome after the choice.

<a id="sampling"></a>

## Sampling without a probability bug

One implementation samples a uniform $u\in[0,1)$ and uses cumulative intervals:

```text
u < 1 − ε + ε/m       → choose the greedy representative
otherwise             → choose the remaining interval by action order
```

This shorthand is safe only if the remaining interval is split into $m-1$ pieces of width $\varepsilon/m$. A more literal two-stage sampler (greedy branch, then uniform exploration branch) is often easier to audit and handles ties explicitly.

For multiple greedy actions, choose a deterministic representative for the exploitation branch and retain the full maximizing set in metadata. Alternatively, distribute the exploitation mass over all tied maxima; that is a valid variant but changes the stated policy probabilities. A trace should say which tie rule it used.

<a id="policy-improvement"></a>

## Changing the improvement step

MC Basic and MC Exploring Starts can improve greedily:

$$
\pi_{k+1}(s)\in\arg\max_{\pi(\cdot\mid s)}
\sum_a\pi(a\mid s)Q_k(s,a).
$$

The ε-greedy variant restricts the choice to the family $\Pi_\varepsilon$ of policies with the specified exploration rate:

$$
\pi_{k+1}(\cdot\mid s)\in\arg\max_{\pi\in\Pi_\varepsilon}
\sum_a\pi(a\mid s)Q_k(s,a).
$$

Under the sampler convention above, selecting a maximizing representative gives the distribution just derived. The policy is optimal **within** $\Pi_\varepsilon$ when the estimates and coverage are sufficient. It need not be optimal among all policies in $\Pi$ because forced exploration has a cost.

<a id="algorithm"></a>

## MC ε-greedy in one loop

```text
initialize Q and count for every legal (s, a)
initialize a soft policy π_ε and a seedable random generator
for each episode:
  draw an ordinary start state (no forced state–action pair required)
  follow π_ε to generate a complete or explicitly truncated episode
  scan the episode backward and update every selected visit's return mean
  at each updated state:
    choose a* from argmax_a Q(state, a)
    install the ε-greedy probabilities around a*
```

The policy remains soft after improvement, so an action that currently looks poor can still be sampled later. If $\varepsilon$ is changed over time, record the schedule and the value used for each episode; a final policy with $\varepsilon=0.1$ is not the same estimator as one trained with a fixed $\varepsilon=0.1$ from the beginning.

<a id="claims-and-caveats"></a>

## Claims and caveats

With enough samples and suitable coverage, MC ε-greedy can approach the best policy inside the fixed-$\varepsilon$ family. Three qualifications matter:

- finite counts leave statistical error;
- a fixed positive ε intentionally sacrifices exploitation; and
- changing ε toward zero can improve the final policy but changes the data distribution and the convergence argument.

Thus “the run converged” should identify the policy family, episode budget, seed, visit strategy, and whether ε was fixed or scheduled.

<a id="lab-connection"></a>

## Read it in the lab

In the [Monte Carlo lab](/en/labs/ch05-monte-carlo), select **MC ε-greedy**, set $\varepsilon=0.2$, and inspect one state's probability row. The four-action row should be $0.85,0.05,0.05,0.05$ when one action is uniquely greedy. Change $\varepsilon$ to $0$ and $1$ to verify the endpoints, then compare coverage counts with the forced-start mode using the same seed where the start protocol permits it.

<a id="check-yourself"></a>

## Check yourself

There are five legal actions and two tied greedy actions. Your implementation chooses the first tied action as the exploitation representative, uses uniform exploration, and sets $\varepsilon=0.5$.

The selected representative has probability $0.5+0.5/5=0.6$; each other action has probability $0.1$. The second tied action is not automatically assigned $0.6$ under this tie rule. If you want both tied actions to share exploitation mass, state that as a different tie policy and recompute the row.

<a id="read-next"></a>

## Continue

Read [Exploration and exploitation](./exploration-exploitation) to interpret the cost of a positive ε. Then use the [checkpoint](./checkpoint) to test the whole model-free chain from sample means to policy probabilities.
