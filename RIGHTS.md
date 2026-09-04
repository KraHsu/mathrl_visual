# Rights and source policy

This repository is an unofficial, original interactive companion. The ordinary
static preview is intended to be buildable and deployable without an approval
workflow.

- The upstream book repository is used only for chapter/section references and links.
- Book prose, figures, tables, and PDF pages are not copied into the site artifact.
- Chapter companion text and the 4×4 Grid World implementation in this repository are original work.
- A page may move to an authorized reproduction mode only after its locale-specific rights metadata and written permission are recorded. That extra record is only needed if the project starts redistributing upstream material.
- Source code and content licensing will be finalized separately before a public release.

Upstream reference commit: `0e348961c28496096d308f1066009266b3674c5a`.

## Optional formal-reproduction decision record

The repository uses `companion-original` for the current preview. Do not infer
permission to copy upstream material from the existence of the upstream GitHub
repository or from a public preview URL. If a future release adds verbatim
book material, a maintainer should complete this record (or link to an
externally signed record) before shipping those assets:

| Decision | Required evidence | Status |
| --- | --- | --- |
| English republication | written permission from the actual rights holder, scope and attribution | pending |
| Simplified Chinese translation | written translation/derivative-work permission, scope and attribution | pending |
| Upstream Grid World code | license or written permission for any reused/adapted code | pending |
| Project code license | committed `LICENSE-CODE` and selected SPDX terms | pending |
| Companion-content license | committed `LICENSE-CONTENT`, attribution and takedown contact | pending |
| Offline/PWA redistribution | permission covers cached HTML, assets and downloadable bundles | pending |

Until every reproduced item has a non-ambiguous basis, the optional
`RELEASE=1` formal-reproduction audit must fail. This does not block the
original companion preview. A technical review, a citation, or a link to a PDF
is not a substitute for a rights decision. Locale-specific status is recorded
in each page's frontmatter and in the generated release manifest.
