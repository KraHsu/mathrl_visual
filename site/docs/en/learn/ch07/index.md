---
id: ch07-overview
translation_key: ch07-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.1-7.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 7: Temporal-difference methods"
description: Learn why a one-step target can replace a complete return, then compare TD(0), SARSA, n-step SARSA, and Q-learning.
outline: deep
---

# Chapter 7: Temporal-difference methods

Temporal-difference (TD) learning updates a prediction as soon as a transition arrives. It combines the incremental discipline of Chapter 6 with the Bellman targets from Chapters 2–4.

::: info Content boundary
This is an unofficial original companion. It follows the fixed upstream chapter's topic order without reproducing its prose, proofs, figures, examples, or code. See the [pinned upstream PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%207%20Temporal-Difference%20Methods.pdf) for source context; this page's metadata records the blob and digest.
:::

<a id="learning-goals"></a>
## Learning goals

By the end of this chapter you should be able to:

1. derive the TD(0) target $R_{t+1}+\gamma V(S_{t+1})$;
2. distinguish the on-policy SARSA target from the off-policy Q-learning target;
3. explain how an $n$-step return interpolates between SARSA and Monte Carlo; and
4. audit a finite trace without treating it as an asymptotic convergence proof.

<a id="roadmap"></a>
## Roadmap

| Unit | Question | Lab evidence |
| --- | --- | --- |
| [TD learning](./td-learning) | What changes after one transition? | visited state, target, error |
| [SARSA](./sarsa) | How does the next behaviour action enter? | on-policy backup |
| [n-step SARSA](./n-step-sarsa) | How much return should be delayed? | horizon and bootstrap |
| [Q-learning](./q-learning) | What makes a backup off-policy? | greedy max target |
| [Unified view](./unified) | How are MC and TD related? | bias/variance lens |

Use the [Temporal-Difference lab](/en/labs/ch07-temporal-difference) with seed `5eed` to replay all four update families on the same 4×4 world.

<a id="notation"></a>
## Shared notation

For a state-value update, $\delta_t=R_{t+1}+\gamma V_t(S_{t+1})-V_t(S_t)$ and $V_{t+1}(S_t)=V_t(S_t)+\alpha\delta_t$. For action values, replace $V$ by $Q$ and choose the appropriate next-action rule. A terminal transition has no bootstrap term.

<a id="boundary"></a>
## Finite-run boundary

The browser reports realised samples, not a transition model. Episode caps are explicit `truncated` events; a small TD error is a useful diagnostic, not evidence of almost-sure convergence.

Chapter 7 pages: [TD](./td-learning) · [SARSA](./sarsa) · [n-step](./n-step-sarsa) · [Q-learning](./q-learning) · [Unified view](./unified) · [Summary](./summary) · [Q&A](./q-and-a) · [Checkpoint](./checkpoint) · [Lab](/en/labs/ch07-temporal-difference)
