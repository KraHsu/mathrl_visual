---
id: appendix-overview
translation_key: appendix-overview
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: d500366336c85f7853db704c434a87715ea0b211
source_pdf_sha256: 46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3
source_sections: "Appendix overview"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "Appendix: Mathematical toolbox"
description: A compact, bilingual-ready toolbox for probability, convergence, linear algebra, and optimization.
outline: deep
---

# Appendix: Mathematical toolbox

The experiments in this companion use a small set of mathematical ideas again and again. This appendix is an **original reference**, written to make those ideas easy to check while reading Chapters 1–10. It follows the topic of the upstream appendix but does not reproduce its prose, figures, exercises, or code.

::: info Scope and provenance
This is an unofficial companion. The [upstream appendix PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/4%20-%20Appendix.pdf) is a topic reference only. See the [source and version record](/en/about/source-version) for the pinned blob and checksum.
:::

<a id="route"></a>

## A route through the toolbox

| Unit | Use it when you need to… |
| --- | --- |
| [Probability and expectation](./probability) | turn transition rows and sampled rewards into expectations; |
| [Random sequences and convergence](./convergence) | state what a finite trace can, and cannot, establish; |
| [Vectors, norms, and projections](./linear-algebra) | read matrix Bellman equations and feature updates; |
| [Gradient geometry and optimization](./optimization) | connect policy/value updates to a direction and a step size; |
| [Bilingual symbol glossary](./glossary) | move between notation and English/Chinese terminology. |

<a id="how-to-read"></a>

## How to use each page

1. Write down the object and its domain before substituting numbers.
2. Check whether a statement is about an expectation, one sample, or a limit.
3. Keep the norm, tolerance, and indexing convention visible in your notes.
4. Compare the formula with the experiment's numerical table; the table is an audit aid, not a proof.

The companion intentionally uses finite examples. They make every term inspectable without pretending that a short browser run proves an asymptotic theorem.

<a id="errata"></a>

## Errata and updates

The upstream repository publishes a separate [errata PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/5%20-%20Errata%20for%20the%20Springer%20version.pdf). This site links to it rather than copying its text. When an erratum changes an experiment's interpretation, the site records the affected content version and keeps the old result reproducible.

Before treating a page as production content, check its review badge, source version, and the [license page](/en/about/license).
