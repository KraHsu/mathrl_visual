#!/usr/bin/env node

/**
 * Generate the release metadata and offline shell for a VitePress build.
 *
 * VitePress knows the final list of hashed assets only after it has rendered
 * the site.  Running this script immediately after `vitepress build` lets us
 * produce a deterministic version manifest and a service worker without a
 * Vite plugin (and without a server-side runtime).  The script is deliberately
 * dependency-free so it can also be used by a release engineer against an
 * archived Pages artifact.
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PWA_ID,
  PWA_LOCALES,
  PWA_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION,
  baseUrl,
  cleanRouteForHtml,
  cleanUrlForHtml,
  localeForRelativePath,
  localeRootUrl,
  normalizeBase,
  physicalUrlForHtml,
} from './pwa-manifest.mjs'

import { writeReleaseManifest } from './release-manifest.mjs'
import { sourceTreeIdentity } from './source-identity.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = resolve(projectRoot, process.env.PWA_DIST ?? 'site/docs/.vitepress/dist')
const base = normalizeBase(process.env.SITE_BASE ?? process.env.PAGES_BASE ?? '/')
const stage = process.env.VITE_SITE_STAGE === 'production' || process.env.RELEASE === '1'
  ? 'production'
  : 'preview'

const generatedRelativeFiles = [
  'manifest.webmanifest',
  'manifest.zh-Hans.webmanifest',
  'manifest.en.webmanifest',
  'release-manifest.json',
  'sbom.cdx.json',
  'licenses.json',
  'offline-manifest.json',
  'version.json',
  'sw.js',
  'offline/zh-Hans/index.html',
  'offline/en/index.html',
]

const htmlMarker = /\n?<!-- mathrl-pwa:start -->[\s\S]*?<!-- mathrl-pwa:end -->\n?/g
const notFoundMarker = /\n?<!-- mathrl-404-fallback:start -->[\s\S]*?<!-- mathrl-404-fallback:end -->\n?/g

function fail(message) {
  throw new Error(`PWA asset generation failed: ${message}`)
}

function asPosix(path) {
  return path.split(sep).join('/')
}

function relativePath(absolutePath) {
  return asPosix(relative(distRoot, absolutePath))
}

async function collectFiles(directory, output = []) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, output)
    } else if (entry.isFile()) {
      output.push(absolutePath)
    }
  }
  return output
}

async function readJson(path, fallback = undefined) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (fallback !== undefined && error?.code === 'ENOENT') return fallback
    throw error
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
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

function gitTreeStatus() {
  try {
    return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=normal'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return undefined
  }
}

async function buildIdentity() {
  const rootPackage = await readJson(resolve(projectRoot, 'package.json'), {})
  const sitePackage = await readJson(resolve(projectRoot, 'site/package.json'), {})
  const cargo = await readFile(resolve(projectRoot, 'Cargo.toml'), 'utf8')
  const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
    ?? cargo.match(/^\[workspace\.package\][\s\S]*?^version\s*=\s*"([^"]+)"/m)?.[1]
    ?? '0.0.0'
  const sourceIdentity = await sourceTreeIdentity(projectRoot)
  let upstreamSourceCommit = 'unknown'
  try {
    const manifest = await import('./chapter-manifest.mjs')
    if (typeof manifest.CHAPTER_SOURCE_COMMIT === 'string') upstreamSourceCommit = manifest.CHAPTER_SOURCE_COMMIT
  } catch {
    // A minimal archived build may not carry the chapter manifest.  The
    // artifact remains verifiable; the missing provenance is visible instead
    // of being silently guessed.
  }
  const appVersion = String(
    process.env.APP_VERSION
      ?? sitePackage.version
      ?? rootPackage.version
      ?? cargoVersion,
  )
  const contentVersion = String(process.env.CONTENT_VERSION ?? `content-${sourceIdentity.hash.slice(0, 16)}`)
  const engineVersion = String(process.env.ENGINE_VERSION ?? cargoVersion)
  const explicitCommit = process.env.RELEASE_GIT_SHA ?? process.env.GITHUB_SHA
  const headCommit = gitValue(['rev-parse', 'HEAD'], 'unknown')
  const treeStatus = gitTreeStatus()
  const dirty = treeStatus === undefined || treeStatus.length > 0
  const commit = String(explicitCommit ?? (dirty ? 'working-tree-dirty' : headCommit))
  if (stage === 'production') {
    if (!/^1\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/.test(appVersion)) {
      fail(`production appVersion must be a SemVer 1.x release, received ${appVersion}`)
    }
    if (!/^[0-9a-f]{40}$/i.test(commit)) {
      fail(`production git identity must be a full 40-character commit SHA, received ${commit}`)
    }
    if (headCommit !== 'unknown' && commit !== headCommit) {
      fail(`production git identity ${commit} does not match checked-out HEAD ${headCommit}`)
    }
    if (treeStatus === undefined) fail('production build could not determine git worktree status')
    if (treeStatus.length > 0) fail('production build requires a clean git worktree')
  }
  const timestamp = process.env.BUILD_TIMESTAMP
    ?? (process.env.SOURCE_DATE_EPOCH
      ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
      : gitValue(['show', '-s', '--format=%cI', 'HEAD'], 'unrecorded'))
  return {
    appVersion,
    contentVersion,
    engineVersion,
    commit,
    upstreamSourceCommit,
    sourceIdentity,
    timestamp,
  }
}

async function removeGeneratedFiles() {
  for (const relativeFile of generatedRelativeFiles) {
    const path = resolve(distRoot, relativeFile)
    try {
      const info = await lstat(path)
      if (info.isDirectory()) {
        await rm(path, { recursive: true, force: true })
      } else {
        await unlink(path)
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function offlinePage(locale, identity) {
  const chinese = locale === 'zh-Hans'
  const title = chinese ? 'MathRL Visual · 离线页' : 'MathRL Visual · Offline'
  const heading = chinese ? '当前处于离线状态' : 'You are offline'
  const explanation = chinese
    ? '已缓存的正文和实验仍可阅读。联网后可以下载单语言或双语离线包。'
    : 'Cached lessons and labs remain available. Reconnect to download a single-language or bilingual pack.'
  const homeLabel = chinese ? '返回中文首页' : 'Return to English home'
  const otherLabel = chinese ? '切换到 English' : '切换到简体中文'
  const localePackLabel = chinese ? '下载中文离线包' : 'Download English pack'
  const otherPackLabel = chinese ? '下载 English 离线包' : '下载中文离线包'
  const allPackLabel = chinese ? '下载中英双语包' : 'Download bilingual pack'
  const statusLabel = chinese ? '离线缓存状态' : 'Offline cache status'
  const buildLabel = chinese ? '构建版本' : 'Build'
  const scriptPath = baseUrl(base, 'pwa-register.js')
  const manifestPath = baseUrl(base, `manifest.${locale}.webmanifest`)
  const currentHome = localeRootUrl(base, locale)
  const otherLocale = locale === 'zh-Hans' ? 'en' : 'zh-Hans'
  const otherHome = localeRootUrl(base, otherLocale)
  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#0d766e">
  <link rel="manifest" href="${escapeHtml(manifestPath)}">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{color-scheme:light dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f8fafc;color:#102a43}
    @media(prefers-color-scheme:dark){:root{background:#102a43;color:#f0f4f8}}
    body{max-width:48rem;margin:0 auto;padding:clamp(1.25rem,4vw,3rem);line-height:1.6}
    main{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:1rem;padding:clamp(1.25rem,4vw,2.5rem);background:color-mix(in srgb,currentColor 4%,transparent)}
    h1{line-height:1.2}.actions{display:flex;flex-wrap:wrap;gap:.7rem;margin:1.3rem 0}.actions a,.actions button{border:1px solid #0d766e;border-radius:.55rem;padding:.55rem .8rem;background:#0d766e;color:#fff;text-decoration:none;font:inherit;cursor:pointer}.actions a.secondary,.actions button.secondary{background:transparent;color:inherit}.status{min-height:2rem;border-left:.25rem solid #e2a12b;padding:.5rem .75rem}.meta{font-size:.9rem;opacity:.8}
  </style>
</head>
<body>
<main>
  <p class="meta">${escapeHtml(buildLabel)}: <code>${escapeHtml(identity.appVersion)}</code> · <code>${escapeHtml(identity.contentVersion)}</code></p>
  <h1>${escapeHtml(heading)}</h1>
  <p>${escapeHtml(explanation)}</p>
  <div class="actions">
    <a href="${escapeHtml(currentHome)}">${escapeHtml(homeLabel)}</a>
    <a class="secondary" href="${escapeHtml(otherHome)}">${escapeHtml(otherLabel)}</a>
  </div>
  <h2>${escapeHtml(statusLabel)}</h2>
  <div class="actions">
    <button type="button" data-pwa-pack="${locale}">${escapeHtml(localePackLabel)}</button>
    <button type="button" class="secondary" data-pwa-pack="${otherLocale}">${escapeHtml(otherPackLabel)}</button>
    <button type="button" class="secondary" data-pwa-pack="all">${escapeHtml(allPackLabel)}</button>
  </div>
  <p id="mathrl-pwa-status" class="status" role="status" aria-live="polite">—</p>
  <noscript><p>${escapeHtml(chinese ? '启用 JavaScript 后才能管理离线缓存；正文页面仍可在线访问。' : 'JavaScript is required to manage offline packs; lesson pages remain readable online.')}</p></noscript>
</main>
<script src="${escapeHtml(scriptPath)}" defer></script>
<script>
window.addEventListener('mathrl:pwa-progress',function(event){var d=event.detail||{};var node=document.getElementById('mathrl-pwa-status');if(!node)return;if(d.phase==='done')node.textContent=${JSON.stringify(chinese ? '离线包已准备好。' : 'Offline pack is ready.')} else if(d.phase==='error')node.textContent=${JSON.stringify(chinese ? '离线包下载失败，请联网后重试。' : 'The offline pack could not be downloaded; reconnect and retry.')} else if(d.total)node.textContent=${JSON.stringify(chinese ? '正在缓存：' : 'Caching: ')}+(d.completed||0)+'/'+d.total;});
document.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('[data-pwa-pack]');if(!button)return;var pack=button.getAttribute('data-pwa-pack');if(window.mathrlPwa&&window.mathrlPwa.prefetch){button.disabled=true;window.mathrlPwa.prefetch(pack).catch(function(){ }).finally(function(){button.disabled=false})}});
</script>
</body>
</html>
`
}

function notFoundFallback() {
  // VitePress intentionally leaves its special 404 document empty in the
  // server-rendered shell and loads the themed page only after hydration.
  // Keep a noscript-only bilingual fallback in the static artifact so a
  // direct GitHub Pages 404 remains useful when JavaScript is disabled.
  const zhHome = baseUrl(base, 'zh-Hans/')
  const enHome = baseUrl(base, 'en/')
  return `
<!-- mathrl-404-fallback:start -->
<noscript>
  <main class="mathrl-404-fallback" aria-labelledby="mathrl-404-title">
    <h1 id="mathrl-404-title">页面不存在 / Page not found</h1>
    <p lang="zh-Hans">这个地址没有对应的学习内容。请返回<a href="${escapeHtml(zhHome)}">中文首页</a>。</p>
    <p lang="en">This address does not point to a lesson. Return to the <a href="${escapeHtml(enHome)}">English home page</a>.</p>
  </main>
</noscript>
<!-- mathrl-404-fallback:end -->
`
}

async function injectNotFoundFallback(files) {
  const path = files.find((file) => relativePath(file) === '404.html')
  if (!path) return
  const content = await readFile(path, 'utf8')
  const clean = content.replace(notFoundMarker, '')
  if (!clean.includes('<div id="app"></div>')) fail('404.html has no VitePress app mount')
  await writeFile(path, clean.replace('</body>', `${notFoundFallback()}</body>`), 'utf8')
}

async function writeOfflinePages(identity) {
  for (const locale of PWA_LOCALES) {
    const path = resolve(distRoot, `offline/${locale}/index.html`)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, offlinePage(locale, identity), 'utf8')
  }
}

function htmlRecords(files) {
  return files
    .filter((path) => path.endsWith('.html'))
    .map((path) => {
      const relativeFile = relativePath(path)
      const locale = localeForRelativePath(relativeFile)
      return {
        absolutePath: path,
        relativePath: relativeFile,
        locale,
        physicalUrl: physicalUrlForHtml(base, relativeFile),
        cleanUrl: cleanUrlForHtml(base, relativeFile),
        cleanRoute: cleanRouteForHtml(relativeFile),
      }
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

function unique(values) {
  return [...new Set(values)]
}

function generatedUrl(relativeFile) {
  return baseUrl(base, relativeFile)
}

function routePacks(records, allFiles) {
  const assets = allFiles
    .map(relativePath)
    .filter((path) => path.startsWith('assets/'))
    .map(generatedUrl)
  const shared = [
    generatedUrl('favicon.svg'),
    generatedUrl('pwa-register.js'),
    generatedUrl('offline-manifest.json'),
    generatedUrl('version.json'),
    generatedUrl('release-manifest.json'),
    generatedUrl('sbom.cdx.json'),
    generatedUrl('licenses.json'),
    generatedUrl('manifest.webmanifest'),
    generatedUrl('manifest.zh-Hans.webmanifest'),
    generatedUrl('manifest.en.webmanifest'),
    ...assets,
  ]
  const packs = {}
  for (const locale of PWA_LOCALES) {
    const localeRecords = records.filter((record) => record.locale === locale)
    const routes = localeRecords
      .filter((record) => !record.relativePath.startsWith('offline/'))
      .map((record) => ({
        path: record.cleanRoute,
        physical: record.physicalUrl,
        clean: record.cleanUrl,
      }))
    const files = unique([
      ...localeRecords.filter((record) => !record.relativePath.startsWith('offline/')).map((record) => record.physicalUrl),
      generatedUrl(`offline/${locale}/index.html`),
      ...shared,
    ])
    packs[locale] = { locale, routes, files }
  }
  const all = unique(PWA_LOCALES.flatMap((locale) => packs[locale].files))
  packs.all = {
    locale: 'all',
    routes: PWA_LOCALES.flatMap((locale) => packs[locale].routes),
    files: all,
  }
  return packs
}

function manifestFor(locale, identity) {
  const chinese = locale === 'zh-Hans'
  const title = chinese
    ? '强化学习数学基础 · 可视化伴读'
    : 'Mathematical Foundations of RL · Visual Companion'
  const shortName = chinese ? 'MathRL 中文' : 'MathRL Visual'
  const description = chinese
    ? '用交互实验学习强化学习的数学基础。'
    : 'Learn the mathematical foundations of reinforcement learning through interactive experiments.'
  const chapterLinks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => ({
    name: chinese ? `第${number}章` : `Chapter ${number}`,
    short_name: chinese ? `第${number}章` : `Ch ${number}`,
    url: baseUrl(base, `${locale}/learn/ch${String(number).padStart(2, '0')}/`),
  }))
  return {
    $schema: 'https://json.schemastore.org/web-manifest-combined.json',
    id: `${base}${locale}/`,
    name: title,
    short_name: shortName,
    description,
    lang: locale,
    dir: chinese ? 'ltr' : 'ltr',
    start_url: localeRootUrl(base, locale),
    scope: base,
    display: 'standalone',
    orientation: 'any',
    theme_color: '#0d766e',
    background_color: '#f8fafc',
    icons: [
      {
        src: generatedUrl('favicon.svg'),
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
    shortcuts: chapterLinks,
    categories: ['education', 'books'],
    prefer_related_applications: false,
    _mathrl: {
      schemaVersion: PWA_SCHEMA_VERSION,
      appVersion: identity.appVersion,
      contentVersion: identity.contentVersion,
      engineVersion: identity.engineVersion,
      channel: stage,
      buildCommit: identity.commit,
      upstreamSourceCommit: identity.upstreamSourceCommit,
    },
  }
}

function offlineManifest(identity, packs) {
  const normalizedPacks = {}
  for (const [name, pack] of Object.entries(packs)) {
    normalizedPacks[name] = {
      locale: pack.locale,
      routes: pack.routes,
      files: pack.files,
      // Filled after the final scan; this estimate is useful even when a
      // download is interrupted and the browser has only partial entries.
      estimatedBytes: 0,
    }
  }
  return {
    schemaVersion: PWA_SCHEMA_VERSION,
    appId: PWA_ID,
    appVersion: identity.appVersion,
    contentVersion: identity.contentVersion,
    engineVersion: identity.engineVersion,
    channel: stage,
    base,
    defaultLocale: 'en',
    versionUrl: generatedUrl('version.json'),
    serviceWorkerUrl: generatedUrl('sw.js'),
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    packs: normalizedPacks,
  }
}

function jsLiteral(value) {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script')
}

function serviceWorker(identity, packs, coreUrls) {
  const cacheName = `${PWA_ID}:v${identity.appVersion}:${identity.contentVersion}`
  const packUrls = Object.fromEntries(Object.entries(packs).map(([name, pack]) => [name, pack.files]))
  const offlineUrls = Object.fromEntries(
    PWA_LOCALES.map((locale) => [locale, generatedUrl(`offline/${locale}/index.html`)]),
  )
  return `/* MathRL Visual PWA service worker; generated from the immutable build manifest. */
