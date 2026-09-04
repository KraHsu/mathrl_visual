/**
 * Immutable provenance for the upstream topic references used by the
 * companion.  This is deliberately separate from the page text: a page may
 * be rewritten while its exact upstream PDF and commit remain fixed.
 */

import { CHAPTERS_07_10 } from './chapter-manifest.mjs'
import {
  APPENDIX_SOURCE_COMMIT,
  APPENDIX_SOURCE_PDF_BLOB,
  APPENDIX_SOURCE_PDF_SHA256,
} from './appendix-manifest.mjs'

export const UPSTREAM_SOURCE_COMMIT = '0e348961c28496096d308f1066009266b3674c5a'

const earlyChapters = [
  {
    key: 'ch01',
    prefixes: ['learn/ch01/', 'labs/ch01-gridworld', 'concepts/markov-property'],
    sourcePdfBlob: 'e437a038a72f11ee453cb3099866bfb0d9c140af',
    sourcePdfSha256: '38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f',
  },
  {
    key: 'ch02',
    prefixes: ['learn/ch02/', 'labs/bellman-grid', 'labs/ch02-policy-evaluation'],
    sourcePdfBlob: '36ac85b83cef0cbbf041e7142ab816a9c5acd4de',
    sourcePdfSha256: 'a28f082f29e8a9c112361c5481466172a3ddb34cf64ac4c60c5597e085288ffa',
  },
  {
    key: 'ch03',
    prefixes: ['learn/ch03/', 'labs/bellman-optimality-grid'],
    sourcePdfBlob: '9806707397947da8e8d46be903d9ddb02c000211',
    sourcePdfSha256: '669cd4a4ba12b80b22bc702b8b71373fbcc2fa1b7c2ca848e06ed2949bb99c3c',
  },
  {
    key: 'ch04',
    prefixes: ['learn/ch04/', 'labs/ch04-planning-grid'],
    sourcePdfBlob: 'd16a55302a9aff5fad518fb18a518d202376ac97',
    sourcePdfSha256: '6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402',
  },
  {
    key: 'ch05',
    prefixes: ['learn/ch05/', 'labs/ch05-monte-carlo'],
    sourcePdfBlob: 'acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8',
    sourcePdfSha256: '77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245',
  },
  {
    key: 'ch06',
    prefixes: ['learn/ch06/', 'labs/ch06-stochastic-approximation'],
    sourcePdfBlob: 'e0eee4e0d102dc961e4ea5c6da2279934e5a78fa',
    sourcePdfSha256: '307fc279b878c21db2125816c4a2ed79527ff5045d3d83072e8ad4ca1713e916',
  },
]

const laterChapters = CHAPTERS_07_10.map((chapter) => ({
  key: chapter.key,
  prefixes: [
    `learn/ch${String(chapter.number).padStart(2, '0')}/`,
    chapter.labRoute,
  ],
  sourcePdfBlob: chapter.sourcePdfBlob,
  sourcePdfSha256: chapter.sourcePdfSha256,
}))

export const TOPIC_SOURCES = Object.freeze([
  ...earlyChapters,
  ...laterChapters,
  {
    key: 'appendix',
    prefixes: ['learn/appendix/'],
    sourcePdfBlob: APPENDIX_SOURCE_PDF_BLOB,
    sourcePdfSha256: APPENDIX_SOURCE_PDF_SHA256,
    sourceCommit: APPENDIX_SOURCE_COMMIT,
  },
].map((entry) => Object.freeze({
  ...entry,
  prefixes: Object.freeze([...entry.prefixes]),
})))

/**
 * Return the canonical source record for a locale-relative Markdown path.
 * Paths may include a leading slash and `.md`; both are normalized.
 */
export function topicSourceForPath(path) {
  const normalized = String(path ?? '')
    .replace(/^\/+/, '')
    .replace(/\.md$/, '')
  return TOPIC_SOURCES.find((entry) => entry.prefixes.some((prefix) => normalized.startsWith(prefix)))
}
