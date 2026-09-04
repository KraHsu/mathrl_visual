---
id: ch08-value-representation
translation_key: ch08-value-representation
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.1"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Value representation: table to function"
description: Understand the storage and generalization trade-off introduced by features.
outline: deep
---

# Value representation: table to function

<a id="features"></a>
## A parameterized value

Instead of storing one value for every cell, choose a feature vector $\phi(s)$ and parameters $w$:

$$\hat v(s,w)=\phi(s)^\top w.$$

Coordinates use two parameters; adding a bias or polynomial terms increases expressivity. A one-hot map recovers the tabular case exactly (for this finite world).

<a id="generalization"></a>
## Generalization is shared support

Changing one parameter changes every state whose feature vector has a nonzero component in that parameter. This can help an unseen state, but it can also spread an error. Select **One-hot / tabular** and **Bias + coordinates** in the lab to make the contrast visible.
