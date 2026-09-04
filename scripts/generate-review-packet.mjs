#!/usr/bin/env node

/**
 * Generate an auditable bilingual review queue without changing page
 * frontmatter.  The packet is deliberately a report: reviewers still record
 * their decision and evidence in the source pages and RIGHTS.md.  Keeping the
 * queue generated from the same files that the strict release checker reads
 * prevents a hand-maintained spreadsheet from silently going stale.
 */

import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { UPSTREAM_SOURCE_COMMIT, topicSourceForPath } from './source-manifest.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const docsRoot = resolve(projectRoot, 'site/docs')
const locales = ['zh-Hans', 'en']
const outputDir = resolve(projectRoot, process.env.REVIEW_PACKET_DIR ?? 'release-evidence')
const jsonOutput = resolve(outputDir, process.env.REVIEW_PACKET_JSON ?? 'review-packet.json')
const markdownOutput = resolve(outputDir, process.env.REVIEW_PACKET_MARKDOWN ?? 'review-packet.md')
const csvOutput = resolve(outputDir, process.env.REVIEW_PACKET_CSV ?? 'review-packet.csv')

const commonReviewFields = [
  ['content', 'review_content', 'approved'],
  ['language', 'review_language', 'approved'],
  ['accessibility', 'review_accessibility', 'approved'],
]
const identityFields = [
  ['reviewer', 'reviewer'],
  ['review date', 'reviewed_at'],
  ['review evidence', 'review_evidence'],
  ['rights evidence', 'rights_evidence'],
]

function posix(value) {
  return value.split(sep).join('/')
}

async function markdownFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(root, path)))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(posix(relative(root, path)))
  }
  return files.sort()
}

function value(body, key) {
  return body.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim()
}

function parseMetadata(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {
    path,
    error: 'missing frontmatter',
    relativePath: path.replace(/^[^/]+\//, ''),
    review: {},
    source: {},
  }
  const body = match[1]
  return {
    path,
    relativePath: path.replace(/^[^/]+\//, ''),
    id: value(body, 'id'),
    translationKey: value(body, 'translation_key'),
    locale: value(body, 'locale'),
    sourceKind: value(body, 'source_kind'),
    rights: value(body, 'rights'),
    review: {
      content: value(body, 'review_content'),
      language: value(body, 'review_language'),
      math: value(body, 'review_math'),
      accessibility: value(body, 'review_accessibility'),
    },
    reviewer: value(body, 'reviewer'),
    reviewedAt: value(body, 'reviewed_at'),
    reviewEvidence: value(body, 'review_evidence'),
    rightsEvidence: value(body, 'rights_evidence'),
    source: {
      commit: value(body, 'source_commit'),
      blob: value(body, 'source_pdf_blob'),
      sha256: value(body, 'source_pdf_sha256'),
      sections: value(body, 'source_sections'),
    },
  }
}

function gitValue(args, fallback) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || fallback
  } catch {
    return fallback
  }
}

function worktreeSummary() {
  const raw = gitValue(['status', '--porcelain=v1', '--untracked-files=normal'], '')
  return {
    raw,
    dirty: raw.length > 0,
    paths: raw ? raw.split('\n').filter(Boolean).length : 0,
  }
}

function generatedAt() {
  if (process.env.REVIEW_PACKET_TIMESTAMP) return process.env.REVIEW_PACKET_TIMESTAMP
  if (process.env.BUILD_TIMESTAMP) return process.env.BUILD_TIMESTAMP
  if (process.env.SOURCE_DATE_EPOCH) {
    const parsed = Number(process.env.SOURCE_DATE_EPOCH)
    if (Number.isFinite(parsed)) return new Date(parsed * 1000).toISOString()
  }
  return new Date().toISOString()
}

function expectedReview(record, name) {
  if (name === 'math' && record.sourceKind !== 'topic-reference') return 'not_applicable'
  return 'approved'
}

