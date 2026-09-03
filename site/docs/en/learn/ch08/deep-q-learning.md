---
id: ch08-deep-q-learning
translation_key: ch08-deep-q-learning
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.4"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: Deep Q-learning boundary
description: Make replay and target-network timing visible without hiding the mathematical boundary.
outline: deep
---

# Deep Q-learning boundary

<a id="two-networks"></a>
## Main and target parameters

Deep Q-learning keeps a main parameter set $w$ and a delayed target set $w_T$. A replay sample $(s,a,r,s')$ receives

$$y_T=r+\gamma\max_{a'}\hat q(s',a',w_T).$$

The main parameters fit this target; every $C$ updates, the target parameters are synchronised.

<a id="replay"></a>
## Replay is a sampling decision

The lab records replay size, batch size, loss, and target sync count. Its compact linear surrogate intentionally stops short of a general neural-network runtime; use it to reason about stale targets and uniform replay, not to benchmark a DQN implementation.
