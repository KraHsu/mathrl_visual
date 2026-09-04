#!/usr/bin/env node

/**
 * Small, dependency-free HTTPS smoke test for an already deployed static
 * artifact.  It intentionally checks the public contract (HTML, locale
 * alternates, PWA metadata and dependency evidence), not implementation
 * details that belong to Playwright.  Set SMOKE_REPORT to archive the result.
 */

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const rawTarget = process.env.SMOKE_URL ?? process.env.SMOKE_ORIGIN
if (!rawTarget) {
  console.error('Usage: SMOKE_URL=https://example.test/base/ node scripts/smoke-deployed.mjs')
  process.exit(2)
}

const target = new URL(rawTarget)
if (target.protocol !== 'https:' && process.env.SMOKE_ALLOW_HTTP !== '1') {
  throw new Error('Smoke target must use HTTPS (set SMOKE_ALLOW_HTTP=1 only for local testing)')
}
target.hash = ''
target.search = ''
const basePath = normalizeBase(target.pathname)
target.pathname = basePath

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 12_000)
const retries = Number(process.env.SMOKE_RETRIES ?? 2)
const reportPath = process.env.SMOKE_REPORT ? resolve(projectRoot, process.env.SMOKE_REPORT) : undefined
const expectedAppVersion = process.env.EXPECTED_APP_VERSION
const expectedGitSha = process.env.EXPECTED_GIT_SHA
const expectedStage = process.env.EXPECTED_STAGE ?? 'production'