const MATHRL_PWA_SCHEMA = ${PWA_SCHEMA_VERSION};
const APP_ID = ${jsLiteral(PWA_ID)};
const BASE = ${jsLiteral(base)};
const CACHE_PREFIX = ${jsLiteral(`${PWA_ID}:`)};
const CACHE_NAME = ${jsLiteral(cacheName)};
const VERSION_URL = ${jsLiteral(generatedUrl('version.json'))};
const CORE_URLS = ${jsLiteral(unique(coreUrls))};
const CORE_SET = new Set(CORE_URLS);
const PACK_URLS = ${jsLiteral(packUrls)};
const OFFLINE_URLS = ${jsLiteral(offlineUrls)};
const PACK_NAMES = new Set(Object.keys(PACK_URLS));
const ASSET_PREFIX = BASE === '/' ? '/assets/' : BASE + 'assets/';

function sameOrigin(url) { return url.origin === self.location.origin; }
function inScope(url) {
  return url.pathname === BASE.slice(0, -1) || url.pathname.startsWith(BASE);
}
function cacheable(response) { return response && (response.ok || response.type === 'opaque'); }
function localeForUrl(url) {
  const rest = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : '';
  const first = rest.split('/')[0];
  return first === 'zh-Hans' || first === 'en' ? first : 'en';
}
function candidateUrls(request) {
  const url = new URL(request.url);
  const candidates = [url.href];
  const path = url.pathname;
  if (path.startsWith(BASE)) {
    if (path.endsWith('/')) candidates.push(new URL(path + 'index.html', url.origin).href);
    else if (!path.endsWith('.html')) candidates.push(new URL(path + '.html', url.origin).href);
  }
  return [...new Set(candidates)];
}
async function cacheResponse(cache, request, response) {
  if (cacheable(response)) await cache.put(request, response.clone());
  return response;
}
async function cacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (cacheable(response)) {
      await cache.put(url, response.clone());
      return { url, ok: true, bytes: Number(response.headers.get('content-length') || 0) };
    }
    return { url, ok: false, status: response.status };
  } catch (error) {
    return { url, ok: false, error: String(error && error.message || error) };
  }
}
async function notify(clientId, payload) {
  if (!clientId) return;
  const client = await self.clients.get(clientId);
  if (client) client.postMessage({ source: APP_ID, schemaVersion: MATHRL_PWA_SCHEMA, ...payload });
}
async function prefetch(urls, clientId, requestId) {
  const cache = await caches.open(CACHE_NAME);
  const uniqueUrls = [...new Set(urls)];
  let completed = 0;
  const failures = [];
  await notify(clientId, { type: 'PWA_PROGRESS', phase: 'start', requestId, total: uniqueUrls.length, completed: 0 });
  for (const url of uniqueUrls) {
    const result = await cacheUrl(cache, url);
    completed += 1;
    if (!result.ok) failures.push(result);
    await notify(clientId, { type: 'PWA_PROGRESS', phase: 'progress', requestId, total: uniqueUrls.length, completed, url, failed: failures.length });
  }
  const payload = { requestId, total: uniqueUrls.length, completed, failed: failures.length, failures };
  await notify(clientId, { type: failures.length ? 'PWA_ERROR' : 'PWA_PROGRESS', phase: failures.length ? 'error' : 'done', ...payload });
  return payload;
}
async function clearPack(name, clientId, requestId) {
  const cache = await caches.open(CACHE_NAME);
  const urls = PACK_URLS[name] || [];
  let removed = 0;
  // Shared shell/metadata and both offline fallback pages are retained even
  // when a locale pack is cleared.  This keeps the app recoverable offline;
  // locale-specific lesson pages and their optional assets can be removed.
  for (const url of urls) {
    if (CORE_SET.has(url)) continue;
    if (await cache.delete(url)) removed += 1;
  }
  await notify(clientId, { type: 'PWA_CLEARED', requestId, pack: name, removed });
  return { pack: name, removed };
}
async function cacheStatus(name, clientId, requestId) {
  const cache = await caches.open(CACHE_NAME);
  const urls = PACK_URLS[name] || [];
  let cached = 0;
  for (const url of urls) if (await cache.match(url)) cached += 1;
  await notify(clientId, { type: 'PWA_STATUS', requestId, pack: name, total: urls.length, cached });
}

