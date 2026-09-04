#!/usr/bin/env node

/**
 * Validate the PWA files generated next to a VitePress artifact.
 *
 * This is intentionally stricter than a smoke test: every file listed by
 * version.json is hashed again, every locale pack must point at real files,
 * and every rendered HTML page must carry the matching manifest and bootstrap
 * script.  It can be run against a local build or an extracted GitHub Pages
 * artifact by setting PWA_DIST and PAGES_BASE.
 */

import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PWA_ID,
  PWA_LOCALES,
  PWA_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION,
  baseUrl,
  localeForRelativePath,
  normalizeBase,
} from './pwa-manifest.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(projectRoot, process.env.PWA_DIST ?? 'site/docs/.vitepress/dist')
const base = normalizeBase(process.env.PAGES_BASE ?? process.env.SITE_BASE ?? '/mathrl_visual/')

function fail(message) {
  throw new Error(`PWA artifact check failed: ${message}`)
}

function asPosix(path) {
  return path.split(sep).join('/')
}

function relativePath(path) {
  return asPosix(relative(distRoot, path))
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function collectFiles(directory, output = []) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) await collectFiles(path, output)
    else if (entry.isFile()) output.push(path)
  }
  return output
}

async function readJson(relativeFile) {
  const path = resolve(distRoot, relativeFile)
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`missing ${relativeFile}`)
    fail(`${relativeFile} is not valid JSON: ${error?.message || error}`)
  }
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function pathFromUrl(value) {
  assert(typeof value === 'string' && value.startsWith('/'), `URL is not a root-relative path: ${String(value)}`)
  const withoutBase = value.startsWith(base) ? value.slice(base.length) : undefined
  assert(withoutBase !== undefined, `URL escapes Pages base ${base}: ${value}`)
  const decoded = decodeURIComponent(withoutBase)
  assert(!decoded.includes('..'), `URL contains path traversal: ${value}`)
  return decoded.replace(/^\/+/, '')
}

