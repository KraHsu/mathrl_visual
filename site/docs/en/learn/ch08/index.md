---
id: ch08-overview
translation_key: ch08-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.1-8.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 8: Value function methods"
description: Replace a value table with explicit features, linear TD updates, action-value approximation, and a small deep-Q teaching boundary.
outline: deep
---

# Chapter 8: Value function methods

Tabular values allocate one number per state or state-action pair. Function approximation stores a parameter vector and evaluates a feature map, trading exact local storage for generalization.

::: info Content boundary
This is an unofficial original companion. It follows the fixed upstream chapter's topic order without reproducing its prose, proofs, figures, examples, or code. See the [pinned upstream PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%208%20Value%20Function%20Methods.pdf) for source context.
:::

<a id="learning-goals"></a>
## Learning goals

1. evaluate $\hat v(s,w)=\phi(s)^\top w$ and inspect its feature vector;
2. derive a TD update for a linear approximator;
3. explain how a shared parameter update generalizes to other states;
4. distinguish linear Q-learning from a deep-Q system with replay and a target network.

<a id="roadmap"></a>
## Roadmap

| Unit | Focus | Lab evidence |
| --- | --- | --- |
| [Value representation](./value-representation) | table versus function | feature dimension |
| [TD function approximation](./td-function) | projected backup | prediction, target, gradient |
| [Approximators](./approximators) | feature-map choices | coordinates, polynomial, one-hot |
| [Q-learning](./q-learning) | action-value parameters | greedy policy |
| [Deep Q-learning](./deep-q-learning) | replay and target network | buffer and sync cadence |

Use the [value-function lab](/en/labs/ch08-value-function) with a fixed seed to compare maps without changing the environment.

<a id="boundary"></a>
## Approximation boundary

An approximator can be smooth, compact, and wrong. The lab exposes features and parameter updates so you can see that generalization is a consequence of shared parameters, not a guarantee of accuracy. The Deep-Q mode is a bounded linear surrogate for teaching replay semantics; it is not a browser deep-learning framework.

Chapter 8 pages: [Overview](./) · [Value representation](./value-representation) · [TD function](./td-function) · [Approximators](./approximators) · [Q-learning](./q-learning) · [Deep Q](./deep-q-learning) · [Summary](./summary) · [Q&A](./q-and-a) · [Checkpoint](./checkpoint) · [Lab](/en/labs/ch08-value-function)