self.addEventListener('install', (event) => {
  // Activate immediately only for a first install.  An already-controlled
  // page keeps its current worker until the user explicitly confirms an
  // update via PWA_SKIP_WAITING; this prevents mixed old/new assets.
  const firstInstall = !self.registration.active;
  event.waitUntil(prefetch(CORE_URLS).then(() => firstInstall ? self.skipWaiting() : undefined));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const clientId = event.source && event.source.id;
  const requestId = typeof data.requestId === 'string' ? data.requestId : undefined;
  if (data.type === 'PWA_SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'PWA_PREFETCH') {
    const pack = data.pack === 'all' ? 'all' : data.pack;
    if (!PACK_NAMES.has(pack)) { notify(clientId, { type: 'PWA_ERROR', phase: 'error', requestId, error: 'unknown pack' }); return; }
    event.waitUntil(prefetch(PACK_URLS[pack], clientId, requestId));
    return;
  }
  if (data.type === 'PWA_CLEAR') {
    const pack = data.pack === 'all' ? 'all' : data.pack;
    if (!PACK_NAMES.has(pack)) { notify(clientId, { type: 'PWA_ERROR', phase: 'error', requestId, error: 'unknown pack' }); return; }
    event.waitUntil(clearPack(pack, clientId, requestId));
    return;
  }
  if (data.type === 'PWA_STATUS') {
    const pack = data.pack === 'all' ? 'all' : data.pack;
    if (!PACK_NAMES.has(pack)) { notify(clientId, { type: 'PWA_ERROR', phase: 'error', requestId, error: 'unknown pack' }); return; }
    event.waitUntil(cacheStatus(pack, clientId, requestId));
  }
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!sameOrigin(url) || !inScope(url)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cacheResponse(cache, request, response);
        return response;
      } catch {
        for (const candidate of candidateUrls(request)) {
          const cached = await cache.match(candidate);
          if (cached) return cached;
        }
        const fallback = await cache.match(OFFLINE_URLS[localeForUrl(url)]) || await cache.match(OFFLINE_URLS.en);
        return fallback || Response.error();
      }
    })());
    return;
  }
  if (url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try { return await cacheResponse(cache, request, await fetch(request)); } catch { return Response.error(); }
    })());
    return;
  }
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try { return await cacheResponse(cache, request, await fetch(request)); } catch { return (await cache.match(request)) || Response.error(); }
    })());
  }
});
`
}

async function fileRecords(files) {
  const records = []
  for (const path of files.map(relativePath).sort()) {
    const absolutePath = resolve(distRoot, path)
    const [content, info] = await Promise.all([readFile(absolutePath), stat(absolutePath)])
    records.push({ path, bytes: info.size, sha256: sha256(content) })
  }
  return records
}

function artifactDigest(records) {
  return sha256(records.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}`).join('\n'))
}

