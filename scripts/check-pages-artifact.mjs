import { readdir, readFile } from 'node:fs/promises'

import { APPENDIX_PAGES, APPENDIX_SOURCE_URL, appendixRoute } from './appendix-manifest.mjs'
import {
  CHAPTERS_07_10,
  CHAPTER_LOCALES,
  chapterAllRoutes,
  htmlRoute,
} from './chapter-manifest.mjs'

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
const chapter2Routes = [
  'learn/ch02/',
  'learn/ch02/state-values',
  'learn/ch02/bellman-equation',
  'learn/ch02/matrix-form',
  'learn/ch02/policy-evaluation',
  'learn/ch02/action-values',
  'learn/ch02/checkpoint',
  'labs/ch02-policy-evaluation',
  'labs/bellman-grid',
]
const chapter1Routes = [
  'learn/ch01/',
  'learn/ch01/state-action',
  'learn/ch01/policies',
  'learn/ch01/rewards',
  'learn/ch01/transitions',
  'learn/ch01/episodes',
  'learn/ch01/returns',
  'learn/ch01/mdp',
  'learn/ch01/checkpoint',
  'labs/ch01-gridworld',
]
const appendixRoutes = APPENDIX_PAGES.map((page) => appendixRoute(page))
const conceptRoutes = ['concepts/markov-property']
const navigationRoutes = ['map', 'symbols', 'search', 'offline']
const policyRoutes = [
  'about/license',
  'about/source-version',
  'about/release',
  'accessibility',
]
const chapter4Routes = [
  'learn/ch04/',
  'learn/ch04/value-iteration',
  'learn/ch04/policy-iteration',
  'learn/ch04/truncated-policy-iteration',
  'learn/ch04/generalized-policy-iteration',
  'learn/ch04/summary',
  'learn/ch04/q-and-a',
  'learn/ch04/checkpoint',
  'labs/ch04-planning-grid',
]
const chapter5Routes = [
  'learn/ch05/',
  'learn/ch05/mean-estimation',
  'learn/ch05/mc-basic',
  'learn/ch05/exploring-starts',
  'learn/ch05/epsilon-greedy',
  'learn/ch05/exploration-exploitation',
  'learn/ch05/summary',
  'learn/ch05/q-and-a',
  'learn/ch05/checkpoint',
  'labs/ch05-monte-carlo',
]
const chapter6Routes = [
  'learn/ch06/',
  'learn/ch06/mean-estimation',
  'learn/ch06/robbins-monro',
  'learn/ch06/dvoretzky',
  'learn/ch06/stochastic-gradient-descent',
  'learn/ch06/mini-batch',
  'learn/ch06/summary',
  'learn/ch06/q-and-a',
  'learn/ch06/checkpoint',
  'labs/ch06-stochastic-approximation',
]

const chapter7To10Routes = CHAPTERS_07_10.flatMap((chapter) => chapterAllRoutes(chapter))

const requiredFiles = [
  'index.html',
  '404.html',
  'favicon.svg',
  'sbom.cdx.json',
  'licenses.json',
  'zh-Hans/index.html',
  'en/index.html',
  'zh-Hans/labs/ch01-gridworld.html',
  'en/labs/ch01-gridworld.html',
  'zh-Hans/learn/ch02/index.html',
  'en/learn/ch02/index.html',
  'zh-Hans/labs/bellman-grid.html',
  'en/labs/bellman-grid.html',
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter1Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter2Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    appendixRoutes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) => policyRoutes.map((route) => `${locale}/${route}.html`)),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    [...conceptRoutes, ...navigationRoutes].map((route) => `${locale}/${route}.html`),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter3Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter4Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter5Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...['zh-Hans', 'en'].flatMap((locale) =>
    chapter6Routes.map((route) =>
      `${locale}/${route.endsWith('/') ? `${route}index.html` : `${route}.html`}`,
    ),
  ),
  ...CHAPTER_LOCALES.flatMap((locale) =>
    chapter7To10Routes.map((route) => htmlRoute(locale, route)),
  ),
]

for (const relativePath of requiredFiles) {
  await readFile(new URL(relativePath, dist), 'utf8').catch(() => {
    throw new Error(`GitHub Pages artifact is missing ${relativePath}`)
  })
}