function artifactDigest(records) {
  return sha256(records.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}`).join('\n'))
}

function assertManifest(manifest, locale, version) {
  assert(manifest && typeof manifest === 'object', `${locale} manifest is not an object`)
  assert(manifest.lang === locale, `${locale} manifest lang mismatch`)
  assert(manifest.scope === base, `${locale} manifest scope must be ${base}`)
  assert(manifest.start_url === baseUrl(base, `${locale}/`), `${locale} manifest start_url mismatch`)
  assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, `${locale} manifest has no icons`)
  assert(manifest.icons.every((icon) => pathFromUrl(icon.src)), `${locale} manifest has an invalid icon URL`)
  assert(manifest._mathrl?.schemaVersion === PWA_SCHEMA_VERSION, `${locale} manifest schema mismatch`)
  assert(manifest._mathrl?.appVersion === version.appVersion, `${locale} manifest app version mismatch`)
  assert(manifest._mathrl?.contentVersion === version.contentVersion, `${locale} manifest content version mismatch`)
}

async function main() {
  await stat(distRoot).catch(() => fail(`dist directory does not exist: ${distRoot}`))
  const version = await readJson('version.json')
  assert(version.schemaVersion === PWA_SCHEMA_VERSION, 'version schema mismatch')
  assert(version.appId === PWA_ID, 'version appId mismatch')
  assert(typeof version.appVersion === 'string' && version.appVersion.length > 0, 'missing appVersion')
  assert(typeof version.contentVersion === 'string' && version.contentVersion.length > 0, 'missing contentVersion')
  assert(typeof version.engineVersion === 'string' && version.engineVersion.length > 0, 'missing engineVersion')
  assert(version.base === base, `version base is ${version.base}, expected ${base}`)
  assert(version.storage?.schemaVersion === STORAGE_SCHEMA_VERSION, 'storage schema mismatch')
  assert(version.pwa?.schemaVersion === PWA_SCHEMA_VERSION, 'nested PWA schema mismatch')
  assert(version.pwa?.serviceWorker === baseUrl(base, 'sw.js'), 'service worker URL mismatch')
  assert(version.pwa?.releaseManifest === baseUrl(base, 'release-manifest.json'), 'release manifest URL mismatch')
  assert(version.pwa?.sbom === baseUrl(base, 'sbom.cdx.json'), 'SBOM URL mismatch')
  assert(version.pwa?.licenses === baseUrl(base, 'licenses.json'), 'license inventory URL mismatch')

  const release = await readJson('release-manifest.json')
  assert(release.schema === 1, 'release manifest schema mismatch')
  assert(release.stage === (version.channel === 'production' ? 'production' : 'preview'), 'release stage mismatch')
  assert(release.appVersion === version.appVersion, 'release app version mismatch')
  assert(release.engineVersion === version.engineVersion, 'release engine version mismatch')
  assert(release.contentSetVersion === version.contentVersion, 'release content version mismatch')
  assert(release.gitSha === version.gitCommit, 'release git SHA mismatch')
  assert(release.upstreamCommit === version.upstreamSourceCommit, 'release upstream commit mismatch')
  assert(typeof release.generatedAt === 'string' && release.generatedAt.length > 0, 'release timestamp missing')

  const manifestFiles = {
    default: 'manifest.webmanifest',
    'zh-Hans': 'manifest.zh-Hans.webmanifest',
    en: 'manifest.en.webmanifest',
  }
  for (const [locale, file] of Object.entries(manifestFiles)) assertManifest(await readJson(file), locale === 'default' ? 'en' : locale, version)

  const offline = await readJson('offline-manifest.json')
  assert(offline.schemaVersion === PWA_SCHEMA_VERSION, 'offline manifest schema mismatch')
  assert(offline.appId === PWA_ID, 'offline manifest appId mismatch')
  assert(offline.base === base, 'offline manifest base mismatch')
  assert(offline.storageSchemaVersion === STORAGE_SCHEMA_VERSION, 'offline storage schema mismatch')
  assert(offline.packs && typeof offline.packs === 'object', 'offline manifest has no packs')
  for (const name of [...PWA_LOCALES, 'all']) {
    const pack = offline.packs[name]
    assert(pack && Array.isArray(pack.files), `offline pack ${name} is missing files`)
    assert(pack.files.length > 0, `offline pack ${name} is empty`)
    assert(Number.isSafeInteger(pack.estimatedBytes) && pack.estimatedBytes > 0, `offline pack ${name} has no byte estimate`)
    for (const fileUrl of pack.files) {
      const path = pathFromUrl(fileUrl)
      await stat(resolve(distRoot, path)).catch(() => fail(`offline pack ${name} references missing ${path}`))
    }
    assert(Array.isArray(pack.routes), `offline pack ${name} is missing routes`)
    for (const route of pack.routes) {
      assert(route && typeof route.path === 'string' && typeof route.physical === 'string', `offline pack ${name} has malformed route`)
      const physicalPath = pathFromUrl(route.physical)
      await stat(resolve(distRoot, physicalPath)).catch(() => fail(`offline route ${name} references missing ${physicalPath}`))
    }
  }
  for (const locale of PWA_LOCALES) {
    const localeFiles = new Set(offline.packs[locale].files)
    for (const file of offline.packs[locale].files) assert(offline.packs.all.files.includes(file), `all pack misses ${locale} file ${file}`)
    assert(localeFiles.has(baseUrl(base, `offline/${locale}/index.html`)), `${locale} pack misses its offline page`)
  }

  const sw = await readFile(resolve(distRoot, 'sw.js'), 'utf8').catch(() => fail('missing sw.js'))
  assert(sw.includes(`const MATHRL_PWA_SCHEMA = ${PWA_SCHEMA_VERSION}`), 'service worker schema is not generated')
  assert(sw.includes('const CACHE_NAME ='), 'service worker has no versioned cache')
  assert(sw.includes('const CORE_SET = new Set(CORE_URLS)'), 'service worker does not protect core cache entries')
  assert(sw.includes('if (CORE_SET.has(url)) continue'), 'service worker clearPack can delete core cache entries')
  assert(sw.includes(baseUrl(base, 'version.json')), 'service worker does not precache version.json')
  assert(sw.includes(baseUrl(base, 'release-manifest.json')), 'service worker does not precache release-manifest.json')
  assert(sw.includes(baseUrl(base, 'sbom.cdx.json')), 'service worker does not precache sbom.cdx.json')
  assert(sw.includes(baseUrl(base, 'licenses.json')), 'service worker does not precache licenses.json')
  assert(sw.includes("const ASSET_PREFIX = BASE === '/' ? '/assets/' : BASE + 'assets/';"), 'service worker has an invalid root/subpath asset prefix')
  assert(sw.includes('const firstInstall = !self.registration.active'), 'service worker must distinguish first install from update')
  assert(!sw.includes('prefetch(CORE_URLS).then(() => self.skipWaiting())'), 'service worker unconditionally skips waiting on updates')
  assert(!/https?:\/\//i.test(sw), 'service worker contains an external URL')

  const files = await collectFiles(distRoot)
  const htmlFiles = files.filter((path) => path.endsWith('.html'))
  assert(htmlFiles.length > 0, 'artifact has no HTML')
  for (const path of htmlFiles) {
    const relativeFile = relativePath(path)
    const html = await readFile(path, 'utf8')
    assert(html.includes('pwa-register.js'), `${relativeFile} is missing the PWA bootstrap script`)
    if (relativeFile.startsWith('offline/')) continue
    const locale = localeForRelativePath(relativeFile)
    const expectedManifest = locale === 'zh-Hans'
      ? 'manifest.zh-Hans.webmanifest'
      : locale === 'en'
        ? 'manifest.en.webmanifest'
        : 'manifest.webmanifest'
    assert(html.includes(`rel="manifest" href="${baseUrl(base, expectedManifest)}"`), `${relativeFile} has the wrong manifest link`)
    assert(html.includes(`name="mathrl:pwa-schema" content="${PWA_SCHEMA_VERSION}"`), `${relativeFile} has no PWA schema marker`)
  }

  const listed = version.artifact?.files
  assert(Array.isArray(listed) && listed.length > 0, 'version artifact file list is empty')
  const listedPaths = new Set()
  for (const record of listed) {
    assert(record && typeof record.path === 'string' && !record.path.startsWith('/') && !record.path.includes('..'), 'invalid artifact record path')
    assert(!listedPaths.has(record.path), `duplicate artifact record ${record.path}`)
    listedPaths.add(record.path)
    const path = resolve(distRoot, record.path)
    const [content, info] = await Promise.all([readFile(path).catch(() => fail(`artifact record missing ${record.path}`)), stat(path)])
    assert(info.size === record.bytes, `${record.path} byte count changed`)
    assert(sha256(content) === record.sha256, `${record.path} checksum changed`)
  }
  const actualPaths = new Set(files.map(relativePath).filter((path) => path !== 'version.json'))
  assert(actualPaths.size === listedPaths.size, 'artifact file list size does not match dist')
  for (const path of actualPaths) assert(listedPaths.has(path), `dist file ${path} is absent from version manifest`)
  const expectedDigest = artifactDigest(listed)
  assert(expectedDigest === version.artifact.sha256, 'artifact aggregate checksum mismatch')
  assert(version.artifact.fileCount === listed.length, 'artifact fileCount mismatch')
  assert(version.artifact.totalBytes === listed.reduce((sum, record) => sum + record.bytes, 0), 'artifact totalBytes mismatch')

  console.log(`PWA artifact OK: ${listed.length} files, ${version.artifact.totalBytes} bytes, version ${version.appVersion}, content ${version.contentVersion}, base ${base}`)
}

main().catch((error) => {
  console.error(error?.stack || error)
  process.exitCode = 1
})
