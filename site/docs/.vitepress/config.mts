import { defineConfig } from 'vitepress'

const base = normalizeBase(process.env.SITE_BASE ?? '/')
const siteOrigin = (process.env.SITE_ORIGIN ?? '').replace(/\/$/, '')
const isPreview = process.env.VITE_SITE_STAGE === 'preview'

function normalizeBase(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function withBase(path: string): string {
  return `${base}${path.replace(/^\//, '')}`
}

function publicUrl(path: string): string {
  const basedPath = withBase(path)
  return siteOrigin ? `${siteOrigin}${basedPath}` : basedPath
}

function routeFor(locale: 'zh-Hans' | 'en', relativePath: string): string {
  const withoutLocale = relativePath.replace(/^(zh-Hans|en)\//, '')
  const route = withoutLocale.replace(/index\.md$/, '').replace(/\.md$/, '')
  return withBase(`${locale}/${route}`)
}

const chapterSources = {
  ch01:
    'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%201%20Basic%20Concepts.pdf',
  ch02:
    'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%202%20State%20Values%20and%20Bellman%20Equation.pdf',
} as const

export default defineConfig({
  base,
  cleanUrls: true,
  lastUpdated: true,
  title: 'MathRL Visual',
  description: 'A bilingual, interactive companion for the mathematical foundations of reinforcement learning.',
  head: [
    ['meta', { name: 'theme-color', content: '#0d766e' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: withBase('favicon.svg') }],
    ...(isPreview
      ? ([['meta', { name: 'robots', content: 'noindex,nofollow' }]] as const)
      : []),
  ],
  locales: {
    'zh-Hans': {
      label: '简体中文',
      lang: 'zh-Hans',
      link: '/zh-Hans/',
      title: '强化学习数学基础 · 可视化伴读',
      description: '用交互实验学习强化学习的数学基础。',
      themeConfig: {
        nav: [
          { text: '第一章', link: '/zh-Hans/learn/ch01/' },
          { text: '第二章', link: '/zh-Hans/learn/ch02/' },
          { text: '实验', link: '/zh-Hans/labs/bellman-grid' },
        ],
        sidebar: {
          '/zh-Hans/learn/ch01/': [
            {
              text: '第一章 · 基本概念',
              items: [
                { text: '章节导览', link: '/zh-Hans/learn/ch01/' },
                { text: '状态与动作', link: '/zh-Hans/learn/ch01/state-action' },
                { text: '状态转移', link: '/zh-Hans/learn/ch01/transitions' },
                { text: '策略', link: '/zh-Hans/learn/ch01/policies' },
                { text: '奖励', link: '/zh-Hans/learn/ch01/rewards' },
                { text: '轨迹与回报', link: '/zh-Hans/learn/ch01/returns' },
                { text: '回合与终止', link: '/zh-Hans/learn/ch01/episodes' },
                { text: 'MDP 与马尔可夫性质', link: '/zh-Hans/learn/ch01/mdp' },
                { text: '章节检查点', link: '/zh-Hans/learn/ch01/checkpoint' },
              ],
            },
            {
              text: '动手实验',
              items: [{ text: 'Grid World 概念实验', link: '/zh-Hans/labs/ch01-gridworld' }],
            },
          ],
          '/zh-Hans/learn/ch02/': [
            {
              text: '第二章 · 状态价值与 Bellman 方程',
              items: [
                { text: '章节导览', link: '/zh-Hans/learn/ch02/' },
                { text: '状态价值', link: '/zh-Hans/learn/ch02/state-values' },
                { text: 'Bellman 方程', link: '/zh-Hans/learn/ch02/bellman-equation' },
                { text: '矩阵形式', link: '/zh-Hans/learn/ch02/matrix-form' },
                { text: '迭代策略评估', link: '/zh-Hans/learn/ch02/policy-evaluation' },
                { text: '动作价值', link: '/zh-Hans/learn/ch02/action-values' },
                { text: '章节检查点', link: '/zh-Hans/learn/ch02/checkpoint' },
              ],
            },
            {
              text: '动手实验',
              items: [{ text: 'Bellman 策略评估实验', link: '/zh-Hans/labs/bellman-grid' }],
            },
          ],
          '/zh-Hans/labs/': [
            {
              text: '第一章实验',
              items: [{ text: 'Grid World 概念实验', link: '/zh-Hans/labs/ch01-gridworld' }],
            },
            {
              text: '第二章实验',
              items: [{ text: 'Bellman 策略评估实验', link: '/zh-Hans/labs/bellman-grid' }],
            },
          ],
        },
        outline: { label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '最后更新' },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳到正文',
        notFound: {
          title: '页面不存在',
          quote: '这个地址没有对应的学习内容。',
          linkLabel: '返回中文首页',
          linkText: '返回首页',
        },
      },
      markdown: {
        container: {
          tipLabel: '提示',
          warningLabel: '注意',
          dangerLabel: '警告',
          infoLabel: '信息',
          detailsLabel: '详情',
        },
        codeCopyButton: {
          tooltipText: '复制代码',
          copiedText: '已复制',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      title: 'Mathematical Foundations of RL · Visual Companion',
      description: 'Learn the mathematical foundations of reinforcement learning through interactive experiments.',
      themeConfig: {
        nav: [
          { text: 'Chapter 1', link: '/en/learn/ch01/' },
          { text: 'Chapter 2', link: '/en/learn/ch02/' },
          { text: 'Lab', link: '/en/labs/bellman-grid' },
        ],
        sidebar: {
          '/en/learn/ch01/': [
            {
              text: 'Chapter 1 · Basic Concepts',
              items: [
                { text: 'Chapter map', link: '/en/learn/ch01/' },
                { text: 'States and actions', link: '/en/learn/ch01/state-action' },
                { text: 'State transitions', link: '/en/learn/ch01/transitions' },
                { text: 'Policies', link: '/en/learn/ch01/policies' },
                { text: 'Rewards', link: '/en/learn/ch01/rewards' },
                { text: 'Trajectories and returns', link: '/en/learn/ch01/returns' },
                { text: 'Episodes and termination', link: '/en/learn/ch01/episodes' },
                { text: 'MDPs and Markov states', link: '/en/learn/ch01/mdp' },
                { text: 'Chapter checkpoint', link: '/en/learn/ch01/checkpoint' },
              ],
            },
            {
              text: 'Hands-on lab',
              items: [{ text: 'Grid World concept lab', link: '/en/labs/ch01-gridworld' }],
            },
          ],
          '/en/learn/ch02/': [
            {
              text: 'Chapter 2 · State Values and Bellman Equation',
              items: [
                { text: 'Chapter map', link: '/en/learn/ch02/' },
                { text: 'State values', link: '/en/learn/ch02/state-values' },
                { text: 'The Bellman equation', link: '/en/learn/ch02/bellman-equation' },
                { text: 'Matrix form', link: '/en/learn/ch02/matrix-form' },
                { text: 'Iterative policy evaluation', link: '/en/learn/ch02/policy-evaluation' },
                { text: 'Action values', link: '/en/learn/ch02/action-values' },
                { text: 'Chapter checkpoint', link: '/en/learn/ch02/checkpoint' },
              ],
            },
            {
              text: 'Hands-on lab',
              items: [{ text: 'Bellman policy-evaluation lab', link: '/en/labs/bellman-grid' }],
            },
          ],
          '/en/labs/': [
            {
              text: 'Chapter 1 labs',
              items: [{ text: 'Grid World concept lab', link: '/en/labs/ch01-gridworld' }],
            },
            {
              text: 'Chapter 2 labs',
              items: [{ text: 'Bellman policy-evaluation lab', link: '/en/labs/bellman-grid' }],
            },
          ],
        },
        outline: { label: 'On this page' },
      },
    },
  },
  markdown: {
    math: true,
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          'zh-Hans': {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索站点' },
              modal: {
                displayDetails: '显示详细结果',
                resetButtonTitle: '清除查询',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到相关结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '回车键',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '向上箭头',
                  navigateDownKeyAriaLabel: '向下箭头',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Esc 键',
                },
              },
            },
          },
        },
      },
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/KraHsu/mathrl_visual',
      },
    ],
    footer: {
      message: 'Unofficial original companion · 非官方原创伴读',
      copyright: 'Book topics referenced at a fixed upstream commit; no book text or artwork is redistributed.',
    },
  },
  transformHead({ pageData }) {
    const path = pageData.relativePath
    if (path === 'index.md') {
      return [
        ['link', { rel: 'canonical', href: publicUrl('') }],
        ['link', { rel: 'alternate', hreflang: 'zh-Hans', href: publicUrl('zh-Hans/') }],
        ['link', { rel: 'alternate', hreflang: 'en', href: publicUrl('en/') }],
        ['link', { rel: 'alternate', hreflang: 'x-default', href: publicUrl('') }],
      ]
    }

    const locale = path.startsWith('zh-Hans/') ? 'zh-Hans' : path.startsWith('en/') ? 'en' : null
    if (!locale) return []
    const source = sourceFor(path)
    return [
      ['link', { rel: 'canonical', href: absoluteRouteFor(locale, path) }],
      ['link', { rel: 'alternate', hreflang: 'zh-Hans', href: absoluteRouteFor('zh-Hans', path) }],
      ['link', { rel: 'alternate', hreflang: 'en', href: absoluteRouteFor('en', path) }],
      ...(source ? ([['meta', { name: 'mathrl:source', content: source }]] as const) : []),
    ]
  },
})

function absoluteRouteFor(locale: 'zh-Hans' | 'en', relativePath: string): string {
  const route = routeFor(locale, relativePath)
  return siteOrigin ? `${siteOrigin}${route}` : route
}

function sourceFor(relativePath: string): string | undefined {
  if (relativePath.includes('/learn/ch02/') || relativePath.includes('/labs/bellman-grid.md')) {
    return chapterSources.ch02
  }
  if (relativePath.includes('/learn/ch01/') || relativePath.includes('/labs/ch01-gridworld.md')) {
    return chapterSources.ch01
  }
  return undefined
}
