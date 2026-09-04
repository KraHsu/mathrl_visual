/**
 * Shared source-tree identity calculation.
 *
 * The VitePress config uses the synchronous form so it can render the
 * identity into server-side HTML.  The PWA generator uses the async form
 * after the final asset graph exists.  Both forms intentionally use the same
 * roots, exclusions, path normalization, and record format.
 */

import { createHash } from 'node:crypto'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

const SOURCE_ROOTS = [
  'site/docs',
  'crates/mathrl-core/src',
  'crates/mathrl-wasm/src',
  'crates/mathrl-core/Cargo.toml',
  'crates/mathrl-wasm/Cargo.toml',
  'scripts',
  'RIGHTS.md',
  'LICENSE-CODE',
  'LICENSE-CONTENT',
  'NOTICE',
  'Cargo.toml',
  'Cargo.lock',
  'rust-toolchain.toml',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'site/package.json',
]

const GENERATED_PREFIXES = [
  'site/docs/.vitepress/dist/',
  'site/docs/.vitepress/cache/',
  'site/docs/.vitepress/generated/',
  'site/docs/.vitepress/.temp/',
  'site/docs/.vitepress/temp/',
]

// Vite materializes a timestamped ESM copy of config.mts next to the source
// config while loading it.  The copy is build machinery, not authored input;
// including its timestamp would make an otherwise identical build get a new
// content identity on every invocation.
const GENERATED_FILE_PATTERNS = [
  /^site\/docs\/\.vitepress\/config\..+\.timestamp-[^/]+\.mjs$/,
]

function asPosix(path) {
  return path.split(sep).join('/')
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

function relativeProjectPath(projectRoot, path) {
  return asPosix(relative(projectRoot, path))
}

function included(projectRoot, path) {
  const relativePath = relativeProjectPath(projectRoot, path)
  return !GENERATED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
    && !GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(relativePath))
}

function record(projectRoot, path, content) {
  const relativePath = relativeProjectPath(projectRoot, path)
  return `${relativePath}\0${digest(content)}\0${content.byteLength}`
}

function collectSync(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) collectSync(path, output)
    else if (entry.isFile()) output.push(path)
  }
  return output
}

export function sourceTreeIdentitySync(projectRoot) {
  const files = []
  for (const relativeRoot of SOURCE_ROOTS) {
    const path = resolve(projectRoot, relativeRoot)
    try {
      const info = lstatSync(path)
      if (info.isDirectory()) files.push(...collectSync(path))
      else if (info.isFile()) files.push(path)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  const records = files
    .filter((path) => included(projectRoot, path))
    .sort()
    .map((path) => record(projectRoot, path, readFileSync(path)))
  return { hash: digest(records.join('\n')), files: records.length }
}

async function collect(directory, output = []) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) await collect(path, output)
    else if (entry.isFile()) output.push(path)
  }
  return output
}

export async function sourceTreeIdentity(projectRoot) {
  const files = []
  for (const relativeRoot of SOURCE_ROOTS) {
    const path = resolve(projectRoot, relativeRoot)
    try {
      const info = await lstat(path)
      if (info.isDirectory()) files.push(...(await collect(path)))
      else if (info.isFile()) files.push(path)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  const records = []
  for (const path of files.filter((candidate) => included(projectRoot, candidate)).sort()) {
    records.push(record(projectRoot, path, await readFile(path)))
  }
  return { hash: digest(records.join('\n')), files: records.length }
}

export { GENERATED_FILE_PATTERNS, GENERATED_PREFIXES, SOURCE_ROOTS }
