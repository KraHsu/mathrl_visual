---
id: ch10-q-and-a
translation_key: ch10-q-and-a
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Chapter 10 Q&A"
description: Retrieval questions about QAC, A2C, importance sampling, and deterministic actors.
outline: deep
---

# Chapter 10 Q&A

<a id="q1"></a>

## Why is it called actor–critic?

The actor changes the policy that chooses actions. The critic evaluates those choices and supplies a learning signal. The names describe roles, not two independent environments.

<a id="q2"></a>

## What is an advantage?

An advantage compares an action's outcome with a state baseline. A one-step TD error is a practical noisy estimate; it can be positive for better-than-expected outcomes and negative otherwise.

<a id="q3"></a>

## Why expose behavior probability?

Without $\mu(a\mid s)$, a reported importance ratio cannot be audited. Off-policy corrections are only meaningful when the sampled action has support under the behavior policy.

<a id="q4"></a>

## Is deterministic mode just ε=0?

No. Setting ε to zero in a stochastic softmax still leaves a probability model and a log-probability score. A deterministic policy-gradient derivation uses a different actor interface; the lab labels its discrete mode as an analogue.
