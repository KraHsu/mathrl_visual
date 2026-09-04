#!/usr/bin/env node

/** Validate the release SBOM and normalized license inventory. */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(projectRoot, process.env.SBOM_DIST ?? 'site/docs/.vitepress/dist')

function fail(message) {
  throw new Error(`SBOM check failed: ${message}`)
}

async function json(name) {
  try {
    return JSON.parse(await readFile(resolve(distRoot, name), 'utf8'))
  } catch (error) {
    fail(`${name} is missing or invalid JSON (${error.message})`)
  }
}

const sbom = await json('sbom.cdx.json')
const inventory = await json('licenses.json')

if (
  sbom.$schema !== 'https://cyclonedx.org/schema/bom-1.5.schema.json'
  || sbom.bomFormat !== 'CycloneDX'
  || sbom.specVersion !== '1.5'
) fail('unsupported CycloneDX schema')
if (typeof sbom.serialNumber !== 'string' || !/^urn:uuid:[0-9a-f-]{36}$/.test(sbom.serialNumber)) fail('serialNumber is not a UUID URN')
if (!Array.isArray(sbom.components) || sbom.components.length === 0) fail('component list is empty')
if (!Array.isArray(inventory.licenses) || inventory.licenses.length === 0) fail('license inventory is empty')
if (inventory.componentCount !== sbom.components.length) fail('component count differs between reports')
if (typeof inventory.lockDigest !== 'string' || !/^[0-9a-f]{64}$/.test(inventory.lockDigest)) fail('lock digest is missing')
if (inventory.schemaVersion !== 1) fail('unsupported license inventory schema')
if (typeof inventory.generatedAt !== 'string' || Number.isNaN(Date.parse(inventory.generatedAt))) fail('license inventory timestamp is invalid')
const lockProperty = sbom.metadata?.properties?.find((property) => property?.name === 'mathrl:lock-digest')?.value
if (lockProperty !== inventory.lockDigest) fail('SBOM and license inventory lock digests differ')

const refs = new Set()
for (const component of sbom.components) {
  for (const field of ['bom-ref', 'name', 'version', 'purl']) {
    if (typeof component[field] !== 'string' || component[field].length === 0) fail(`component missing ${field}`)
  }
  if (refs.has(component['bom-ref'])) fail(`duplicate bom-ref ${component['bom-ref']}`)
  refs.add(component['bom-ref'])
  if (!Array.isArray(component.licenses) || component.licenses.length === 0) fail(`${component.name}@${component.version} has no license record`)
  for (const choice of component.licenses) {
    const expression = typeof choice?.expression === 'string' ? choice.expression.trim() : ''
    const license = choice?.license
    const licenseId = typeof license?.id === 'string' ? license.id.trim() : ''
    const licenseName = typeof license?.name === 'string' ? license.name.trim() : ''
    const licenseUrl = typeof license?.url === 'string' ? license.url.trim() : ''
    if (!expression && !licenseId && !licenseName && !licenseUrl) {
      fail(`${component.name}@${component.version} has an empty license choice`)
    }
  }
  if (JSON.stringify(component).includes('/home/') || JSON.stringify(component).includes('node_modules/.pnpm')) fail(`${component.name} leaks a local path`)
}

for (const entry of inventory.licenses) {
  if (!entry || typeof entry.license !== 'string' || entry.license.length === 0) {
    fail('license inventory contains an invalid license group')
  }
  if (!Array.isArray(entry.components) || entry.components.length === 0) {
    fail(`license group ${entry.license} has no component references`)
  }
}
const inventoryRefs = new Set()
for (const entry of inventory.licenses) {
  for (const ref of entry.components) {
    if (typeof ref !== 'string' || ref.length === 0) fail('license inventory contains an empty component reference')
    if (inventoryRefs.has(ref)) fail(`license inventory references ${ref} more than once`)
    inventoryRefs.add(ref)
  }
}
for (const ref of refs) if (!inventoryRefs.has(ref)) fail(`license inventory does not mention ${ref}`)
for (const ref of inventoryRefs) if (!refs.has(ref)) fail(`license inventory mentions unknown component ${ref}`)

console.log(`SBOM OK: ${sbom.components.length} components, ${inventory.licenses.length} license groups`)
