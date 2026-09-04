---
id: ch08-approximators
translation_key: ch08-approximators
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.2.3-8.2.5"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Choosing feature approximators
description: Compare coordinate, polynomial, Fourier, and one-hot feature maps.
outline: deep
---

# Choosing feature approximators

<a id="maps"></a>
## Feature map menu

| Map | Dimension | Typical effect |
| --- | ---: | --- |
| coordinates | 2 | compact but no bias |
| bias + coordinates | 3 | affine surface |
| polynomial | 6 | curved surface |
| Fourier basis | 9 | smooth oscillatory components |
| one-hot | 16 | tabular exactness |

<a id="experiment"></a>
## What to inspect

Choose one map, run a single transition, and record the feature vector. Then change only the map and repeat. A lower-dimensional vector can update several cells at once; this is the observable form of generalization.
