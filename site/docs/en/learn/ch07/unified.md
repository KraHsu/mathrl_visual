---
id: ch07-unified
translation_key: ch07-unified
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.5"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: A unified TD viewpoint
description: Place MC, one-step TD, multi-step TD, SARSA, and Q-learning on one target spectrum.
outline: deep
---

# A unified TD viewpoint

<a id="spectrum"></a>
## One target family

All four methods update a visited estimate toward a target. The target can use one reward plus a bootstrap (SARSA), several rewards plus a bootstrap ($n$-step), a complete return (MC), or a greedy bootstrap (Q-learning).

| Method | Data used now | Policy relation |
| --- | --- | --- |
| TD(0) | one transition | fixed state-value policy |
| SARSA | transition + next action | on-policy |
| n-step SARSA | delayed reward window | on-policy |
| Q-learning | transition + greedy max | off-policy |

<a id="check"></a>
## A useful comparison protocol

Fix the seed, reward map, episode cap, and learning rate. Change only the method, save the first ten targets, then compare return and coverage. This isolates a target-design change from a random-stream change.
