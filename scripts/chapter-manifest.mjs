/**
 * Shared route and build metadata for the chapters that are being added after
 * the initial six-chapter preview.
 *
 * Keep this file dependency-free and plain ESM: VitePress' TypeScript config
 * and the Node-based Pages artifact checker both import it.  The manifest is
 * deliberately about public routes and provenance only; chapter content,
 * algorithms, and locale strings stay in their owning files.
 */

export const CHAPTER_LOCALES = Object.freeze(['zh-Hans', 'en'])

export const CHAPTER_SOURCE_COMMIT = '0e348961c28496096d308f1066009266b3674c5a'

function sourceUrl(fileName) {
  return `https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/${CHAPTER_SOURCE_COMMIT}/${encodeURIComponent(fileName)}`
}

/**
 * Route metadata is intentionally data-only so it can be consumed from both
 * TypeScript (site config) and plain Node (CI checks).  A learning route is a
 * path relative to `/{locale}/`; the chapter index is represented by `''`.
 */
const chapters = [
  {
    number: 7,
    key: 'ch07',
    slug: 'temporal-difference',
    title: { en: 'Chapter 7 · Temporal-Difference Methods', 'zh-Hans': '第七章 · 时间差分方法' },
    labTitle: { en: 'Temporal-Difference lab', 'zh-Hans': '时间差分实验' },
    learningRoutes: [
      '',
      'td-learning',
      'sarsa',
      'n-step-sarsa',
      'q-learning',
      'unified',
      'summary',
      'q-and-a',
      'checkpoint',
    ],
    learningLabels: {
      en: [
        'Chapter map',
        'TD learning',
        'SARSA',
        'n-step SARSA',
        'Q-learning',
        'Unified view',
        'Summary',
        'Q&A',
        'Chapter checkpoint',
      ],
      'zh-Hans': [
        '章节导览',
        'TD 学习',
        'SARSA',
        'n 步 SARSA',
        'Q-learning',
        '统一视角',
        '总结',
        '问答',
        '章节检查点',
      ],
    },
    labRoute: 'labs/ch07-temporal-difference',
    source: sourceUrl('3 - Chapter 7 Temporal-Difference Methods.pdf'),
    sourcePdfBlob: 'ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab',
    sourcePdfSha256: 'ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d',
    workerAsset: 'temporal-difference.worker-',
    component: 'TemporalDifferenceLab',
    catalog: 'temporalDifference',
  },
  {
    number: 8,
    key: 'ch08',
    slug: 'value-function',
    title: { en: 'Chapter 8 · Value Function Methods', 'zh-Hans': '第八章 · 值函数方法' },
    labTitle: { en: 'Value-function lab', 'zh-Hans': '值函数实验' },
    learningRoutes: [
      '',
      'value-representation',
      'td-function',
      'approximators',
      'q-learning',
      'deep-q-learning',
      'summary',
      'q-and-a',
      'checkpoint',
    ],
    learningLabels: {
      en: [
        'Chapter map',
        'Value representation',
        'TD function approximation',
        'Approximators',
        'Q-learning',
        'Deep Q-learning',
        'Summary',
        'Q&A',
        'Chapter checkpoint',
      ],
      'zh-Hans': [
        '章节导览',
        '值表示',
        'TD 函数近似',
        '逼近器',
        'Q-learning',
        '深度 Q-learning',
        '总结',
        '问答',
        '章节检查点',
      ],
    },
    labRoute: 'labs/ch08-value-function',
    source: sourceUrl('3 - Chapter 8 Value Function Methods.pdf'),
    sourcePdfBlob: '0274c3977ff3885ba5e991931c565a65614aa627',
    sourcePdfSha256: 'f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c',
    workerAsset: 'value-function.worker-',
    component: 'ValueFunctionLab',
    catalog: 'valueFunction',
  },
  {
    number: 9,
    key: 'ch09',
    slug: 'policy-gradient',
    title: { en: 'Chapter 9 · Policy Gradient Methods', 'zh-Hans': '第九章 · 策略梯度方法' },
    labTitle: { en: 'Policy-gradient lab', 'zh-Hans': '策略梯度实验' },
    learningRoutes: [
      '',
      'policy-representation',
      'metrics',
      'policy-gradient-theorem',
      'reinforce',
      'summary',
      'q-and-a',
      'checkpoint',
    ],
    learningLabels: {
      en: [
        'Chapter map',
        'Policy representation',
        'Policy metrics',
        'Policy-gradient theorem',
        'REINFORCE',
        'Summary',
        'Q&A',
        'Chapter checkpoint',
      ],
      'zh-Hans': [
        '章节导览',
        '策略表示',
        '策略指标',
        '策略梯度定理',
        'REINFORCE',
        '总结',
        '问答',
        '章节检查点',
      ],
    },
    labRoute: 'labs/ch09-policy-gradient',
    source: sourceUrl('3 - Chapter 9 Policy Gradient Methods.pdf'),
    sourcePdfBlob: 'a3267df282564117dea38dd9e21ca336e009956d',
    sourcePdfSha256: '60e866fe227389d33464268be6231b944273b3096b04069b924c601fbf75ca1d',
    workerAsset: 'policy-gradient.worker-',
    component: 'PolicyGradientLab',
    catalog: 'policyGradient',
  },
  {
    number: 10,
    key: 'ch10',
    slug: 'actor-critic',
    title: { en: 'Chapter 10 · Actor-Critic Methods', 'zh-Hans': '第十章 · Actor-Critic 方法' },
    labTitle: { en: 'Actor-Critic lab', 'zh-Hans': 'Actor-Critic 实验' },
    learningRoutes: ['', 'qac', 'a2c', 'off-policy', 'deterministic', 'summary', 'q-and-a', 'checkpoint'],
    learningLabels: {
      en: [
        'Chapter map',
        'QAC',
        'A2C',
        'Off-policy actor-critic',
        'Deterministic actor-critic',
        'Summary',
        'Q&A',
        'Chapter checkpoint',
      ],
      'zh-Hans': [
        '章节导览',
        'QAC',
        'A2C',
        '离策略 Actor-Critic',
        '确定性 Actor-Critic',
        '总结',
        '问答',
        '章节检查点',
      ],
    },
    labRoute: 'labs/ch10-actor-critic',
    source: sourceUrl('3 - Chapter 10 Actor-Critic Methods.pdf'),
    sourcePdfBlob: 'b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2',
    sourcePdfSha256: '6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f',
    workerAsset: 'actor-critic.worker-',
    component: 'ActorCriticLab',
    catalog: 'actorCritic',
  },
]