function buildTasks(record) {
  const tasks = []
  if (record.error) tasks.push('repair frontmatter')
  for (const [name] of commonReviewFields) {
    if (record.review[name] !== expectedReview(record, name)) tasks.push(`approve ${name}`)
  }
  if (record.sourceKind === 'topic-reference' && record.review.math !== 'approved') tasks.push('approve math')
  if (record.sourceKind !== 'topic-reference' && record.review.math !== 'not_applicable') tasks.push('mark math not_applicable')
  for (const [label, field] of identityFields) {
    const fieldValue = field === 'reviewer'
      ? record.reviewer
      : field === 'reviewed_at'
        ? record.reviewedAt
        : field === 'review_evidence'
          ? record.reviewEvidence
          : record.rightsEvidence
    if (!fieldValue) tasks.push(`add ${label}`)
  }
  if (!record.rights || record.rights === 'unknown' || record.rights === 'uncleared') tasks.push('clear rights status')
  if (record.sourceKind === 'topic-reference') {
    const expected = topicSourceForPath(record.relativePath)
    for (const [label, field] of [
      ['source commit', 'commit'],
      ['source PDF blob', 'blob'],
      ['source PDF SHA-256', 'sha256'],
      ['source sections', 'sections'],
    ]) {
      const expectedValue = field === 'commit'
        ? expected?.sourceCommit ?? UPSTREAM_SOURCE_COMMIT
        : field === 'blob'
          ? expected?.sourcePdfBlob
          : field === 'sha256'
            ? expected?.sourcePdfSha256
            : undefined
      if (!record.source[field] || (expected && field !== 'sections' && record.source[field] !== expectedValue)) {
        tasks.push(`verify ${label}`)
      }
    }
  }
  return [...new Set(tasks)]
}

function reviewSnapshot(record) {
  return {
    content: record.review.content ?? 'missing',
    language: record.review.language ?? 'missing',
    math: record.review.math ?? 'missing',
    accessibility: record.review.accessibility ?? 'missing',
    reviewer: record.reviewer ?? 'missing',
    reviewedAt: record.reviewedAt ?? 'missing',
    reviewEvidence: record.reviewEvidence ?? 'missing',
    rightsEvidence: record.rightsEvidence ?? 'missing',
  }
}

function compactStatus(record) {
  const review = reviewSnapshot(record)
  return `content=${review.content}; language=${review.language}; math=${review.math}; accessibility=${review.accessibility}`
}

