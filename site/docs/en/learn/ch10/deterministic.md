---
id: ch10-deterministic
translation_key: ch10-deterministic
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "Deterministic actor–critic"
description: Mark the boundary between a probability policy and a deterministic policy gradient.
outline: deep
---

# Deterministic actor–critic

<a id="boundary"></a>

## What becomes deterministic?

A deterministic actor maps a state to one action (or, in continuous control, to one action vector). There is no sampled log-probability score for the actor update. The critic still supplies a value gradient or action-value signal.

<a id="discrete-analogue"></a>

## Lab analogue

The finite lab keeps the two-action chain discrete for comparability and chooses the current argmax action. Its preference update is labelled a deterministic teaching analogue, not a claim to implement the full continuous deterministic policy-gradient theorem.

<a id="comparison"></a>

## Compare boundaries

Run stochastic A2C and deterministic mode with the same seed. Stochastic mode exposes $\pi$ and sampled actions; deterministic mode exposes a greedy action and still records the critic TD error. Keeping these observations separate prevents a discrete demo from being overgeneralized.

<a id="next"></a>

Continue to the [chapter summary](./summary).