export const CHAPTERS_07_10 = Object.freeze(
  chapters.map((chapter) =>
    Object.freeze({
      ...chapter,
      title: Object.freeze({ ...chapter.title }),
      labTitle: Object.freeze({ ...chapter.labTitle }),
      learningRoutes: Object.freeze([...chapter.learningRoutes]),
      learningLabels: Object.freeze({
        en: Object.freeze([...chapter.learningLabels.en]),
        'zh-Hans': Object.freeze([...chapter.learningLabels['zh-Hans']]),
      }),
    }),
  ),
)

export function localeRoute(locale, route) {
  const normalized = String(route ?? '').replace(/^\/+|\/+$/g, '')
  return normalized ? `${locale}/${normalized}` : `${locale}/`
}

export function htmlRoute(locale, route) {
  const raw = String(route ?? '')
  const isIndex = raw === '' || /\/$/.test(raw)
  const normalized = raw.replace(/^\/+|\/+$/g, '')
  return isIndex
    ? `${locale}/${normalized ? `${normalized}/` : ''}index.html`
    : `${locale}/${normalized}.html`
}

export function chapterRoutes(chapter) {
  return [...chapter.learningRoutes, chapter.labRoute]
}

export function chapterLearningRoutes(chapter) {
  return chapter.learningRoutes.map(
    (route) =>
      `learn/ch${String(chapter.number).padStart(2, '0')}${route ? `/${route}` : '/'}`,
  )
}

export function chapterAllRoutes(chapter) {
  return [...chapterLearningRoutes(chapter), chapter.labRoute]
}

/** Locate a Chapter 7–10 entry from a locale-relative Markdown path. */
export function chapterForPath(path) {
  const normalized = String(path ?? '').replace(/^\/+/, '').replace(/\.md$/, '')
  return CHAPTERS_07_10.find((chapter) => {
    const prefix = `learn/ch${String(chapter.number).padStart(2, '0')}/`
    // Markdown paths are locale-relative and lab files live below `labs/`;
    // accept both the manifest's public route and its source-file spelling.
    return normalized.startsWith(prefix)
      || normalized === chapter.labRoute
      || normalized === `labs/${chapter.labRoute}`
  })
}
