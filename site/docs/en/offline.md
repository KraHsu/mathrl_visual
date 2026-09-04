---
id: offline-guide
translation_key: offline-guide
locale: en
origin: companion-original
source_kind: site-navigation
rights: companion-original
review_content: draft
review_language: draft
review_math: not_applicable
review_accessibility: draft
title: Offline reading
description: Understand the static offline packs for the independent original textbook and its explicit PWA update flow.
outline: deep
---

# Offline reading

The site is a static Pages artifact. A first visit keeps a small application
shell; the offline controls can then prefetch an English pack, a Simplified
Chinese pack, or both. Downloading is explicit so a large bundle never appears
without the reader's consent.

<a id="packs"></a>

## Packs and recovery

- the single-language packs keep their own lesson routes and offline fallback;
- the bilingual pack activates both locales from one content-set version;
- interrupted downloads can be resumed; and
- a damaged cache can be cleared without deleting the recovery shell.

The generated `offline-manifest.json` records routes, physical files, byte
estimates, and the storage schema. The [release runbook](./about/release)
describes the N-1 migration and rollback expectations.

<a id="updates"></a>

## Updates

An updated Service Worker waits for an explicit confirmation before replacing
an active worker. The current experiment and reading position are therefore not
silently reloaded. After activation, choose refresh when it is safe to move to
the new artifact.

<noscript>
This page documents the offline contract without JavaScript. The generated
offline fallback pages remain available to a browser that has cached them.
</noscript>
