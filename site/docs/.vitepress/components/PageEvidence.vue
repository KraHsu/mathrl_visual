<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useData, withBase } from 'vitepress'

type Locale = 'zh-Hans' | 'en'

interface EvidenceLocale {
  locale: Locale
  content?: string
  language?: string
  math?: string
  accessibility?: string
}

interface PageEvidenceData {
  counterpartPath: string
  current: EvidenceLocale
  counterpart: EvidenceLocale
}

interface BuildIdentity {
  appVersion?: string
  contentSetVersion?: string
  channel?: string
  gitCommit?: string
  upstreamCommit?: string
}

const ERRATA_URL =
  'https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/5%20-%20Errata%20for%20the%20Springer%20version.pdf'

const props = defineProps<{ homeOnly?: boolean }>()
const { frontmatter, lang } = useData()
const locale = computed<Locale>(() => (lang.value.toLowerCase().startsWith('zh') ? 'zh-Hans' : 'en'))
const chinese = computed(() => locale.value === 'zh-Hans')
const metadata = computed<Record<string, unknown>>(() => (frontmatter.value ?? {}) as Record<string, unknown>)
const visible = computed(() => !props.homeOnly || metadata.value.layout === 'home')
const evidence = computed<PageEvidenceData | undefined>(() => {
  const value = metadata.value.mathrlEvidence
  return value && typeof value === 'object' ? value as PageEvidenceData : undefined
})

const appVersion = ref(String(metadata.value.mathrlAppVersion ?? '0.1.0'))
const contentSetVersion = ref(String(metadata.value.mathrlContentSetVersion ?? 'companion-2026-09-03'))
const stage = ref(String(metadata.value.mathrlStage ?? 'preview'))
const gitCommit = ref(String(metadata.value.mathrlGitCommit ?? 'working-tree-dirty'))
const upstreamCommit = ref(String(metadata.value.mathrlUpstreamCommit ?? '0e348961c28496096d308f1066009266b3674c5a'))

const current = computed(() => evidence.value?.current)
const counterpart = computed(() => evidence.value?.counterpart)
const counterpartHref = computed(() => {
  const path = evidence.value?.counterpartPath
  return path ? withBase(path) : ''
})

const sourceBlob = computed(() => String(metadata.value.source_pdf_blob ?? ''))
const sourceSha = computed(() => String(metadata.value.source_pdf_sha256 ?? ''))
const sourceSections = computed(() => String(metadata.value.source_sections ?? ''))
const sourceKind = computed(() => String(metadata.value.source_kind ?? ''))
const rights = computed(() => String(metadata.value.rights ?? ''))
const hasSource = computed(() => Boolean(sourceBlob.value || sourceSha.value || sourceSections.value))
const sourceCommit = computed(() => String(metadata.value.source_commit ?? (hasSource.value ? upstreamCommit.value : '')))
const sourceUrl = computed(() => String(metadata.value.mathrlSourceUrl ?? ''))

const labels = computed(() => chinese.value
  ? {
      aria: '页面版本、来源与双语审核状态',
      locale: '当前语言',
      counterpart: '另一语言',
      version: '版本',
      contentSet: '内容集',
      stage: '渠道',
      review: '审核状态',
      content: '内容',
      language: '语言',
      math: '数学',
      accessibility: '无障碍',
      details: '来源与勘误',
      sourceKind: '来源类型',
      commit: '构建提交',
      sourceCommit: '主题参考提交',
      source: '主题参考 PDF',
      blob: 'PDF Git blob',
      sha: 'PDF SHA-256',
      sections: '章节范围',
      rights: '权利状态',
      errata: '上游勘误 PDF',
      open: '打开',
    }
  : {
      aria: 'Page version, provenance, and bilingual review status',
      locale: 'Current locale',
      counterpart: 'Paired locale',
      version: 'Version',
      contentSet: 'Content set',
      stage: 'Channel',
      review: 'Review status',
      content: 'Content',
      language: 'Language',
      math: 'Math',
      accessibility: 'Accessibility',
      details: 'Provenance and errata',
      sourceKind: 'Source kind',
      commit: 'Build commit',
      sourceCommit: 'Topic reference commit',
      source: 'Topic reference PDF',
      blob: 'PDF Git blob',
      sha: 'PDF SHA-256',
      sections: 'Sections',
      rights: 'Rights',
      errata: 'Upstream errata PDF',
      open: 'Open',
    })

