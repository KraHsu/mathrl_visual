---
id: ch08-td-function
translation_key: ch08-td-function
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.2"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: TD with function approximation
description: Derive the linear TD update from a bootstrapped prediction.
outline: deep
---

# TD with function approximation

<a id="update"></a>
## Projected update

For a differentiable approximator, use the sample target $R_{t+1}+\gamma\hat v(S_{t+1},w_t)$:

$$w_{t+1}=w_t+\alpha\big[R_{t+1}+\gamma\hat v(S_{t+1},w_t)-\hat v(S_t,w_t)\big]\nabla_w\hat v(S_t,w_t).$$

For a linear map, the gradient is simply $\phi(S_t)$. The experiment displays prediction, target, error, gradient norm, and update norm separately.

<a id="stationary"></a>
## Sampling matters

The objective weights states according to a sampling distribution. A feature map can fit frequently visited states while missing rare states; inspect the state grid and not just the aggregate loss.
