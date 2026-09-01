import { readdir, readFile } from 'node:fs/promises'

const projectRoot = new URL('../', import.meta.url)
const dist = new URL('site/docs/.vitepress/dist/', projectRoot)
const base = normalizeBase(process.env.PAGES_BASE ?? '/mathrl_visual/')
const origin = (process.env.PAGES_ORIGIN ?? '').replace(/\/$/, '')
const preview = process.env.PAGES_STAGE === 'preview'

const requiredFiles = [
  'index.html',
  '404.html',
  'favicon.svg',
  'zh-Hans/index.html',
  'en/index.html',
  'zh-Hans/labs/ch01-gridworld.html',
  'en/labs/ch01-gridworld.html',
]

for (const relativePath of requiredFiles) {
  await readFile(new URL(relativePath, dist), 'utf8').catch(() => {
    throw new Error(`GitHub Pages artifact is missing ${relativePath}`)
  })
}

const assetNames = await readdir(new URL('assets/', dist), { recursive: true })
if (!assetNames.some((name) => name.endsWith('.wasm'))) {
  throw new Error('GitHub Pages artifact does not contain the Rust/Wasm engine')
}
if (!assetNames.some((name) => name.includes('@localSearchIndexzh-Hans'))) {
  throw new Error('GitHub Pages artifact does not contain the Chinese search index')
}
if (!assetNames.some((name) => name.includes('@localSearchIndexen'))) {
  throw new Error('GitHub Pages artifact does not contain the English search index')
}

const htmlFiles = await collectHtmlFiles(dist)
const escapedBase = escapeRegExp(base.slice(1))
const rootLeak = base === '/' ? null : new RegExp(`(?:href|src)="/(?!${escapedBase})`)

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8')
  if (!html.includes(`${base}assets/`)) {
    throw new Error(`${file.pathname} does not reference assets through ${base}`)
  }
  if (rootLeak?.test(html)) {
    throw new Error(`${file.pathname} contains a root-relative URL outside ${base}`)
  }
  if (preview && !html.includes('name="robots" content="noindex,nofollow"')) {
    throw new Error(`${file.pathname} is missing the preview robots directive`)
  }
}

if (origin) {
  const homepage = await readFile(new URL('index.html', dist), 'utf8')
  const expectedCanonical = `${origin}${base}`
  if (!homepage.includes(`rel="canonical" href="${expectedCanonical}"`)) {
    throw new Error(`Homepage canonical URL is not ${expectedCanonical}`)
  }
}

console.log(
  `GitHub Pages artifact OK: ${htmlFiles.length} HTML files, base ${base}, ${assetNames.length} assets`,
)

function normalizeBase(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
      if (entry.isDirectory()) return collectHtmlFiles(path)
      return entry.name.endsWith('.html') ? [path] : []
    }),
  )
  return nested.flat()
}