function normalizeBase(value) {
  const withLeading = value.startsWith('/') ? value : `/${value}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

function urlFor(path) {
  const relative = String(path).replace(/^\/+/, '')
  return new URL(`${basePath}${relative}`, target).href
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function fetchWithRetry(path, expectedStatuses = [200]) {
  const url = urlFor(path)
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { accept: 'text/html,application/json,application/manifest+json,*/*' },
      })
      // A public smoke check must not silently accept a redirect to a different
      // origin (for example a stale deployment, login page, or typo-squatted
      // host).  Same-origin redirects that only normalize a trailing slash are
      // fine and are recorded below for auditability.
      const finalUrl = new URL(response.url)
      if (finalUrl.origin !== target.origin) {
        throw new Error(`${path}: redirect left the expected origin ${target.origin} -> ${finalUrl.origin}`)
      }
      if (basePath !== '/' && !finalUrl.pathname.startsWith(basePath)) {
        throw new Error(`${path}: redirect left the expected base path ${basePath} -> ${finalUrl.pathname}`)
      }
      const body = await response.text()
      if (!expectedStatuses.includes(response.status)) {
        throw new Error(`${path}: expected ${expectedStatuses.join('/')} but received ${response.status}`)
      }
      return {
        path,
        url,
        finalUrl: response.url,
        status: response.status,
        contentType: response.headers.get('content-type') ?? '',
        body,
      }
    } catch (error) {
      lastError = error
      if (attempt < retries) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * 2 ** attempt))
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`${path}: ${lastError?.message ?? lastError}`)
}

const checks = [
  { path: '', kind: 'html', locale: 'en' },
  { path: 'en/', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/learn/ch01/', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/learn/ch01/', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/concepts/markov-property', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/concepts/markov-property', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/map', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/map', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/symbols', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/symbols', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/search', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/search', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/offline', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/offline', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/labs/ch01-gridworld', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/labs/ch01-gridworld', kind: 'html', locale: 'zh-Hans' },
  { path: 'en/labs/ch10-actor-critic', kind: 'html', locale: 'en' },
  { path: 'zh-Hans/labs/ch10-actor-critic', kind: 'html', locale: 'zh-Hans' },
  { path: 'version.json', kind: 'json' },
  { path: 'release-manifest.json', kind: 'json' },
  { path: 'offline-manifest.json', kind: 'json' },
  { path: 'manifest.en.webmanifest', kind: 'json' },
  { path: 'manifest.zh-Hans.webmanifest', kind: 'json' },
  { path: 'sw.js', kind: 'text' },
  { path: 'sbom.cdx.json', kind: 'json' },
  { path: 'licenses.json', kind: 'json' },
  { path: 'offline/en/index.html', kind: 'offline-html', locale: 'en' },
  { path: 'offline/zh-Hans/index.html', kind: 'offline-html', locale: 'zh-Hans' },
]

const results = []
const documents = new Map()
for (const check of checks) {
  const result = await fetchWithRetry(check.path)
  if (check.kind === 'html' || check.kind === 'offline-html') {
    assert(/text\/html/i.test(result.contentType), `${check.path}: response is not HTML`)
    assert(result.body.includes('<html'), `${check.path}: missing HTML document`)
    assert(result.body.includes(`lang="${check.locale}"`), `${check.path}: wrong language marker`)
    if (check.kind === 'html') assert(result.body.includes('mathrl-pwa:start'), `${check.path}: missing PWA metadata`)
  } else if (check.kind === 'json') {
    try {
      documents.set(check.path, JSON.parse(result.body))
    } catch (error) {
      throw new Error(`${check.path}: invalid JSON (${error.message})`)
    }
  } else {
    assert(result.body.length > 0, `${check.path}: empty response`)
  }
  results.push({
    path: check.path || '/',
    url: result.url,
    finalUrl: result.finalUrl,
    status: result.status,
    bytes: Buffer.byteLength(result.body),
    contentType: result.contentType,
  })
}

const version = documents.get('version.json')
const release = documents.get('release-manifest.json')
const sbom = documents.get('sbom.cdx.json')
const licenses = documents.get('licenses.json')
assert(version && typeof version === 'object', 'version.json did not return an object')
assert(release && typeof release === 'object', 'release-manifest.json did not return an object')
assert(
  sbom?.$schema === 'https://cyclonedx.org/schema/bom-1.5.schema.json'
    && sbom.bomFormat === 'CycloneDX'
    && sbom.specVersion === '1.5'
    && Array.isArray(sbom.components)
    && sbom.components.length > 0,
  'deployed SBOM is missing or invalid',
)
assert(
  licenses?.schemaVersion === 1
    && Array.isArray(licenses.licenses)
    && licenses.licenses.length > 0
    && licenses.componentCount === sbom.components.length,
  'deployed license inventory is missing or incomplete',
)
assert(version.base === basePath, `version.json base ${version.base} does not match ${basePath}`)
assert(version.channel === expectedStage, `deployed artifact channel is ${version.channel}, expected ${expectedStage}`)
assert(release.stage === expectedStage, `release manifest stage is ${release.stage}, expected ${expectedStage}`)
assert(version.gitCommit === release.gitSha, 'version and release manifests disagree on git SHA')
assert(version.appVersion === release.appVersion, 'version and release manifests disagree on app version')
if (expectedAppVersion) {
  assert(version.appVersion === expectedAppVersion, `deployed appVersion ${version.appVersion} does not match ${expectedAppVersion}`)
}
if (expectedGitSha) {
  assert(version.gitCommit === expectedGitSha, `deployed gitCommit ${version.gitCommit} does not match ${expectedGitSha}`)
}

const notFound = await fetchWithRetry('__mathrl_missing_route__', [404, 200])
assert(notFound.body.includes('页面不存在') && notFound.body.includes('Page not found'), '404 response is missing bilingual fallback copy')
results.push({
  path: '__mathrl_missing_route__',
  url: notFound.url,
  finalUrl: notFound.finalUrl,
  status: notFound.status,
  bytes: Buffer.byteLength(notFound.body),
  contentType: notFound.contentType,
})

const report = {
  schemaVersion: 1,
  target: target.href,
  base: basePath,
  expectedAppVersion: expectedAppVersion ?? null,
  expectedGitSha: expectedGitSha ?? null,
  expectedStage,
  deployedAppVersion: version.appVersion,
  deployedGitSha: version.gitCommit,
  checkedAt: new Date().toISOString(),
  checks: results,
}
if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`Deployment smoke OK: ${results.length} endpoints, ${target.href}`)
