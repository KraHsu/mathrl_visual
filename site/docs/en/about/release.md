---
id: about-release
translation_key: about-release
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
title: Release checklist
description: Evidence and gates required before a production MathRL Visual release.
---

# Release checklist

<a id="gates"></a>

## Optional formal-release gates

The ordinary Pages workflow already builds and deploys the interactive
companion. This page describes an optional stricter profile for a formally
reviewed release or for a future version that redistributes upstream material.
That profile can require the Rust/Wasm and frontend tests, locale parity,
artifact/PWA checks, browser/a11y checks, performance evidence, review records,
and an identity-checked HTTPS smoke report. The repository's smoke script
records JSON evidence; any signature or external attestation must be supplied
by the release process rather than inferred from that file.

`RELEASE=1` is a fail-closed switch for this optional profile: any `draft`,
`stale`, `missing`, or uncleared locale record stops that formal build. It does
not block the ordinary preview workflow.

<a id="rollback"></a>

## Rollback evidence

Before tagging, deploy the candidate to a staging Pages artifact, record its content/engine/schema versions, and rehearse restoring the previous immutable artifact. Verify both locale roots, a chapter page, a flagship lab, the offline page, and a language switch after rollback. Keep the rehearsal URL and timestamp in the release record.

The repository-level [RELEASE.md](https://github.com/KraHsu/mathrl_visual/blob/main/RELEASE.md) contains the command-level runbook for maintainers.

<a id="approval"></a>

## Human approval record

If a formal release is desired, its tag message or attached record should name
the math reviewer, language reviewer, accessibility reviewer, rights approver,
source commit, content set, and date. If any role is unavailable, continue
using the ordinary preview.
