---
id: ch06-mini-batch
translation_key: ch06-mini-batch
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.4.3-6.4.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Batch, stochastic, and mini-batch updates"
description: Compare one-sample and averaged gradients, clarify sampling with replacement, and make batch size a visible statistical and computational tradeoff.
outline: deep
---

# Batch, stochastic, and mini-batch updates

“Stochastic” does not require that a dataset itself be mysterious. A finite list can be turned into a random variable by sampling an index uniformly; conversely, a deterministic cycling rule can be treated as a prescribed stream whose randomness assumptions must not be smuggled in. Batch size controls how much gradient noise is averaged before each update.

::: info Original companion note
The dataset example, comparison table, and experiment protocol below are original. They explain the upstream batch/SGD/mini-batch topics without reproducing its prose, equations, figures, or examples.
:::

<a id="learning-goals"></a>

## Learning goals

After this unit, you should be able to:

1. write the BGD, SGD, and mini-batch recursions;
2. tell sampling with replacement from a shuffled pass through a dataset;
3. predict how batch size changes gradient variance and per-update work;
4. explain why a mini-batch of size $n$ need not equal one exact batch update; and
5. compare runs by both update count and examples consumed.

<a id="three-updates"></a>

## Three update sizes

For a dataset $x_1,\ldots,x_n$ and per-example gradient $g_i(w)=\nabla_w f(w,x_i)$, the three updates are:

$$
\begin{aligned}
\text{BGD:}
&\quad w_{k+1}=w_k-a_k\frac1n\sum_{i=1}^{n}g_i(w_k),\\
\text{MBGD:}
&\quad w_{k+1}=w_k-a_k\frac1m\sum_{i\in I_k}g_i(w_k),\\
\text{SGD:}
&\quad w_{k+1}=w_k-a_k g_{j_k}(w_k).
\end{aligned}
$$

Here $I_k$ is a batch of size $m$ and $j_k$ is one sampled index. BGD uses all examples for every update. SGD uses one. Mini-batch sits between them in both arithmetic cost and gradient variability.

<a id="sampling-protocols"></a>

## Sampling protocol is part of the algorithm

There are at least three common ways to obtain indices:

| Protocol | Repeats within a batch? | What one update estimates |
| --- | --- | --- |
| iid with replacement | possible | an unbiased sample mean of the population gradient |
| shuffled epoch | no within a pass | a finite-population average, with dependent order |
| deterministic cycle | fixed order | a prescribed incremental method, not iid sampling |

If $X$ is defined as a uniformly sampled dataset element, the finite objective

$$
J(w)=\frac1n\sum_{i=1}^{n}f(w,x_i)
$$

is exactly $\mathbb E[f(w,X)]$. But a sequential pass through the list is not automatically an iid stream. A reproducible lab must expose which protocol it uses.

<a id="variance-work"></a>

## Variance versus work

If per-example gradients are independent with covariance $\Sigma$, an average of $m$ draws has covariance approximately $\Sigma/m$. The approximation changes under finite-population sampling or correlated data, but the direction of the tradeoff remains useful:

| Larger batch | Smaller batch |
| --- | --- |
| less gradient noise per update | more visible stochasticity |
| more examples and arithmetic before moving $w$ | cheaper, more frequent updates |
| easier to use vectorized hardware | potentially noisier near the optimum |
| fewer updates for one data pass | more updates for the same data budget |

Do not compare “iteration 20” across modes without also reporting examples consumed. Twenty BGD updates may inspect $20n$ examples; twenty SGD updates may inspect only twenty.

<a id="mean-example"></a>

## A mean-estimation comparison

For squared loss $f(w,x)=\frac12\lVert w-x\rVert^2$, the gradient is $w-x$. Therefore:

$$
\begin{aligned}
\text{BGD:}\quad &w_{k+1}=w_k-a_k(w_k-\bar x),\\
\text{MBGD:}\quad &w_{k+1}=w_k-a_k(w_k-\bar x_{I_k}),\\
\text{SGD:}\quad &w_{k+1}=w_k-a_k(w_k-x_{j_k}),
\end{aligned}
$$

where $\bar x$ is the full-data mean and $\bar x_{I_k}$ is the batch mean. BGD knows the exact finite-data gradient; the other two only estimate it at each update. With a harmonic step and independent samples, all can approach the mean under suitable conditions, but their paths and work profiles differ.

<a id="batch-size-traps"></a>

## Two traps at the endpoints

1. **$m=1$** makes mini-batch algebra equal to SGD, but only if the sampling rule is the same.
2. **$m=n$** does not necessarily make mini-batch equal BGD: sampling $n$ times with replacement can repeat an example and omit another, whereas BGD includes each example exactly once.

The distinction matters in a seeded replay. Store the selected indices or at least a digest of them if you want another implementation to reproduce the gradient exactly.

<a id="lab-protocol"></a>

## A fair lab comparison

In the [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation):

1. fix the dataset, objective, initial $w$, seed, and step-size schedule;
2. run BGD, SGD, and two mini-batch sizes;
3. compare distance to the target against both update index and examples consumed;
4. inspect the sampled indices and gradient variance; and
5. repeat with a second seed before drawing a general conclusion.

The lab's finite curves illustrate a cost/variance tradeoff. They do not establish the asymptotic convergence theorem, and they do not turn a deterministic sampling order into iid evidence.

<a id="check-yourself"></a>

## Check yourself

There are $n=8$ examples and a mini-batch of size $m=4$. If sampling is with replacement, the selected indices `[1, 1, 3, 7]` are valid but do not represent four distinct examples. Calling that update BGD would overstate the information used.

<a id="read-next"></a>

## Continue

Use the [summary](./summary) to compress the chapter into one update-and-assumption map. Then test your understanding with the [Q&A](./q-and-a) and [checkpoint](./checkpoint).