async function updatePackSizes(manifest, records) {
  const byUrl = new Map(records.map((record) => [generatedUrl(record.path), record.bytes]))
  for (const pack of Object.values(manifest.packs)) {
    pack.estimatedBytes = pack.files.reduce((sum, url) => sum + (byUrl.get(url) ?? 0), 0)
  }
  return manifest
}

async function injectPwaLinks(files) {
  for (const path of files.filter((file) => file.endsWith('.html'))) {
    const relativeFile = relativePath(path)
    if (relativeFile.startsWith('offline/')) continue
    const locale = localeForRelativePath(relativeFile)
    const manifest = locale === 'zh-Hans'
      ? 'manifest.zh-Hans.webmanifest'
      : locale === 'en'
        ? 'manifest.en.webmanifest'
        : 'manifest.webmanifest'
    const content = await readFile(path, 'utf8')
    if (!content.includes('</head>')) fail(`${relativeFile} has no </head> to inject PWA links`)
    const clean = content.replace(htmlMarker, '')
    const block = `\n<!-- mathrl-pwa:start -->\n<link rel="manifest" href="${generatedUrl(manifest)}">\n<meta name="application-name" content="MathRL Visual">\n<meta name="mathrl:pwa-schema" content="${PWA_SCHEMA_VERSION}">\n<script src="${generatedUrl('pwa-register.js')}" defer></script>\n<!-- mathrl-pwa:end -->\n`
    await writeFile(path, clean.replace('</head>', `${block}</head>`), 'utf8')
  }
}