function csvEscape(valueToEscape) {
  const text = String(valueToEscape ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function markdownEscape(valueToEscape) {
  return String(valueToEscape ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function buildMarkdown(packet) {
  const lines = [
    '# MathRL Visual review packet / 双语审核包',
    '',
    '> This is a generated queue, not an approval record. Edit the page frontmatter and `RIGHTS.md` only after a real reviewer or rights holder supplies evidence. / 这是自动生成的待办队列，不是批准记录；只有真实审核人或权利方提供证据后，才能编辑页面 frontmatter 和 `RIGHTS.md`。',
    '',
    `- Generated / 生成时间: \`${packet.generatedAt}\``,
    `- Checked-out commit / 当前提交: \`${packet.gitCommit}\``,
    `- Worktree / 工作树: \`${packet.worktree.dirty ? `dirty (${packet.worktree.paths} paths)` : 'clean'}\``,
    `- Upstream reference / 上游参考: \`${packet.upstreamCommit}\``,
    `- Page files / 页面文件: **${packet.summary.files}**`,
    `- Bilingual pairs / 双语对: **${packet.summary.pairs}**`,
    `- Open tasks / 未完成项: **${packet.summary.openTasks}**`,
    '',
    '## Review rules / 审核规则',
    '',
    '- `topic-reference` pages require approved content, language, mathematics, and accessibility reviews plus source provenance.',
    '- `project-policy` and `site-navigation` pages require content, language, and accessibility approval; mathematics must be `not_applicable`.',
    '- Every page needs a reviewer identity, an ISO-like review date, a review-evidence reference, and a rights-evidence reference.',
    '- Do not replace an absent decision with a guessed license, a placeholder name, or a link that cannot be audited.',
    '',
    '| Path pair / 路径对 | ID | Type | zh-Hans status | English status | Open tasks |',
    '| --- | --- | --- | --- | --- | ---: |',
  ]
  for (const pair of packet.pairs) {
    const zh = pair.pages.find((page) => page.locale === 'zh-Hans')
    const en = pair.pages.find((page) => page.locale === 'en')
    lines.push(`| \`${markdownEscape(pair.relativePath)}\` | \`${markdownEscape(pair.id || 'missing')}\` | ${markdownEscape(pair.sourceKind || 'missing')} | ${markdownEscape(zh ? compactStatus(zh) : 'missing')} | ${markdownEscape(en ? compactStatus(en) : 'missing')} | ${pair.openTasks} |`)
  }
  lines.push('', '## Per-page evidence fields / 逐页证据字段', '')
  for (const page of packet.pages) {
    lines.push(`### \`${page.path}\``)
    lines.push('', '| Field | Current value | Required value |', '| --- | --- | --- |')
    const review = reviewSnapshot(page)
    for (const [label, current, expected] of [
      ['content review', review.content, 'approved'],
      ['language review', review.language, 'approved'],
      ['math review', review.math, expectedReview(page, 'math')],
      ['accessibility review', review.accessibility, 'approved'],
      ['reviewer', review.reviewer, 'named reviewer'],
      ['reviewed_at', review.reviewedAt, 'valid date'],
      ['review_evidence', review.reviewEvidence, 'auditable reference'],
      ['rights_evidence', review.rightsEvidence, 'auditable reference'],
    ]) lines.push(`| ${label} | \`${markdownEscape(current)}\` | ${expected} |`)
    if (page.tasks.length) lines.push('', `Open tasks / 未完成项: ${page.tasks.map((task) => `\`${markdownEscape(task)}\``).join(', ')}`)
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

function buildCsv(packet) {
  const header = [
    'locale', 'path', 'relative_path', 'id', 'translation_key', 'source_kind', 'rights',
    'review_content', 'review_language', 'review_math', 'review_accessibility',
    'reviewer', 'reviewed_at', 'review_evidence', 'rights_evidence', 'open_tasks',
  ]
  const rows = [header]
  for (const page of packet.pages) {
    const review = reviewSnapshot(page)
    rows.push([
      page.locale, page.path, page.relativePath, page.id, page.translationKey, page.sourceKind, page.rights,
      review.content, review.language, review.math, review.accessibility,
      review.reviewer, review.reviewedAt, review.reviewEvidence, review.rightsEvidence, page.tasks.join('; '),
    ])
  }
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`
}

async function main() {
  const pages = []
  for (const locale of locales) {
    const root = resolve(docsRoot, locale)
    for (const relativePath of await markdownFiles(root)) {
      const path = `${locale}/${relativePath}`
      const record = parseMetadata(await readFile(resolve(root, relativePath), 'utf8'), path)
      record.tasks = buildTasks(record)
      pages.push(record)
    }
  }
  pages.sort((left, right) => left.path.localeCompare(right.path))
  const byRelativePath = new Map()
  for (const page of pages) {
    const pair = byRelativePath.get(page.relativePath) ?? {
      relativePath: page.relativePath,
      id: page.id,
      translationKey: page.translationKey,
      sourceKind: page.sourceKind,
      pages: [],
    }
    pair.pages.push({
      locale: page.locale,
      path: page.path,
      id: page.id,
      translationKey: page.translationKey,
      sourceKind: page.sourceKind,
      openTasks: page.tasks.length,
      review: reviewSnapshot(page),
    })
    pair.id ||= page.id
    pair.translationKey ||= page.translationKey
    pair.sourceKind ||= page.sourceKind
    byRelativePath.set(page.relativePath, pair)
  }
  const pairs = [...byRelativePath.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath))
  for (const pair of pairs) {
    pair.pages.sort((left, right) => locales.indexOf(left.locale) - locales.indexOf(right.locale))
    pair.openTasks = pair.pages.reduce((sum, page) => sum + page.openTasks, 0)
  }
  const sourceKinds = Object.fromEntries([...new Set(pages.map((page) => page.sourceKind || 'missing'))].sort().map((kind) => [kind, pages.filter((page) => (page.sourceKind || 'missing') === kind).length]))
  const worktree = worktreeSummary()
  const packet = {
    schemaVersion: 1,
    generatedAt: generatedAt(),
    gitCommit: gitValue(['rev-parse', 'HEAD'], 'unknown'),
    worktree,
    upstreamCommit: UPSTREAM_SOURCE_COMMIT,
    locales,
    summary: {
      files: pages.length,
      pairs: pairs.length,
      openTasks: pages.reduce((sum, page) => sum + page.tasks.length, 0),
      sourceKinds,
    },
    pages: pages.map((page) => ({
      path: page.path,
      relativePath: page.relativePath,
      locale: page.locale,
      id: page.id ?? null,
      translationKey: page.translationKey ?? null,
      sourceKind: page.sourceKind ?? null,
      rights: page.rights ?? null,
      review: reviewSnapshot(page),
      source: page.source,
      tasks: page.tasks,
    })),
    pairs,
  }
  await mkdir(outputDir, { recursive: true })
  await Promise.all([
    writeFile(jsonOutput, `${JSON.stringify(packet, null, 2)}\n`, 'utf8'),
    writeFile(markdownOutput, buildMarkdown(packet), 'utf8'),
    writeFile(csvOutput, buildCsv(packet), 'utf8'),
  ])
  console.log(`Review packet generated: ${pages.length} files, ${pairs.length} pairs, ${packet.summary.openTasks} open tasks`)
  console.log(`- JSON: ${jsonOutput}`)
  console.log(`- Markdown: ${markdownOutput}`)
  console.log(`- CSV: ${csvOutput}`)
}

main().catch((error) => {
  console.error(error?.stack || error)
  process.exitCode = 1
})
