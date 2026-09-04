#!/usr/bin/env node

/**
 * Check the compressed size of the static VitePress output.
 *
 * Usage:
 *   node scripts/check-performance-budget.mjs
 *   PERF_DIST=site/docs/.vitepress/dist node scripts/check-performance-budget.mjs
 *   node scripts/check-performance-budget.mjs --json
 *
 * The check intentionally uses gzip and Brotli sizes instead of raw byte
 * counts: those are the bytes a static host normally transfers.  Per-file
 * limits catch an accidentally bundled lab while aggregate limits catch a
 * broad regression in the complete offline site.
 */

import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
} from 'node:zlib'
import { readFile, readdir } from 'node:fs/promises'
import { basename, extname, relative, resolve, sep } from 'node:path'

const projectRoot = resolve(new URL('..', import.meta.url).pathname)
const distRoot = resolve(projectRoot, process.env.PERF_DIST ?? 'site/docs/.vitepress/dist')
const budgetFile = resolve(
  projectRoot,
  process.env.PERF_BUDGET ?? 'scripts/performance-budget.json',
)
const asJson = process.argv.includes('--json')

const budgetDocument = JSON.parse(await readFile(budgetFile, 'utf8'))
const budgets = budgetDocument?.budgets
if (!budgets || typeof budgets !== 'object') {
  throw new Error(`Invalid performance budget file: ${budgetFile}`)
}

const files = await collectFiles(distRoot)
if (files.length === 0) {
  throw new Error(`No static files found under ${distRoot}; build the site first.`)
}

const metrics = []
for (const file of files) {
  const bytes = await readFile(file)
  metrics.push({
    file,
    relative: relative(distRoot, file).split(sep).join('/'),
    raw: bytes.byteLength,
    // Level 6 / quality 5 approximate the defaults used by common static
    // hosts while keeping this gate fast enough for every pull request.
    gzip: gzipSync(bytes, { level: 6 }).byteLength,
    brotli: brotliCompressSync(bytes, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
    }).byteLength,
  })
}

const totalGzip = metrics.reduce((sum, metric) => sum + metric.gzip, 0)
const totalBrotli = metrics.reduce((sum, metric) => sum + metric.brotli, 0)
const html = metrics.filter((metric) => extname(metric.relative).toLowerCase() === '.html')
const javascript = metrics.filter((metric) => ['.js', '.mjs'].includes(extname(metric.relative).toLowerCase()))
const css = metrics.filter((metric) => extname(metric.relative).toLowerCase() === '.css')
const wasm = metrics.filter((metric) => extname(metric.relative).toLowerCase() === '.wasm')
const workers = javascript.filter((metric) => /(?:^|[-_.])worker(?:[-_.]|$)/i.test(basename(metric.relative)))

const failures = []
checkAggregate('maxTotalGzipBytes', totalGzip, 'total gzip')
checkAggregate('maxTotalBrotliBytes', totalBrotli, 'total Brotli')
checkFiles('maxHtmlGzipBytes', html, 'HTML')
checkFiles('maxJavaScriptGzipBytes', javascript, 'JavaScript')
checkFiles('maxCssGzipBytes', css, 'CSS')
checkFiles('maxWasmGzipBytes', wasm, 'Wasm')
checkFiles('maxWorkerGzipBytes', workers, 'Worker JavaScript')

const routeInitial = await routeInitialMetrics(html, metrics)
for (const route of routeInitial) {
  if (route.gzip > limit('maxRouteInitialGzipBytes')) {
    failures.push(
      `${route.route} initial transfer ${formatBytes(route.gzip)} `
      + `> ${formatBytes(limit('maxRouteInitialGzipBytes'))}`,
    )
  }
}

const report = {
  dist: relative(projectRoot, distRoot) || '.',
  files: metrics.length,
  total: {
    rawBytes: metrics.reduce((sum, metric) => sum + metric.raw, 0),
    gzipBytes: totalGzip,
    brotliBytes: totalBrotli,
  },
  largest: [...metrics]
    .sort((left, right) => right.gzip - left.gzip)
    .slice(0, 10)
    .map(({ relative: file, raw, gzip, brotli }) => ({ file, raw, gzip, brotli })),
  routeInitial: routeInitial.sort((left, right) => right.gzip - left.gzip),
  failures,
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`Performance budget · ${report.dist} · ${report.files} files`)
  console.log(`  total raw:    ${formatBytes(report.total.rawBytes)}`)
  console.log(`  total gzip:   ${formatBytes(totalGzip)} / ${formatBytes(limit('maxTotalGzipBytes'))}`)
  console.log(`  total Brotli: ${formatBytes(totalBrotli)} / ${formatBytes(limit('maxTotalBrotliBytes'))}`)
  console.log('  largest gzip files:')
  for (const metric of report.largest.slice(0, 5)) {
    console.log(`    ${formatBytes(metric.gzip).padStart(9)} ${metric.file}`)
  }
  if (failures.length > 0) {
    console.error('\nPerformance budget failures:')
    for (const failure of failures) console.error(`  - ${failure}`)
  }
}

if (failures.length > 0) process.exitCode = 1

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const result = []
  for (const entry of entries) {
    const file = resolve(directory, entry.name)
    if (entry.isDirectory()) result.push(...await collectFiles(file))
    else if (entry.isFile()) result.push(file)
  }
  return result
}

function limit(name) {
  const value = Number(budgets[name])
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Performance budget ${name} must be a positive number`)
  }
  return value
}

function checkAggregate(name, value, label) {
  if (value > limit(name)) {
    failures.push(`${label} ${formatBytes(value)} > ${formatBytes(limit(name))}`)
  }
}

function checkFiles(name, candidates, label) {
  const maximum = limit(name)
  for (const candidate of candidates) {
    if (candidate.gzip > maximum) {
      failures.push(
        `${label} ${candidate.relative} ${formatBytes(candidate.gzip)} > ${formatBytes(maximum)}`,
      )
    }
  }
}

async function routeInitialMetrics(htmlFiles, allMetrics) {
  const byPath = new Map(allMetrics.map((metric) => [metric.relative, metric]))
  const result = []
  for (const htmlFile of htmlFiles) {
    const source = await readFile(htmlFile.file, 'utf8')
    // Include the app entry, modulepreload chunks, and the stylesheet that a
    // browser requests before hydration.  Restricting the set to files that
    // exist in dist avoids counting external links or alternate-language URLs.
    const references = [...source.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    const dependencies = new Set()
    for (const [, sourcePath] of references) {
      const normalized = sourcePath.split(/[?#]/, 1)[0].replace(/^\//, '')
      // VitePress emits an absolute URL that includes SITE_BASE (for example
      // /mathrl_visual/assets/app.js), while the dist-relative key starts at
      // assets/.  Try the exact path first, then strip the base prefix.
      const metric = byPath.get(normalized)
        ?? (normalized.includes('assets/')
          ? byPath.get(normalized.slice(normalized.indexOf('assets/')))
          : undefined)
      if (metric) dependencies.add(metric.relative)
    }
    const gzip = htmlFile.gzip + [...dependencies]
      .map((path) => byPath.get(path)?.gzip ?? 0)
      .reduce((sum, value) => sum + value, 0)
    result.push({ route: htmlFile.relative, gzip, dependencies: [...dependencies] })
  }
  return result
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`
  return `${(value / 1024 / 1024).toFixed(2)} MiB`
}