// Keep the static artifact gate independent from the PWA checker: an
// archived Pages upload must always carry machine-readable dependency and
// license evidence, even when it is inspected without a service worker.
let sbom
let licenses
try {
  sbom = JSON.parse(await readFile(new URL('sbom.cdx.json', dist), 'utf8'))
  licenses = JSON.parse(await readFile(new URL('licenses.json', dist), 'utf8'))
} catch (error) {
  throw new Error(`GitHub Pages artifact has invalid SBOM/license JSON: ${error.message}`)
}
if (
  sbom.$schema !== 'https://cyclonedx.org/schema/bom-1.5.schema.json'
  || sbom.bomFormat !== 'CycloneDX'
  || sbom.specVersion !== '1.5'
  || typeof sbom.serialNumber !== 'string'
  || !/^urn:uuid:[0-9a-f-]{36}$/.test(sbom.serialNumber)
  || !Array.isArray(sbom.components)
  || sbom.components.length === 0
) {
  throw new Error('GitHub Pages artifact has an invalid or empty CycloneDX SBOM')
}
if (!Array.isArray(licenses.licenses) || licenses.licenses.length === 0 || licenses.componentCount !== sbom.components.length) {
  throw new Error('GitHub Pages artifact has an incomplete license inventory')
}
if (
  licenses.schemaVersion !== 1
  || typeof licenses.lockDigest !== 'string'
  || !/^[0-9a-f]{64}$/.test(licenses.lockDigest)
  || typeof licenses.generatedAt !== 'string'
  || Number.isNaN(Date.parse(licenses.generatedAt))
) throw new Error('GitHub Pages artifact has an invalid license inventory metadata')
const sbomLockDigest = sbom.metadata?.properties?.find((property) => property?.name === 'mathrl:lock-digest')?.value
if (sbomLockDigest !== licenses.lockDigest) throw new Error('GitHub Pages artifact SBOM/license lock digests differ')
const sbomRefs = new Set()
for (const component of sbom.components) {
  if (
    !component
    || typeof component['bom-ref'] !== 'string'
    || typeof component.name !== 'string'
    || typeof component.version !== 'string'
    || typeof component.purl !== 'string'
    || !Array.isArray(component.licenses)
    || component.licenses.length === 0
  ) throw new Error('GitHub Pages artifact has a malformed SBOM component')
  if (sbomRefs.has(component['bom-ref'])) throw new Error(`GitHub Pages artifact has duplicate SBOM ref ${component['bom-ref']}`)
  sbomRefs.add(component['bom-ref'])
}
const licenseRefs = new Set()
for (const group of licenses.licenses) {
  if (typeof group.license !== 'string' || group.license.length === 0 || !Array.isArray(group.components) || group.components.length === 0) {
    throw new Error('GitHub Pages artifact has a malformed license group')
  }
  for (const ref of group.components) {
    if (typeof ref !== 'string' || ref.length === 0) throw new Error('GitHub Pages artifact has an empty license component reference')
    if (licenseRefs.has(ref)) throw new Error(`GitHub Pages artifact repeats license component reference ${ref}`)
    licenseRefs.add(ref)
  }
}
for (const ref of sbomRefs) if (!licenseRefs.has(ref)) throw new Error(`GitHub Pages artifact license inventory misses ${ref}`)
for (const ref of licenseRefs) if (!sbomRefs.has(ref)) throw new Error(`GitHub Pages artifact license inventory references unknown ${ref}`)

const notFound = await readFile(new URL('404.html', dist), 'utf8')
if (!notFound.includes('页面不存在') || !notFound.includes('Page not found')) {
  throw new Error('404 page must contain both Simplified Chinese and English copy')
}
if (!notFound.includes(`href="${base}zh-Hans/"`) || !notFound.includes(`href="${base}en/"`)) {
  throw new Error('404 page must link to both locale home pages')
}

