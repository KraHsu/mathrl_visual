---
id: accessibility
translation_key: accessibility
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
title: Accessibility
description: Keyboard, reduced-motion, data-table, and no-JavaScript guarantees for the original interactive textbook.
---

# Accessibility

<a id="commitments"></a>

## Commitments

The target is WCAG 2.2 AA for both locales. Every experiment must have keyboard-operable controls, a visible focus path, a text or table equivalent for graphics, and a recovery path when Worker or Wasm loading fails. Animations can be paused, stepped, slowed, or disabled with `prefers-reduced-motion`.

Charts and maps are explanatory views, not the only source of information. The same values appear in semantic tables with headers, units, state IDs, and a short textual summary. Error messages identify the invalid field and preserve the run ID so a user can retry without losing the page context.

<a id="testing"></a>

## How we test

CI runs axe checks on representative Chinese and English routes and Playwright keyboard/viewport scenarios. Maintainers must additionally test a screen reader, 400% zoom, a narrow mobile viewport, disabled JavaScript, and a reduced-motion preference before approving a release. Automated checks do not replace that manual sign-off.

<a id="contact"></a>

## Report a barrier

Open an issue in the [repository](https://github.com/KraHsu/mathrl_visual/issues) with the locale, URL, browser/assistive technology, expected behavior, and a minimal reproduction. Do not include private notes or exported progress data.
