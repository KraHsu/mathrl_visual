---
id: ch06-checkpoint
translation_key: ch06-checkpoint
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e0eee4e0d102dc961e4ea5c6da2279934e5a78fa
source_pdf_sha256: 307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916
source_sections: "6.1-6.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Chapter 6 checkpoint"
description: Practice incremental means, noisy root updates, step-size conditions, and batch-gradient reasoning before opening the lab.
outline: deep
---

# Chapter 6 checkpoint

Calculate first, then open each answer. Keep the indexing convention, noise convention, sampling protocol, and finite/asymptotic scope visible; most mistakes in this chapter are bookkeeping mistakes disguised as convergence claims.

::: info Original companion exercise
The task, numbers, prompts, and answers are original companion material. They follow Chapter 6's topics without reproducing the upstream prose, figures, examples, questions, or code.
:::

::: warning Finite evidence is not a theorem
Every numerical item below concerns a finite prefix. Even a perfect-looking trace cannot prove almost-sure convergence.
:::

<a id="mean-update"></a>

## 1. Update a running mean

Start with $w_1=2$ and process observations $x_2=8$ and $x_3=5$ using the exact-average step $a_k=1/(k+1)$. Compute $w_2$ and $w_3$.

::: details Show the answer

$$
w_2=2+\frac12(8-2)=5,
\qquad
w_3=5+\frac13(5-5)=5.
$$

The result equals $(2+8+5)/3$. The denominator belongs to the number of observations already included after the update, not to the raw loop index if the loop starts at zero.
:::

<a id="rm-update"></a>

## 2. Follow a noisy RM step

Use the linear root $g(w)=w-10$. At $w_k=12$, the observed residual is $\widetilde g=1.5$ and $a_k=0.2$. What are the update and the next estimate? What would the noiseless residual have been?

::: details Show the answer

The update is $-a_k\widetilde g=-0.3$, so $w_{k+1}=11.7$. The noiseless residual is $g(12)=2$; the observation noise was $1.5-2=-0.5$. The noisy step still points toward the root, but it is smaller than the noiseless correction would have been.
:::

<a id="step-sums"></a>

## 3. Inspect a polynomial schedule

Consider $a_k=0.8/k^p$. Which of $p=0.25$, $p=0.75$, and $p=1.25$ has the textbook pair of asymptotic properties

$$
\sum_k a_k=\infty,
\qquad
\sum_k a_k^2<\infty?
$$

::: details Show the answer

The pair holds when $1/2<p\leq1$. Therefore $p=0.75$ qualifies. At $p=0.25$, the squared series diverges; at $p=1.25$, the ordinary step series converges and can freeze a far-away iterate. The finite sums in a browser run only approximate this classification.
:::

<a id="sgd-gradient"></a>

## 4. Separate an SGD gradient

For a squared loss, suppose the true gradient at the current point is $-2$, a sampled gradient is $1$, and $a_k=0.1$. Find the noise and the update increment.

::: details Show the answer

The sampled-gradient noise is $\eta=1-(-2)=3$. The update increment is $-0.1(1)=-0.1$. It is incorrect to apply the step to the true gradient after already observing the sample; that would describe a different algorithm.
:::

<a id="batch-count"></a>

## 5. Count work, not just iterations

There are $n=12$ examples. Compare 10 BGD updates, 10 SGD updates, and 10 mini-batch updates with $m=3$. How many example-gradient evaluations does each mode perform if every selected example is evaluated once?

::: details Show the answer

BGD performs $10\times12=120$ evaluations; SGD performs $10\times1=10$; the mini-batch run performs $10\times3=30$. If mini-batches are sampled with replacement, the count is still 30 evaluations, even when an index repeats. Equal update counts therefore do not imply equal data exposure.
:::

<a id="theorem-scope"></a>

## 6. Classify the claim

A report says: “With a harmonic schedule, one seed reached $|w-w^*|<10^{-3}$ after 200 updates, so Robbins–Monro convergence is proved.” Is the report valid? Rewrite it honestly.

::: details Show the answer

It is not valid. A defensible statement is: “For this configuration and seed, the finite 200-update trace reached the selected tolerance; the harmonic schedule has the standard asymptotic step-size shape, but this run does not prove almost-sure convergence.” The report should also include the root function, noise scale, initial value, and stopping rule.
:::

<a id="lab-challenge"></a>

## 7. Design one controlled comparison

Choose one variable to change in the [stochastic-approximation lab](/en/labs/ch06-stochastic-approximation): noise scale, step schedule, root function, or batch size. Which fields must remain fixed for the comparison to be interpretable?

::: details Show the answer

At minimum hold the seed (or compare several seeds systematically), target/data distribution, initial value, sample budget, tolerance, and update indexing fixed. Record the changed field and the sampling protocol. If comparing batch sizes, report both update index and examples consumed.
:::

<a id="next"></a>

## Ready for the next chapter?

If you can explain every answer without replacing an observed gradient by an expected one, continue to Chapter 7's temporal-difference material. The incremental form is now familiar; the next new question is where its correction target comes from.