const statusFields = computed(() => [
  ['content', labels.value.content],
  ['language', labels.value.language],
  ['math', labels.value.math],
  ['accessibility', labels.value.accessibility],
] as const)

function stateOf(entry: EvidenceLocale | undefined, field: (typeof statusFields.value)[number][0]): string {
  return String(entry?.[field] ?? 'missing')
}

function localeLabel(value: Locale): string {
  return value === 'zh-Hans' ? '简体中文' : 'English'
}

function shortCommit(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value
}

onMounted(async () => {
  try {
    const response = await fetch(withBase('/version.json'), { cache: 'no-store' })
    if (!response.ok) return
    const value = await response.json() as BuildIdentity
    if (value.appVersion) appVersion.value = value.appVersion
    if (value.contentSetVersion) contentSetVersion.value = value.contentSetVersion
    if (value.channel) stage.value = value.channel
    if (value.gitCommit) gitCommit.value = value.gitCommit
    if (value.upstreamCommit) upstreamCommit.value = value.upstreamCommit
  } catch {
    // The static SSR values remain useful when version.json is unavailable.
  }
})
</script>

<template>
  <aside
    v-if="evidence && visible"
    class="page-evidence"
    data-testid="page-evidence"
    :aria-label="labels.aria"
  >
    <div class="page-evidence__summary">
      <span class="page-evidence__locale"><span class="page-evidence__label">{{ labels.locale }}</span> {{ localeLabel(locale) }}</span>
      <span><span class="page-evidence__label">{{ labels.version }}</span> <code>{{ appVersion }}</code></span>
      <span><span class="page-evidence__label">{{ labels.contentSet }}</span> <code>{{ contentSetVersion }}</code></span>
      <span><span class="page-evidence__label">{{ labels.stage }}</span> <code>{{ stage }}</code></span>
      <a
        class="page-evidence__pair"
        :href="counterpartHref"
        :aria-label="chinese ? '打开配对语言页面' : 'Open paired locale page'"
      >
        {{ labels.counterpart }}: {{ localeLabel(counterpart?.locale ?? (locale === 'en' ? 'zh-Hans' : 'en')) }}
      </a>
    </div>

    <div class="page-evidence__reviews" role="group" :aria-label="labels.review">
      <div v-for="entry in [current, counterpart]" :key="entry?.locale" class="page-evidence__review">
        <strong>{{ localeLabel(entry?.locale ?? locale) }}</strong>
        <span v-for="[field, label] in statusFields" :key="field" class="page-evidence__status" :data-review-field="field">
          <span>{{ label }}</span>
          <code :data-review-status="stateOf(entry, field)">{{ stateOf(entry, field) }}</code>
        </span>
      </div>
    </div>

    <details class="page-evidence__details">
      <summary>{{ labels.details }}</summary>
      <dl>
        <template v-if="sourceKind">
          <dt>{{ labels.sourceKind }}</dt><dd><code>{{ sourceKind }}</code></dd>
        </template>
        <dt>{{ labels.commit }}</dt><dd><code>{{ shortCommit(gitCommit) }}</code></dd>
        <template v-if="sourceCommit">
          <dt>{{ labels.sourceCommit }}</dt><dd><code>{{ shortCommit(sourceCommit) }}</code></dd>
        </template>
        <template v-if="sourceUrl">
          <dt>{{ labels.source }}</dt><dd><a :href="sourceUrl" target="_blank" rel="noopener">{{ labels.open }}</a></dd>
        </template>
        <template v-if="sourceBlob">
          <dt>{{ labels.blob }}</dt><dd><code>{{ sourceBlob }}</code></dd>
        </template>
        <template v-if="sourceSha">
          <dt>{{ labels.sha }}</dt><dd><code>{{ sourceSha }}</code></dd>
        </template>
        <template v-if="sourceSections">
          <dt>{{ labels.sections }}</dt><dd><code>{{ sourceSections }}</code></dd>
        </template>
        <template v-if="rights">
          <dt>{{ labels.rights }}</dt><dd><code>{{ rights }}</code></dd>
        </template>
        <dt>{{ labels.errata }}</dt><dd><a :href="ERRATA_URL" target="_blank" rel="noopener">{{ labels.open }}</a></dd>
      </dl>
      <p v-if="!hasSource" class="page-evidence__note">
        {{ chinese ? '本页是原创导航/政策页，不伪造上游 PDF provenance。' : 'This is an original navigation or policy page; no upstream PDF provenance is fabricated.' }}
      </p>
    </details>
  </aside>
</template>
