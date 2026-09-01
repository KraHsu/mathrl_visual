import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const docsRoot = resolve(projectRoot, 'site/docs')
const locales = ['zh-Hans', 'en']
const allowedRights = new Set(['companion-original'])

async function markdownFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return markdownFiles(root, path)
      if (entry.isFile() && entry.name.endsWith('.md')) return [relative(root, path)]
      return []
    }),
  )
  return files.flat().sort()
}

function frontmatter(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error(`${path}: missing YAML frontmatter`)
  return match[1]
}

function scalar(metadata, key, path) {
  const match = metadata.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))
  if (!match) throw new Error(`${path}: missing ${key}`)
  return match[1].trim()
}

function optionalScalar(metadata, key) {
  const match = metadata.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))
  return match?.[1].trim()
}

function explicitAnchors(source, path) {
  const anchors = [...source.matchAll(/<a\s+id=["']([^"']+)["']\s*><\/a>/g)].map(
    (match) => match[1],
  )
  if (new Set(anchors).size !== anchors.length) {
    throw new Error(`${path}: duplicate explicit anchor ID`)
  }
  return anchors
}

const filesByLocale = new Map()
for (const locale of locales) {
  filesByLocale.set(locale, await markdownFiles(resolve(docsRoot, locale)))
}

const referenceFiles = filesByLocale.get(locales[0])
for (const locale of locales.slice(1)) {
  const files = filesByLocale.get(locale)
  if (JSON.stringify(files) !== JSON.stringify(referenceFiles)) {
    const missing = referenceFiles.filter((file) => !files.includes(file))
    const extra = files.filter((file) => !referenceFiles.includes(file))
    throw new Error(`${locale}: locale parity failed; missing=${missing.join(',')} extra=${extra.join(',')}`)
  }
}

for (const path of referenceFiles) {
  const records = []
  for (const locale of locales) {
    const absolutePath = resolve(docsRoot, locale, path)
    const source = await readFile(absolutePath, 'utf8')
    const metadata = frontmatter(source, `${locale}/${path}`)
    const record = {
      id: scalar(metadata, 'id', `${locale}/${path}`),
      translationKey: scalar(metadata, 'translation_key', `${locale}/${path}`),
      locale: scalar(metadata, 'locale', `${locale}/${path}`),
      rights: scalar(metadata, 'rights', `${locale}/${path}`),
      contentReview: scalar(metadata, 'review_content', `${locale}/${path}`),
      languageReview: scalar(metadata, 'review_language', `${locale}/${path}`),
      sourceCommit: optionalScalar(metadata, 'source_commit'),
      sourcePdfBlob: optionalScalar(metadata, 'source_pdf_blob'),
      sourceSections: optionalScalar(metadata, 'source_sections'),
      anchors: explicitAnchors(source, `${locale}/${path}`),
    }
    if (record.locale !== locale) {
      throw new Error(`${locale}/${path}: locale field is ${record.locale}`)
    }
    if (!allowedRights.has(record.rights)) {
      throw new Error(
        `${locale}/${path}: rights value ${record.rights} is not in the release allowlist`,
      )
    }
    records.push(record)
  }

  const [first, ...rest] = records
  for (const record of rest) {
    if (record.id !== first.id || record.translationKey !== first.translationKey) {
      throw new Error(`${path}: bilingual IDs do not match`)
    }
    if (
      record.sourceCommit !== first.sourceCommit ||
      record.sourcePdfBlob !== first.sourcePdfBlob ||
      record.sourceSections !== first.sourceSections
    ) {
      throw new Error(`${path}: bilingual source metadata does not match`)
    }
    if (JSON.stringify(record.anchors) !== JSON.stringify(first.anchors)) {
      throw new Error(`${path}: bilingual explicit anchors do not match`)
    }
  }

  if (process.env.RELEASE === '1') {
    for (const record of records) {
      if (record.contentReview !== 'approved' || record.languageReview !== 'approved') {
        throw new Error(`${path}: release build requires approved bilingual reviews`)
      }
    }
  }
}

console.log(`Locale parity OK: ${referenceFiles.length} page pairs across ${locales.join(' / ')}`)
