#!/usr/bin/env node

/**
 * Run the two lockfile-backed dependency audits used by a production build.
 *
 * The preview/inner-loop check is deliberately useful on machines that do not
 * have cargo-audit installed: it reports that part as skipped.  A production
 * workflow sets SECURITY_AUDIT_STRICT=1, in which case both auditors must be
 * available and high/critical findings fail closed.  The raw, normalized
 * report can be archived with SECURITY_AUDIT_REPORT.
 */

import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const strict = process.env.SECURITY_AUDIT_STRICT === '1' || process.argv.includes('--strict')
const reportPath = process.env.SECURITY_AUDIT_REPORT
  ? resolve(projectRoot, process.env.SECURITY_AUDIT_REPORT)
  : undefined

const severityRank = { none: 0, low: 1, moderate: 2, medium: 2, high: 3, critical: 4, unknown: 5 }

function run(command, args) {
  try {
    return {
      available: true,
      exitCode: 0,
      stdout: execFileSync(command, args, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 32 * 1024 * 1024,
      }),
      stderr: '',
    }
  } catch (error) {
    // execFileSync exposes both output streams on non-zero exits.  Keep the
    // JSON stream when an auditor intentionally exits 1 for findings.
    if (error?.code === 'ENOENT') {
      return { available: false, exitCode: null, stdout: '', stderr: 'command not found' }
    }
    return {
      available: true,
      exitCode: Number.isInteger(error?.status) ? error.status : 1,
      stdout: String(error?.stdout ?? ''),
      stderr: String(error?.stderr ?? ''),
    }
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text)
  } catch (error) {
    return { parseError: `${label} did not return JSON: ${error.message}` }
  }
}

function pnpmSummary(result) {
  if (!result.available) return { status: 'missing', findings: [], error: result.stderr }
  const value = parseJson(result.stdout, 'pnpm audit')
  if (value.parseError) return { status: 'error', findings: [], error: value.parseError, exitCode: result.exitCode }
  const counts = value.metadata?.vulnerabilities ?? {}
  const findings = Object.entries(counts)
    .filter(([severity, count]) => severityRank[severity] > 0 && Number(count) > 0)
    .map(([severity, count]) => ({ severity, count: Number(count) }))
  return {
    status: result.exitCode === 0 ? 'ok' : 'findings',
    exitCode: result.exitCode,
    findings,
    dependencies: value.metadata?.totalDependencies ?? null,
  }
}

function cargoSummary(result) {
  if (!result.available) return { status: 'missing', findings: [], error: result.stderr }
  // `cargo audit` is a cargo subcommand; when cargo itself exists but the
  // cargo-audit binary is not installed, Cargo exits with code 101 and emits
  // no JSON. Treat that situation as a missing optional tool, not malformed
  // auditor output.
  if (
    result.exitCode === 101
    && /no such command|could not find|unknown command/i.test(result.stderr)
  ) {
    return { status: 'missing', findings: [], error: result.stderr.trim() }
  }
  const value = parseJson(result.stdout, 'cargo audit')
  if (value.parseError) return { status: 'error', findings: [], error: value.parseError, exitCode: result.exitCode }
  const findings = (value.vulnerabilities?.list ?? []).map((entry) => {
    const advisory = entry.advisory ?? {}
    const severity = String(advisory.severity ?? 'unknown').toLowerCase()
    return {
      id: advisory.id ?? 'unknown',
      package: entry.package?.name ?? 'unknown',
      version: entry.package?.version ?? 'unknown',
      severity,
      title: advisory.title ?? '',
    }
  })
  return {
    status: result.exitCode === 0 && findings.length === 0 ? 'ok' : 'findings',
    exitCode: result.exitCode,
    findings,
    informational: value.informational ?? {},
  }
}

function maxSeverity(findings) {
  return findings.reduce((max, finding) => {
    const severity = String(finding.severity ?? 'unknown').toLowerCase()
    return severityRank[severity] > severityRank[max] ? severity : max
  }, 'none')
}

const pnpm = pnpmSummary(run('corepack', ['pnpm', 'audit', '--prod', '--json']))
const cargo = cargoSummary(run('cargo', ['audit', '--json']))
const report = {
  schemaVersion: 1,
  strict,
  generatedAt: new Date().toISOString(),
  packageManager: pnpm,
  rust: cargo,
}

if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

const missing = [pnpm, cargo].filter((entry) => entry.status === 'missing')
const errors = [pnpm, cargo].filter((entry) => entry.status === 'error')
const allFindings = [
  ...pnpm.findings,
  ...cargo.findings,
]
const highest = maxSeverity(allFindings)

if (missing.length > 0) {
  const message = 'dependency audit skipped: install pnpm and cargo audit tools before production release'
  if (strict) {
    console.error(`Dependency audit FAILED: ${message}`)
    process.exit(1)
  }
  console.warn(`Dependency audit WARNING: ${message}`)
}
if (errors.length > 0) {
  const message = errors.map((entry) => entry.error).join('; ')
  if (strict) {
    console.error(`Dependency audit FAILED: ${message}`)
    process.exit(1)
  }
  // Network-backed advisory databases are intentionally not a hard preview
  // gate. Keep the error in the optional report and let a protected release
  // run fail closed with strict mode.
  console.warn(`Dependency audit WARNING: ${message}`)
}
if (severityRank[highest] >= severityRank.high) {
  console.error(`Dependency audit FAILED: highest severity is ${highest}`)
  process.exit(1)
}
if (allFindings.length > 0) {
  console.warn(`Dependency audit WARNING: ${allFindings.length} finding(s), highest severity ${highest}`)
}

console.log(
  `Dependency audit ${errors.length > 0 || missing.length > 0 ? 'incomplete' : allFindings.length === 0 ? 'OK' : 'review required'}: `
    + `pnpm=${pnpm.status}, cargo=${cargo.status}, highest=${highest}`,
)
