import { readdir, readFile } from 'node:fs/promises'

const projectRoot = new URL('../', import.meta.url)
const dist = new URL('site/docs/.vitepress/dist/', projectRoot)
const base = normalizeBase(process.env.PAGES_BASE ?? '/mathrl_visual/')
const origin = (process.env.PAGES_ORIGIN ?? '').replace(/\/$/, '')
const preview = process.env.PAGES_STAGE === 'preview'
const chapter3Routes = [
  'learn/ch03/',
  'learn/ch03/policy-improvement',
  'learn/ch03/optimal-values',
  'learn/ch03/optimality-equation',
  'learn/ch03/contraction',
  'learn/ch03/greedy-policies',
  'learn/ch03/factors',
  'learn/ch03/checkpoint',
  'labs/bellman-optimality-grid',
]

const requiredFiles = [
  'index.html',
  '404.html',
  'favicon.svg',
  'zh-Hans/index.html',
  'en/index.html',
  'zh-Hans/labs/ch01-gridworld.html',
  'en/labs/ch01-gridworld.html',
  'zh-Hans/learn/ch02/index.html',
  'en/learn/ch02/index.html',
  'zh-Hans/labs/bellman-grid.html',
  'en/labs/bellman-grid.html',
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter3Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
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
if (!assetNames.some((name) => name.includes('optimality.worker-') && name.endsWith('.js'))) {
  throw new Error('GitHub Pages artifact does not contain the Chapter 3 optimality Worker')
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

const chapter3Source =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%203%20Optimal%20State%20Values%20and%20Bellman%20Optimality%20Equation.pdf'
const chapter3Pages = ['zh-Hans', 'en'].flatMap((locale) =>
  chapter3Routes.map((route) => ({
    locale,
    counterpart: locale === 'zh-Hans' ? 'en' : 'zh-Hans',
    route,
  })),
)
for (const page of chapter3Pages) {
  const fileRoute = page.route.endsWith('/') ? `${page.route}index.html` : `${page.route}.html`
  const html = await readFile(new URL(`${page.locale}/${fileRoute}`, dist), 'utf8')
  const canonical = publicArtifactUrl(`${page.locale}/${page.route}`)
  const alternate = publicArtifactUrl(`${page.counterpart}/${page.route}`)
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    throw new Error(`${page.locale}/${fileRoute} has an incorrect Chapter 3 canonical URL`)
  }
  if (!html.includes(`hreflang="${page.counterpart}" href="${alternate}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing its Chapter 3 locale alternate`)
  }
  if (!html.includes(`name="mathrl:source" content="${chapter3Source}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing the pinned Chapter 3 source`)
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

function publicArtifactUrl(path) {
  return `${origin}${base}${path}`
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