async function main() {
  await stat(distRoot).catch(() => fail(`dist directory does not exist: ${distRoot}`))
  const identity = await buildIdentity()
  await removeGeneratedFiles()
  await writeReleaseManifest(distRoot, {
    stage,
    appVersion: identity.appVersion,
    engineVersion: identity.engineVersion,
    contentSetVersion: identity.contentVersion,
    upstreamCommit: identity.upstreamSourceCommit,
    gitSha: identity.commit,
    generatedAt: identity.timestamp,
  })
  let files = await collectFiles(distRoot)
  let records = htmlRecords(files)
  if (!records.some((record) => record.relativePath === 'index.html')) fail('VitePress output is missing index.html')
  if (!PWA_LOCALES.every((locale) => records.some((record) => record.relativePath === `${locale}/index.html`))) {
    fail('VitePress output is missing one of the locale home pages')
  }

  await writeOfflinePages(identity)
  files = await collectFiles(distRoot)
  records = htmlRecords(files)
  const packs = routePacks(records, files)
  const coreUrls = unique([
    generatedUrl('index.html'),
    generatedUrl('404.html'),
    ...PWA_LOCALES.flatMap((locale) => [
      generatedUrl(`${locale}/index.html`),
      generatedUrl(`offline/${locale}/index.html`),
    ]),
    generatedUrl('favicon.svg'),
    generatedUrl('pwa-register.js'),
    generatedUrl('offline-manifest.json'),
    generatedUrl('version.json'),
    generatedUrl('release-manifest.json'),
    generatedUrl('sbom.cdx.json'),
    generatedUrl('licenses.json'),
    generatedUrl('manifest.webmanifest'),
    generatedUrl('manifest.zh-Hans.webmanifest'),
    generatedUrl('manifest.en.webmanifest'),
  ])
  const offline = offlineManifest(identity, packs)
  await writeFile(resolve(distRoot, 'offline-manifest.json'), `${JSON.stringify(offline, null, 2)}\n`, 'utf8')
  for (const locale of PWA_LOCALES) {
    await writeFile(
      resolve(distRoot, `manifest.${locale}.webmanifest`),
      `${JSON.stringify(manifestFor(locale, identity), null, 2)}\n`,
      'utf8',
    )
  }
  await writeFile(resolve(distRoot, 'manifest.webmanifest'), `${JSON.stringify(manifestFor('en', identity), null, 2)}\n`, 'utf8')
  await writeFile(resolve(distRoot, 'sw.js'), serviceWorker(identity, packs, coreUrls), 'utf8')
  execFileSync(process.execPath, [resolve(projectRoot, 'scripts/generate-sbom.mjs')], {
    cwd: projectRoot,
    env: {
      ...process.env,
      APP_VERSION: identity.appVersion,
      UPSTREAM_COMMIT: identity.upstreamSourceCommit,
      BUILD_TIMESTAMP: identity.timestamp,
      SBOM_DIST: distRoot,
    },
    stdio: 'inherit',
  })
  files = await collectFiles(distRoot)
  await injectNotFoundFallback(files)
  files = await collectFiles(distRoot)
  await injectPwaLinks(files)
  files = await collectFiles(distRoot)
  records = htmlRecords(files)
  const finalRecords = await fileRecords(files.filter((path) => relativePath(path) !== 'version.json'))
  await updatePackSizes(offline, finalRecords)
  await writeFile(resolve(distRoot, 'offline-manifest.json'), `${JSON.stringify(offline, null, 2)}\n`, 'utf8')
  // The offline manifest size is part of the artifact, so refresh the final
  // file records once after updating its estimates.
  files = await collectFiles(distRoot)
  const artifactRecords = await fileRecords(files.filter((path) => relativePath(path) !== 'version.json'))
  const version = {
    schemaVersion: PWA_SCHEMA_VERSION,
    appId: PWA_ID,
    appVersion: identity.appVersion,
    contentVersion: identity.contentVersion,
    engineVersion: identity.engineVersion,
    channel: stage,
    base,
    builtAt: identity.timestamp,
    gitCommit: identity.commit,
    upstreamSourceCommit: identity.upstreamSourceCommit,
    sourceTreeSha256: identity.sourceIdentity.hash,
    sourceFileCount: identity.sourceIdentity.files,
    storage: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      migration: 'site/docs/.vitepress/pwaMigration.ts',
    },
    pwa: {
      schemaVersion: PWA_SCHEMA_VERSION,
      serviceWorker: generatedUrl('sw.js'),
      manifest: {
        default: generatedUrl('manifest.webmanifest'),
        'zh-Hans': generatedUrl('manifest.zh-Hans.webmanifest'),
        en: generatedUrl('manifest.en.webmanifest'),
      },
      offlineManifest: generatedUrl('offline-manifest.json'),
      releaseManifest: generatedUrl('release-manifest.json'),
      sbom: generatedUrl('sbom.cdx.json'),
      licenses: generatedUrl('licenses.json'),
    },
    artifact: {
      excludes: ['version.json'],
      fileCount: artifactRecords.length,
      totalBytes: artifactRecords.reduce((sum, record) => sum + record.bytes, 0),
      sha256: artifactDigest(artifactRecords),
      files: artifactRecords,
    },
  }
  await writeFile(resolve(distRoot, 'version.json'), `${JSON.stringify(version, null, 2)}\n`, 'utf8')
  console.log(
    `PWA assets generated: ${version.artifact.fileCount} files, ${version.artifact.totalBytes} bytes, `
      + `artifact ${version.artifact.sha256.slice(0, 16)}…, base ${base}, channel ${stage}`,
  )
}

main().catch((error) => {
  console.error(error?.stack || error)
  process.exitCode = 1
})
