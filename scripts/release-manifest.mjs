/**
 * Versioned identity for a static release.
 *
 * Keep this dependency-free so build scripts, the VitePress config, and
 * artifact checks use exactly the same schema.  The generated JSON is an
 * evidence record, not a mutable runtime configuration file.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const RELEASE_MANIFEST_SCHEMA = 1
export const DEFAULT_CONTENT_SET_VERSION = 'companion-2026-09-03'
export const DEFAULT_UPSTREAM_COMMIT = '0e348961c28496096d308f1066009266b3674c5a'
export const RELEASE_LOCALES = Object.freeze(['zh-Hans', 'en'])

export function normalizeStage(value) {
  return value === 'production' ? 'production' : 'preview'
}

export function buildReleaseManifest(options = {}) {
  const stage = normalizeStage(options.stage ?? process.env.VITE_SITE_STAGE)
  const appVersion = String(options.appVersion ?? process.env.APP_VERSION ?? '0.1.0')
  const engineVersion = String(options.engineVersion ?? process.env.ENGINE_VERSION ?? appVersion)
  const contentSetVersion = String(
    options.contentSetVersion ?? process.env.CONTENT_SET_VERSION ?? DEFAULT_CONTENT_SET_VERSION,
  )
  const upstreamCommit = String(
    options.upstreamCommit ?? process.env.UPSTREAM_COMMIT ?? DEFAULT_UPSTREAM_COMMIT,
  )
  const schema = Number(options.dataSchema ?? process.env.DATA_SCHEMA_VERSION ?? 2)
  const generatedAt = String(
    options.generatedAt ??
      process.env.RELEASE_TIMESTAMP ??
      process.env.SOURCE_DATE_EPOCH ??
      new Date().toISOString(),
  )
  const gitSha = String(
    options.gitSha ?? process.env.RELEASE_GIT_SHA ?? process.env.GITHUB_SHA ?? 'working-tree',
  )
  return {
    schema: RELEASE_MANIFEST_SCHEMA,
    stage,
    appVersion,
    engineVersion,
    contentSetVersion,
    dataSchema: schema,
    locales: [...RELEASE_LOCALES],
    upstreamCommit,
    gitSha,
    generatedAt,
    reviewGate: stage === 'production' ? 'approved-only' : 'preview-visible-status',
  }
}

export function validateReleaseManifest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value
  return (
    candidate.schema === RELEASE_MANIFEST_SCHEMA &&
    (candidate.stage === 'preview' || candidate.stage === 'production') &&
    typeof candidate.appVersion === 'string' &&
    typeof candidate.engineVersion === 'string' &&
    typeof candidate.contentSetVersion === 'string' &&
    Number.isInteger(candidate.dataSchema) &&
    Array.isArray(candidate.locales) &&
    JSON.stringify(candidate.locales) === JSON.stringify(RELEASE_LOCALES) &&
    typeof candidate.upstreamCommit === 'string' &&
    typeof candidate.gitSha === 'string' &&
    typeof candidate.generatedAt === 'string' &&
    (candidate.reviewGate === 'approved-only' || candidate.reviewGate === 'preview-visible-status')
  )
}

export async function writeReleaseManifest(distDir, options = {}) {
  const manifest = buildReleaseManifest(options)
  const output = resolve(distDir, 'release-manifest.json')
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return { output, manifest }
}

export async function readReleaseManifest(distDir) {
  try {
    const source = await readFile(resolve(distDir, 'release-manifest.json'), 'utf8')
    const manifest = JSON.parse(source)
    return validateReleaseManifest(manifest) ? manifest : undefined
  } catch {
    return undefined
  }
}
