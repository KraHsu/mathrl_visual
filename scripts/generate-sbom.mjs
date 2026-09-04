#!/usr/bin/env node

/**
 * Generate a deterministic CycloneDX SBOM and a human-readable license
 * inventory for the static release artifact.
 *
 * The project intentionally does not depend on a global SBOM CLI.  Cargo's
 * locked metadata and pnpm's installed license report are the authoritative
 * dependency graphs already used by the build, so this small adapter keeps
 * the release evidence reproducible and reviewable in an offline checkout.
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(projectRoot, process.env.SBOM_DIST ?? 'site/docs/.vitepress/dist')
const SBOM_SCHEMA = 'https://cyclonedx.org/schema/bom-1.5.schema.json'

function run(command, args) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  })
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function deterministicTimestamp() {
  if (process.env.BUILD_TIMESTAMP) return new Date(process.env.BUILD_TIMESTAMP).toISOString()
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  }
  try {
    return new Date(run('git', ['show', '-s', '--format=%cI', 'HEAD']).trim()).toISOString()
  } catch {
    return '1970-01-01T00:00:00.000Z'
  }
}

function deterministicSerial(seed) {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), 'hex')
  // Set UUID version 4 and RFC 4122 variant bits while retaining deterministic
  // bytes. CycloneDX accepts a UUID URN and archived builds get the same ID.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function normalizeLicense(value) {
  const license = String(value ?? '').trim()
  return license || 'NOASSERTION'
}

function npmPurl(name, version) {
  const normalized = name.startsWith('@')
    ? `%40${name.slice(1)}`
    : name
  return `pkg:npm/${normalized}@${encodeURIComponent(version)}`
}

function cargoPurl(name, version) {
  return `pkg:cargo/${encodeURIComponent(name)}@${encodeURIComponent(version)}`
}

function componentLicense(license) {
  if (license === 'NOASSERTION') return { license: { name: 'NOASSERTION' } }
  // Keep SPDX expressions as expressions, but do not emit arbitrary package
  // metadata (for example `MIT (http://...)` or `Apache-2.0/MIT`) as if it
  // were a valid expression. CycloneDX permits a descriptive license name
  // for those unrecognized strings and the inventory still preserves it.
  const expressionToken = /^(?:[A-Za-z0-9][A-Za-z0-9.+-]*|\(|\)|AND|OR|WITH)$/
  const tokens = license.replace(/[()]/g, ' $& ').trim().split(/\s+/)
  if (tokens.length > 0 && tokens.every((token) => expressionToken.test(token))) {
    return { expression: license }
  }
  return { license: { name: license } }
}

function makeComponent({ ecosystem, name, version, license, source, repository, description }) {
  const normalizedLicense = normalizeLicense(license)
  const normalizedName = String(name ?? 'unknown')
  const normalizedVersion = String(version ?? '0.0.0')
  const component = {
    type: 'library',
    'bom-ref': `${ecosystem}:${normalizedName}@${normalizedVersion}`,
    name: normalizedName,
    version: normalizedVersion,
    purl: ecosystem === 'npm'
      ? npmPurl(normalizedName, normalizedVersion)
      : cargoPurl(normalizedName, normalizedVersion),
    licenses: [componentLicense(normalizedLicense)],
  }
  if (description) component.description = description.trim()
  if (repository) {
    component.externalReferences = [{ type: 'vcs', url: repository }]
  }
  if (source) component.scope = 'required'
  else component.scope = 'optional'
  return {
    component,
    ecosystem,
    name: normalizedName,
    version: normalizedVersion,
    license: normalizedLicense,
    source: source ?? null,
  }
}

function parsePnpmLicenses() {
  const report = JSON.parse(run('corepack', ['pnpm', 'licenses', 'list', '--json']))
  const records = []
  for (const [groupLicense, packages] of Object.entries(report)) {
    for (const entry of packages ?? []) {
      for (const version of entry.versions ?? []) {
        records.push(makeComponent({
          ecosystem: 'npm',
          name: entry.name,
          version,
          license: entry.license ?? groupLicense,
          source: true,
          repository: entry.homepage,
          description: entry.description,
        }))
      }
    }
  }
  return records
}

function parseCargoMetadata() {
  const metadata = JSON.parse(run('cargo', ['metadata', '--locked', '--format-version', '1']))
  return (metadata.packages ?? []).map((entry) => makeComponent({
    ecosystem: 'cargo',
    name: entry.name,
    version: entry.version,
    license: entry.license,
    source: entry.source,
    repository: entry.repository,
    description: entry.description,
  }))
}

async function packageRoots() {
  const roots = []
  for (const path of ['package.json', 'site/package.json']) {
    const value = JSON.parse(await readFile(resolve(projectRoot, path), 'utf8'))
    roots.push(makeComponent({
      ecosystem: 'npm',
      name: value.name,
      // The private workspace manifest intentionally has no publish version;
      // CycloneDX still requires every component to carry a non-empty version.
      // Keep the sentinel explicit rather than deriving a mutable timestamp.
      version: value.version ?? '0.0.0',
      license: value.license,
      source: null,
      repository: typeof value.repository === 'string' ? value.repository : value.repository?.url,
      description: value.description,
    }))
  }
  return roots
}

function dedupe(records) {
  const seen = new Set()
  return records
    .filter((record) => {
      const key = `${record.ecosystem}:${record.name}@${record.version}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => `${left.ecosystem}:${left.name}@${left.version}`.localeCompare(`${right.ecosystem}:${right.name}@${right.version}`))
}

function lockDigest() {
  const files = [
    'Cargo.lock',
    'Cargo.toml',
    'crates/mathrl-core/Cargo.toml',
    'crates/mathrl-wasm/Cargo.toml',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'rust-toolchain.toml',
    'site/package.json',
  ]
  const values = files.map((file) => `${file}\0${sha256(requireBytes(file))}`)
  return sha256(values.join('\n'))
}

// Synchronous reads keep lockDigest deterministic without introducing a
// second async phase; the caller only uses this after the files exist.
function requireBytes(file) {
  return readFileSync(resolve(projectRoot, file))
}

async function main() {
  const records = dedupe([
    ...(await packageRoots()),
    ...parsePnpmLicenses(),
    ...parseCargoMetadata(),
  ])
  const timestamp = deterministicTimestamp()
  const digest = lockDigest()
  const components = records.map((record) => record.component)
  const sbom = {
    $schema: SBOM_SCHEMA,
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: deterministicSerial(digest),
    version: 1,
    metadata: {
      timestamp,
      tools: [{ vendor: 'MathRL Visual', name: 'generate-sbom.mjs', version: '1' }],
      component: {
        type: 'application',
        'bom-ref': 'application:mathrl-visual',
        name: 'mathrl-visual',
        version: process.env.APP_VERSION ?? '0.1.0',
      },
      properties: [
        { name: 'mathrl:lock-digest', value: digest },
        { name: 'mathrl:upstream-commit', value: process.env.UPSTREAM_COMMIT ?? '0e348961c28496096d308f1066009266b3674c5a' },
      ],
    },
    components,
  }
  const licenseMap = new Map()
  for (const record of records) {
    const key = record.license
    const entry = licenseMap.get(key) ?? { license: key, components: [] }
    entry.components.push(`${record.ecosystem}:${record.name}@${record.version}`)
    licenseMap.set(key, entry)
  }
  const inventory = {
    schemaVersion: 1,
    generatedAt: timestamp,
    lockDigest: digest,
    componentCount: records.length,
    licenses: [...licenseMap.values()]
      .map((entry) => ({ ...entry, components: entry.components.sort() }))
      .sort((left, right) => left.license.localeCompare(right.license)),
  }
  await mkdir(distRoot, { recursive: true })
  await writeFile(resolve(distRoot, 'sbom.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`, 'utf8')
  await writeFile(resolve(distRoot, 'licenses.json'), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
  console.log(`SBOM generated: ${records.length} components, ${inventory.licenses.length} license groups`)
}

main().catch((error) => {
  console.error(error?.stack || error)
  process.exitCode = 1
})
