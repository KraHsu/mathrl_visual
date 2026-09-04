#!/usr/bin/env node

/**
 * Check that the upstream branch still points at the immutable commit used by
 * the companion's source manifest.
 *
 * This is intentionally a read-only check.  A changed upstream HEAD does not
 * rewrite local content or open an issue automatically; it produces a report
 * and a non-zero exit so a maintainer can review the source diff, rights, and
 * translations before changing the pinned commit.
 */

import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TOPIC_SOURCES, UPSTREAM_SOURCE_COMMIT } from './source-manifest.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repository = process.env.UPSTREAM_REPOSITORY
  ?? 'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning.git'
const ref = process.env.UPSTREAM_REF ?? 'refs/heads/main'
const reportPath = process.env.UPSTREAM_SYNC_REPORT
  ? resolve(projectRoot, process.env.UPSTREAM_SYNC_REPORT)
  : undefined

function fail(message) {
  console.error(`Upstream sync check FAILED: ${message}`)
  process.exitCode = 1
}

function validRepository(value) {
  return /^(?:https:\/\/|ssh:\/\/|git@)[^\s]+$/.test(value)
}

function validRef(value) {
  return /^(?:refs\/heads\/)?[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes('..')
    && !value.endsWith('/')
}

function queryRemoteHead() {
  try {
    const output = execFileSync(
      'git',
      ['ls-remote', '--heads', '--refs', repository, ref],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      },
    )
    const rows = output
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length >= 2 && /^[0-9a-f]{40}$/i.test(parts[0]))
    const requestedRef = ref.startsWith('refs/') ? ref : `refs/heads/${ref}`
    const match = rows.find((parts) => parts[1] === requestedRef) ?? rows[0]
    return {
      commit: match?.[0]?.toLowerCase() ?? null,
      error: match ? null : 'remote ref was not found',
    }
  } catch (error) {
    return {
      commit: null,
      error: error?.stderr?.toString().trim()
        || error?.message
        || 'git ls-remote failed',
    }
  }
}

if (!validRepository(repository)) fail(`UPSTREAM_REPOSITORY is not a supported Git URL: ${repository}`)
if (!validRef(ref)) fail(`UPSTREAM_REF is not a safe branch reference: ${ref}`)
if (!/^[0-9a-f]{40}$/i.test(UPSTREAM_SOURCE_COMMIT)) {
  fail(`source manifest has an invalid pinned commit: ${UPSTREAM_SOURCE_COMMIT}`)
}

const checkedAt = new Date().toISOString()
const remote = process.exitCode
  ? { commit: null, error: 'input validation failed' }
  : queryRemoteHead()
const status = remote.commit === UPSTREAM_SOURCE_COMMIT
  ? 'current'
  : remote.commit
    ? 'drift'
    : 'unknown'
const report = {
  schemaVersion: 1,
  checkedAt,
  repository,
  ref,
  pinnedCommit: UPSTREAM_SOURCE_COMMIT,
  remoteCommit: remote.commit,
  status,
  sourceEntryCount: TOPIC_SOURCES.length,
  error: remote.error,
}

if (reportPath) {
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

if (status === 'current') {
  console.log(`Upstream sync OK: ${repository} ${ref} = ${UPSTREAM_SOURCE_COMMIT}`)
} else if (status === 'drift') {
  fail(`remote ${ref} is ${remote.commit}, but the companion is pinned to ${UPSTREAM_SOURCE_COMMIT}; review before updating the manifest`)
} else {
  fail(`could not verify ${repository} ${ref}: ${remote.error ?? 'unknown error'}`)
}
