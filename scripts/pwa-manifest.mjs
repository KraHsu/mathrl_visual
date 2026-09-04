/**
 * Shared constants and path helpers for the static PWA build.
 *
 * This module deliberately has no filesystem or process side effects.  It is
 * imported by both the build-time generator and the artifact checker so that
 * a Pages sub-path is interpreted identically in CI and in a local build.
 */

export const PWA_SCHEMA_VERSION = 1
export const STORAGE_SCHEMA_VERSION = 2
export const PWA_ID = 'mathrl-visual'
export const PWA_LOCALES = Object.freeze(['zh-Hans', 'en'])

export function normalizeBase(value = '/') {
  const text = String(value || '/').trim()
  const withLeadingSlash = text.startsWith('/') ? text : `/${text}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export function stripLeadingSlash(value) {
  return String(value || '').replace(/^\/+/, '')
}

export function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

export function baseUrl(base, relativePath = '') {
  const normalizedBase = normalizeBase(base)
  return `${normalizedBase}${stripLeadingSlash(relativePath)}`
}

export function localeForRelativePath(relativePath) {
  const first = stripLeadingSlash(relativePath).split('/')[0]
  return PWA_LOCALES.includes(first) ? first : undefined
}

/**
 * Convert a generated HTML file path (relative to dist/) to the clean URL
 * used by VitePress links.  The physical `.html` URL is retained separately
 * in the precache list; the service worker can map either spelling offline.
 */
export function cleanRouteForHtml(relativePath) {
  const normalized = stripLeadingSlash(relativePath).replace(/\\/g, '/')
  if (normalized === 'index.html') return '/'
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`
  if (normalized.endsWith('.html')) return `/${normalized.slice(0, -'.html'.length)}`
  return `/${normalized}`
}

export function physicalUrlForHtml(base, relativePath) {
  return baseUrl(base, relativePath)
}

export function cleanUrlForHtml(base, relativePath) {
  const route = cleanRouteForHtml(relativePath)
  return baseUrl(base, route)
}

export function localeRootUrl(base, locale) {
  if (!PWA_LOCALES.includes(locale)) throw new Error(`Unsupported locale: ${locale}`)
  return baseUrl(base, `${locale}/`)
}

export function localeOfflineUrl(base, locale) {
  if (!PWA_LOCALES.includes(locale)) throw new Error(`Unsupported locale: ${locale}`)
  return baseUrl(base, `offline/${locale}/`)
}

export function isSameOriginAsset(url) {
  return typeof url === 'string' && !/^(?:[a-z]+:)?\/\//i.test(url) && !url.startsWith('data:')
}
