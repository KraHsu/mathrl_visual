import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const generator = resolve(repoRoot, 'scripts/generate-review-packet.mjs')

describe('generated release review packet', () => {
  it('enumerates every bilingual page without turning placeholders into approvals', async () => {
    const outputDir = await mkdtemp(resolve(tmpdir(), 'mathrl-review-'))
    try {
      execFileSync(process.execPath, [generator], {
        cwd: repoRoot,
        env: {
          ...process.env,
          REVIEW_PACKET_DIR: outputDir,
          REVIEW_PACKET_TIMESTAMP: '2026-01-01T00:00:00.000Z',
        },
        encoding: 'utf8',
      })
      const packet = JSON.parse(await readFile(resolve(outputDir, 'review-packet.json'), 'utf8'))
      const markdown = await readFile(resolve(outputDir, 'review-packet.md'), 'utf8')
      const csv = await readFile(resolve(outputDir, 'review-packet.csv'), 'utf8')

      expect(packet.schemaVersion).toBe(1)
      expect(packet.locales).toEqual(['zh-Hans', 'en'])
      expect(packet.summary.files).toBe(222)
      expect(packet.summary.pairs).toBe(111)
      expect(packet.pages).toHaveLength(222)
      expect(packet.pairs).toHaveLength(111)
      expect(packet.summary.openTasks).toBeGreaterThan(0)
      expect(packet.pages.every((page: { review: { content: string }, tasks: string[] }) => page.review.content !== 'approved' || page.tasks.length === 0)).toBe(true)
      expect(markdown).toContain('not an approval record')
      expect(markdown).toContain('Review rules / 审核规则')
      expect(csv.trimEnd().split('\n')).toHaveLength(223)
    } finally {
      await rm(outputDir, { recursive: true, force: true })
    }
  })
})
