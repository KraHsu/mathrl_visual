---
id: about-source-version
translation_key: about-source-version
locale: en
origin: companion-original
source_locale: en
source_kind: project-policy
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: not_applicable
review_accessibility: draft
title: Source and version record
description: Pinned upstream references, content hashes, engine version, and review status.
---

# Source and version record

<a id="versions"></a>

## Build identity

Every production artifact must carry one immutable content set. The preview build currently reports:

| Field | Value |
| --- | --- |
| site package | `0.1.0` preview |
| Rust/Wasm engine | `0.1.0` (Cargo package version) |
| content set | `companion-2026-09-03` (draft) |
| locale set | `zh-Hans` + `en` |
| data schema | `2` |
| upstream commit | `0e348961c28496096d308f1066009266b3674c5a` |

The release generator writes the same values to a machine-readable manifest and to the offline cache name. A browser must never combine HTML, Worker, or Wasm assets from different content-set or engine versions.

<a id="upstream"></a>

## Pinned upstream references

The companion links to the upstream book repository only for topic order and provenance. The appendix PDF blob is `d500366336c85f7853db704c434a87715ea0b211` with SHA-256 `46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3`. The errata PDF blob is `d5276e927e30ba94f39752f3b99fe41cfdd66615` with SHA-256 `5f19f38d7f58ae6a9d66618f7846318d8a8b869db162c772ffd28da694bafec8`.

Chapter-specific references are recorded in the page frontmatter and the [chapter manifest](https://github.com/KraHsu/mathrl_visual/blob/main/scripts/chapter-manifest.mjs). A changed upstream PDF produces a review issue; it does not silently replace a published page.

<a id="review"></a>

## Review status (for the optional formal profile)

`draft`, `stale`, and `missing` are visible progress states. The optional formal
release manifest can list reviewer identity, date, source-content hash,
mathematics, language, accessibility, and rights decisions for each locale.
Until those records exist, `RELEASE=1` may fail by design; the ordinary
companion preview remains available.
