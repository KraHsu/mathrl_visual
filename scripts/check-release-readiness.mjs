#!/usr/bin/env node

/**
 * Fail-closed production readiness audit.
 *
 * The ordinary preview checks remain useful while content is being authored.
 * This audit makes the remaining human decisions explicit and is strict only
 * when RELEASE=1 (or --strict) is supplied.  It deliberately does not mark a
 * review as approved: reviewers must edit the page metadata and RIGHTS.md.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APPENDIX_PAGES, appendixRoute } from './appendix-manifest.mjs'
import { CHAPTERS_07_10 } from './chapter-manifest.mjs'
import { readReleaseManifest } from './release-manifest.mjs'
import { UPSTREAM_SOURCE_COMMIT, topicSourceForPath } from './source-manifest.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const docsRoot = resolve(projectRoot, 'site/docs')
const locales = ['zh-Hans', 'en']
const sourceKinds = new Set(['topic-reference', 'project-policy', 'site-navigation'])
const topicReferenceKind = 'topic-reference'
const strict = process.env.RELEASE === '1' || process.argv.includes('--strict')
const distRoot = resolve(projectRoot, process.env.RELEASE_DIST ?? 'site/docs/.vitepress/dist')

function posix(value) {
  return value.split(sep).join('/')
}

async function markdownFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(root, path)))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(posix(relative(root, path)))
  }
  return files.sort()
}

function metadata(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { path, error: 'missing frontmatter' }
  const body = match[1]
  const value = (key) => body.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim()
  return {
    path,
    relativePath: path.replace(/^[^/]+\//, ''),
    id: value('id'),
    translationKey: value('translation_key'),
    locale: value('locale'),
    origin: value('origin'),
    sourceKind: value('source_kind'),
    rights: value('rights'),
    contentReview: value('review_content'),
    languageReview: value('review_language'),
    mathReview: value('review_math'),
    accessibilityReview: value('review_accessibility'),
    reviewer: value('reviewer'),
    reviewedAt: value('reviewed_at'),
    reviewEvidence: value('review_evidence'),
    rightsEvidence: value('rights_evidence'),
    sourceCommit: value('source_commit'),
    sourceBlob: value('source_pdf_blob'),
    sourceHash: value('source_pdf_sha256'),
    sourceSections: value('source_sections'),
  }
}

function requiredRoutes() {
  const routes = new Set()
  for (let chapter = 1; chapter <= 10; chapter += 1) routes.add(`learn/ch${String(chapter).padStart(2, '0')}/index.md`)
  for (const page of APPENDIX_PAGES) routes.add(`learn/appendix/${page.slug ? `${page.slug}.md` : 'index.md'}`)
  // These static orientation routes are part of the public v1 contract, not
  // optional documentation.  Keep them in the same fail-closed set as the
  // chapter entry points so a localized build cannot silently omit them.
  for (const route of [
    'concepts/markov-property.md',
    'map.md',
    'symbols.md',
    'search.md',
    'offline.md',
  ]) routes.add(route)
  // A flagship lab is required for every chapter.  Chapter 2's final route is
  // supplied by the shared-grid integration; keep the legacy pilot as a
  // compatibility route while accepting either name during migration.
  routes.add('labs/ch01-gridworld.md')
  routes.add('labs/bellman-grid.md')
  routes.add('labs/bellman-optimality-grid.md')
  routes.add('labs/ch04-planning-grid.md')
  routes.add('labs/ch05-monte-carlo.md')
  routes.add('labs/ch06-stochastic-approximation.md')
  for (const chapter of CHAPTERS_07_10) routes.add(`${chapter.labRoute}.md`)
  return routes
}

function pushIssue(issues, kind, detail) {
  issues.push({ kind, detail })
}

async function readLocaleRecords() {
  const byLocale = new Map()
  for (const locale of locales) {
    const root = resolve(docsRoot, locale)
    const paths = await markdownFiles(root)
    const records = []
    for (const path of paths) records.push(metadata(await readFile(resolve(root, path), 'utf8'), `${locale}/${path}`))
    byLocale.set(locale, { paths, records })
  }
  return byLocale
}

async function main() {
  const issues = []
  const warnings = []
  const byLocale = await readLocaleRecords()
  const reference = byLocale.get(locales[0])

  for (const locale of locales.slice(1)) {
    const candidate = byLocale.get(locale)
    const missing = reference.paths.filter((path) => !candidate.paths.includes(path))
    const extra = candidate.paths.filter((path) => !reference.paths.includes(path))
    for (const path of missing) pushIssue(issues, 'locale-missing', `${locale}/${path}`)
    for (const path of extra) pushIssue(issues, 'locale-extra', `${locale}/${path}`)
  }

  const required = requiredRoutes()
  for (const locale of locales) {
    const paths = new Set(byLocale.get(locale).paths)
    for (const route of required) {
      if (!paths.has(route)) {
        // The shared Ch2 integration may use a new route; either form is
        // accepted only if one is actually present in both locales.
        if (route === 'labs/bellman-grid.md' && paths.has('labs/ch02-policy-evaluation.md')) continue
        pushIssue(issues, 'required-route-missing', `${locale}/${route}`)
      }
    }
  }

  const recordsByPath = new Map()
  for (const locale of locales) {
    for (const record of byLocale.get(locale).records) {
      recordsByPath.set(record.relativePath, [...(recordsByPath.get(record.relativePath) ?? []), record])
      for (const field of ['id', 'translationKey', 'locale', 'rights', 'contentReview', 'languageReview', 'sourceKind']) {
        if (!record[field]) pushIssue(issues, 'metadata-missing', `${record.path}: ${field}`)
      }
      if (record.locale !== locale) pushIssue(issues, 'locale-mismatch', `${record.path}: ${record.locale}`)
      if (record.sourceKind && !sourceKinds.has(record.sourceKind)) {
        pushIssue(issues, 'source-kind-invalid', `${record.path}: ${record.sourceKind}`)
      }
      const expectedSource = record.sourceKind === topicReferenceKind
        ? topicSourceForPath(record.relativePath)
        : undefined
      if (record.sourceKind === topicReferenceKind && !expectedSource) {
        pushIssue(issues, 'source-manifest-missing', record.path)
      }
      if (expectedSource) {
        const expectedCommit = expectedSource.sourceCommit ?? UPSTREAM_SOURCE_COMMIT
        if (record.sourceCommit && record.sourceCommit !== expectedCommit) {
          pushIssue(issues, 'source-commit-mismatch', `${record.path}: ${record.sourceCommit}`)
        }
        if (record.sourceBlob && record.sourceBlob !== expectedSource.sourcePdfBlob) {
          pushIssue(issues, 'source-blob-mismatch', `${record.path}: ${record.sourceBlob}`)
        }
        if (record.sourceHash && record.sourceHash !== expectedSource.sourcePdfSha256) {
          pushIssue(issues, 'source-hash-mismatch', `${record.path}: ${record.sourceHash}`)
        }
      }
      if (record.rights === 'unknown' || record.rights === 'uncleared') pushIssue(issues, 'rights-uncleared', record.path)
      if (record.sourceCommit && !/^[0-9a-f]{40}$/i.test(record.sourceCommit)) {
        pushIssue(issues, 'source-commit-invalid', `${record.path}: ${record.sourceCommit}`)
      }
      if (record.sourceBlob && !/^[0-9a-f]{40}$/i.test(record.sourceBlob)) {
        pushIssue(issues, 'source-blob-invalid', `${record.path}: ${record.sourceBlob}`)
      }
      if (record.sourceHash && !/^[0-9a-f]{64}$/i.test(record.sourceHash)) {
        pushIssue(issues, 'source-hash-invalid', `${record.path}: ${record.sourceHash}`)
      }
      if (!record.sourceSections && record.sourceKind === topicReferenceKind && !strict) {
        pushIssue(issues, 'source-sections-missing', `${record.path}: source_sections`)
      }
      if (!record.mathReview) warnings.push(`${record.path}: review_math is not recorded`)
      if (!record.accessibilityReview) warnings.push(`${record.path}: review_accessibility is not recorded`)
      if (strict) {
        // A production approval must identify the exact upstream commit and
        // source-PDF digest used as the topic reference.  Preview pages may
        // be authored incrementally, but strict mode must not let a missing
        // provenance field slip through merely because the review flags were
        // changed to `approved`.
        if (record.sourceKind === topicReferenceKind) {
          if (!record.sourceCommit) pushIssue(issues, 'source-commit-missing', `${record.path}: source_commit`)
          if (!record.sourceBlob) pushIssue(issues, 'source-blob-missing', `${record.path}: source_pdf_blob`)
          if (!record.sourceHash) pushIssue(issues, 'source-hash-missing', `${record.path}: source_pdf_sha256`)
          if (!record.sourceSections) pushIssue(issues, 'source-sections-missing', `${record.path}: source_sections`)
        }
        const reviewFields = ['contentReview', 'languageReview', 'accessibilityReview']
        for (const field of reviewFields) {
          if (record[field] !== 'approved') pushIssue(issues, 'review-not-approved', `${record.path}: ${field}=${record[field] ?? 'missing'}`)
        }
        const mathApproved = record.sourceKind === topicReferenceKind
          ? record.mathReview === 'approved'
          : record.mathReview === 'approved' || record.mathReview === 'not_applicable'
        if (!mathApproved) pushIssue(issues, 'review-not-approved', `${record.path}: mathReview=${record.mathReview ?? 'missing'}`)
        // An `approved` flag is meaningful only with an auditable identity,
        // date, and evidence reference.  Keeping these fields optional in
        // preview lets authors work incrementally while preventing a release
        // from being greened by changing four words alone.
        if (!record.reviewer) pushIssue(issues, 'reviewer-missing', `${record.path}: reviewer`)
        if (!record.reviewedAt || Number.isNaN(Date.parse(record.reviewedAt))) {
          pushIssue(issues, 'review-date-invalid', `${record.path}: reviewed_at=${record.reviewedAt ?? 'missing'}`)
        }
        if (!record.reviewEvidence) pushIssue(issues, 'review-evidence-missing', `${record.path}: review_evidence`)
        if (!record.rightsEvidence) pushIssue(issues, 'rights-evidence-missing', `${record.path}: rights_evidence`)
      }
    }
  }

  for (const [path, records] of recordsByPath) {
    if (records.length !== locales.length) continue
    const [first, ...rest] = records
    for (const record of rest) {
      if (record.id !== first.id || record.translationKey !== first.translationKey || record.sourceKind !== first.sourceKind) pushIssue(issues, 'id-mismatch', path)
      if (
        record.sourceCommit !== first.sourceCommit
        || record.sourceBlob !== first.sourceBlob
        || record.sourceHash !== first.sourceHash
        || record.sourceSections !== first.sourceSections
      ) pushIssue(issues, 'source-mismatch', path)
    }
  }

  if (strict) {
    for (const file of ['LICENSE-CODE', 'LICENSE-CONTENT', 'NOTICE']) {
      await stat(resolve(projectRoot, file)).catch(() => pushIssue(issues, 'legal-file-missing', file))
    }
    const rightsText = await readFile(resolve(projectRoot, 'RIGHTS.md'), 'utf8')
    if (/\|\s*pending\s*\|/i.test(rightsText)) pushIssue(issues, 'rights-pending', 'RIGHTS.md contains pending decisions')
    const manifest = await readReleaseManifest(distRoot)
    if (!manifest) pushIssue(issues, 'release-manifest-missing', `${posix(relative(projectRoot, distRoot))}/release-manifest.json`)
    else if (manifest.stage !== 'production') pushIssue(issues, 'release-stage-mismatch', `manifest stage=${manifest.stage}`)
  }

  const report = {
    strict,
    locales,
    pages: reference.paths.length,
    requiredRoutes: required.size,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings: warnings.slice(0, 80),
  }
  if (process.env.RELEASE_REPORT) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(resolve(projectRoot, process.env.RELEASE_REPORT), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }
  if (issues.length) {
    console.error(`Release readiness ${strict ? 'FAILED' : 'has blockers'}: ${issues.length} issue(s)`)
    for (const issue of issues.slice(0, strict ? 80 : 30)) console.error(`- [${issue.kind}] ${issue.detail}`)
    if (issues.length > 80) console.error(`- … ${issues.length - 80} more`)
  }
  if (warnings.length) console.warn(`Release readiness warnings: ${warnings.length} review field(s) lack explicit math/accessibility metadata`)
  if (strict && issues.length) process.exitCode = 1
  else console.log(`Release readiness ${issues.length ? 'preview report' : 'OK'}: ${reference.paths.length} bilingual page pairs`)
}

main().catch((error) => {
  console.error(error?.stack || error)
  process.exitCode = 1
})
