#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { writeReleaseManifest } from './release-manifest.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(projectRoot, process.env.RELEASE_DIST ?? 'site/docs/.vitepress/dist')

async function main() {
  let version = {}
  try {
    version = JSON.parse(await readFile(resolve(distRoot, 'version.json'), 'utf8'))
  } catch {
    // A plain VitePress build can still receive a release manifest; the
    // generator will use workspace defaults and visibly mark the commit.
  }
  const result = await writeReleaseManifest(distRoot, {
    stage: process.env.VITE_SITE_STAGE === 'production' || process.env.RELEASE === '1'
      ? 'production'
      : 'preview',
    appVersion: version.appVersion,
    engineVersion: version.engineVersion,
    contentSetVersion: version.contentVersion,
    upstreamCommit: version.upstreamSourceCommit,
    dataSchema: version.dataSchema,
    gitSha: version.gitCommit ?? process.env.GITHUB_SHA,
    // version.json calls this field `builtAt`; accepting the old name keeps
    // archived manifests readable while preserving reproducible timestamps.
    generatedAt: version.builtAt ?? version.generatedAt ?? process.env.BUILD_TIMESTAMP,
  })
  console.log(`Release manifest written: ${result.output}`)
}

main().catch((error) => {
  console.error(error?.stack || error)
  process.exitCode = 1
})