const assetNames = await readdir(new URL('assets/', dist), { recursive: true })
if (!assetNames.some((name) => name.endsWith('.wasm'))) {
  throw new Error('GitHub Pages artifact does not contain the Rust/Wasm engine')
}
if (!assetNames.some((name) => name.includes('optimality.worker-') && name.endsWith('.js'))) {
  throw new Error('GitHub Pages artifact does not contain the Chapter 3 optimality Worker')
}
if (!assetNames.some((name) => name.includes('planning.worker-') && name.endsWith('.js'))) {
  throw new Error('GitHub Pages artifact does not contain the Chapter 4 planning Worker')
}
if (!assetNames.some((name) => name.includes('monte-carlo.worker-') && name.endsWith('.js'))) {
  throw new Error('GitHub Pages artifact does not contain the Chapter 5 Monte Carlo Worker')
}
if (!assetNames.some((name) => name.includes('stochastic-approximation.worker-') && name.endsWith('.js'))) {
  throw new Error('GitHub Pages artifact does not contain the Chapter 6 stochastic-approximation Worker')
}
if (!assetNames.some((name) => name.includes('grid-policy.worker-') && name.endsWith('.js'))) {
  throw new Error('GitHub Pages artifact does not contain the Chapter 2 shared-grid policy Worker')
}
for (const chapter of CHAPTERS_07_10) {
  if (!assetNames.some((name) => name.includes(chapter.workerAsset) && name.endsWith('.js'))) {
    throw new Error(
      `GitHub Pages artifact does not contain the Chapter ${chapter.number} ${chapter.workerAsset} Worker`,
    )
  }
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
  // Offline fallback pages are deliberately standalone HTML and do not load
  // the VitePress asset graph.  Their locale links and manifest are checked
  // by check-pwa-artifact.mjs instead.
  if (file.pathname.includes('/dist/offline/')) continue
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

// Every localized VitePress page carries the same visible evidence contract:
// current/paired locale review state, build identity, and the provenance
// disclosure component.  Check the rendered HTML rather than trusting only
// frontmatter so a theme regression cannot hide release blockers from readers.
for (const file of htmlFiles.filter((entry) => /\/dist\/(?:zh-Hans|en)\//.test(entry.pathname))) {
  const html = await readFile(file, 'utf8')
  if (!html.includes('data-testid="page-evidence"')) {
    throw new Error(`${file.pathname} is missing the visible page evidence card`)
  }
  const reviewStatuses = (html.match(/data-review-status=/g) ?? []).length
  if (reviewStatuses < 8) {
    throw new Error(`${file.pathname} exposes ${reviewStatuses} review statuses; expected both locales and four fields`)
  }
  if (!html.toLowerCase().includes('errata') && !html.includes('勘误')) {
    throw new Error(`${file.pathname} is missing the errata disclosure in page evidence`)
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
const chapter4Source =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%204%20Value%20Iteration%20and%20Policy%20Iteration.pdf'
const chapter5Source =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%205%20Monte%20Carlo%20Methods.pdf'
const chapter6Source =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%206%20Stochastic%20Approximation.pdf'
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
const chapter4Pages = ['zh-Hans', 'en'].flatMap((locale) =>
  chapter4Routes.map((route) => ({
    locale,
    counterpart: locale === 'zh-Hans' ? 'en' : 'zh-Hans',
    route,
  })),
)
for (const page of chapter4Pages) {
  const fileRoute = page.route.endsWith('/') ? `${page.route}index.html` : `${page.route}.html`
  const html = await readFile(new URL(`${page.locale}/${fileRoute}`, dist), 'utf8')
  const canonical = publicArtifactUrl(`${page.locale}/${page.route}`)
  const alternate = publicArtifactUrl(`${page.counterpart}/${page.route}`)
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    throw new Error(`${page.locale}/${fileRoute} has an incorrect Chapter 4 canonical URL`)
  }
  if (!html.includes(`hreflang="${page.counterpart}" href="${alternate}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing its Chapter 4 locale alternate`)
  }
  if (!html.includes(`name="mathrl:source" content="${chapter4Source}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing the pinned Chapter 4 source`)
  }
}
const chapter5Pages = ['zh-Hans', 'en'].flatMap((locale) =>
  chapter5Routes.map((route) => ({
    locale,
    counterpart: locale === 'zh-Hans' ? 'en' : 'zh-Hans',
    route,
  })),
)
for (const page of chapter5Pages) {
  const fileRoute = page.route.endsWith('/') ? `${page.route}index.html` : `${page.route}.html`
  const html = await readFile(new URL(`${page.locale}/${fileRoute}`, dist), 'utf8')
  const canonical = publicArtifactUrl(`${page.locale}/${page.route}`)
  const alternate = publicArtifactUrl(`${page.counterpart}/${page.route}`)
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    throw new Error(`${page.locale}/${fileRoute} has an incorrect Chapter 5 canonical URL`)
  }
  if (!html.includes(`hreflang="${page.counterpart}" href="${alternate}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing its Chapter 5 locale alternate`)
  }
  if (!html.includes(`name="mathrl:source" content="${chapter5Source}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing the pinned Chapter 5 source`)
  }
}
const chapter6Pages = ['zh-Hans', 'en'].flatMap((locale) =>
  chapter6Routes.map((route) => ({
    locale,
    counterpart: locale === 'zh-Hans' ? 'en' : 'zh-Hans',
    route,
  })),
)
for (const page of chapter6Pages) {
  const fileRoute = page.route.endsWith('/') ? `${page.route}index.html` : `${page.route}.html`
  const html = await readFile(new URL(`${page.locale}/${fileRoute}`, dist), 'utf8')
  const canonical = publicArtifactUrl(`${page.locale}/${page.route}`)
  const alternate = publicArtifactUrl(`${page.counterpart}/${page.route}`)
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    throw new Error(`${page.locale}/${fileRoute} has an incorrect Chapter 6 canonical URL`)
  }
  if (!html.includes(`hreflang="${page.counterpart}" href="${alternate}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing its Chapter 6 locale alternate`)
  }
  if (!html.includes(`name="mathrl:source" content="${chapter6Source}"`)) {
    throw new Error(`${page.locale}/${fileRoute} is missing the pinned Chapter 6 source`)
  }
}

const chapter2Source =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%202%20State%20Values%20and%20Bellman%20Equation.pdf'
const chapter1Source =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%201%20Basic%20Concepts.pdf'

await assertLocalizedRoutes(chapter1Routes, chapter1Source, 'Chapter 1')
await assertLocalizedRoutes(chapter2Routes, chapter2Source, 'Chapter 2')
await assertLocalizedRoutes(appendixRoutes, APPENDIX_SOURCE_URL, 'Appendix')
await assertLocalizedRoutes(policyRoutes, undefined, 'policy')
await assertLocalizedRoutes(conceptRoutes, chapter1Source, 'concept')
await assertLocalizedRoutes(navigationRoutes, undefined, 'navigation')

for (const chapter of CHAPTERS_07_10) {
  const pages = CHAPTER_LOCALES.flatMap((locale) =>
    chapterAllRoutes(chapter).map((route) => ({
      locale,
      counterpart: locale === 'zh-Hans' ? 'en' : 'zh-Hans',
      route,
    })),
  )
  for (const page of pages) {
    const fileRoute = htmlRoute(page.locale, page.route).replace(`${page.locale}/`, '')
    const html = await readFile(new URL(`${page.locale}/${fileRoute}`, dist), 'utf8')
    const canonical = publicArtifactUrl(`${page.locale}/${page.route}`)
    const alternate = publicArtifactUrl(`${page.counterpart}/${page.route}`)
    if (!html.includes(`rel="canonical" href="${canonical}"`)) {
      throw new Error(
        `${page.locale}/${fileRoute} has an incorrect Chapter ${chapter.number} canonical URL`,
      )
    }
    if (!html.includes(`hreflang="${page.counterpart}" href="${alternate}"`)) {
      throw new Error(
        `${page.locale}/${fileRoute} is missing its Chapter ${chapter.number} locale alternate`,
      )
    }
    if (!html.includes(`name="mathrl:source" content="${chapter.source}"`)) {
      throw new Error(
        `${page.locale}/${fileRoute} is missing the pinned Chapter ${chapter.number} source`,
      )
    }
  }
}

console.log(
  `GitHub Pages artifact OK: ${htmlFiles.length} HTML files, base ${base}, ${assetNames.length} assets`,
)

async function assertLocalizedRoutes(routes, expectedSource, label) {
  const pages = ['zh-Hans', 'en'].flatMap((locale) =>
    routes.map((route) => ({
      locale,
      counterpart: locale === 'zh-Hans' ? 'en' : 'zh-Hans',
      route,
    })),
  )
  for (const page of pages) {
    const fileRoute = page.route.endsWith('/') ? `${page.route}index.html` : `${page.route}.html`
    const html = await readFile(new URL(`${page.locale}/${fileRoute}`, dist), 'utf8')
    const canonical = publicArtifactUrl(`${page.locale}/${page.route}`)
    const alternate = publicArtifactUrl(`${page.counterpart}/${page.route}`)
    if (!html.includes(`rel="canonical" href="${canonical}"`)) {
      throw new Error(`${page.locale}/${fileRoute} has an incorrect ${label} canonical URL`)
    }
    if (!html.includes(`hreflang="${page.counterpart}" href="${alternate}"`)) {
      throw new Error(`${page.locale}/${fileRoute} is missing its ${label} locale alternate`)
    }
    if (expectedSource && !html.includes(`name="mathrl:source" content="${expectedSource}"`)) {
      throw new Error(`${page.locale}/${fileRoute} is missing the pinned ${label} source`)
    }
  }
}

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
