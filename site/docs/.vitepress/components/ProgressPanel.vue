<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

import { messagesFor, type Locale } from '../i18n/messages'
import {
  downloadProgress,
  loadProgress,
  parseProgress,
  saveProgress,
  updateRecord,
  type ProgressBackend,
  type ProgressSnapshot,
} from '../progressStore'

const { frontmatter, lang } = useData()
const mounted = ref(false)
const snapshot = ref<ProgressSnapshot | undefined>()
const backend = ref<ProgressBackend>('local')
const storageFallback = ref(false)
const saveError = ref(false)
const copied = ref(false)
const exported = ref(false)

const locale = computed<Locale>(() => (lang.value.toLowerCase().startsWith('zh') ? 'zh-Hans' : 'en'))
const copy = computed(() => messagesFor(locale.value).progress)
const contentId = computed(() => {
  const value = frontmatter.value?.id
  return typeof value === 'string' ? value : ''
})
const current = computed(() => (contentId.value && snapshot.value ? snapshot.value.records[contentId.value] : undefined))
const completed = computed(() => Boolean(current.value?.completedAt))
const bookmarked = computed(() => Boolean(current.value?.bookmarkedAt))

async function refresh() {
  const loaded = await loadProgress()
  snapshot.value = loaded.snapshot
  backend.value = loaded.backend
  storageFallback.value = loaded.fallback
}

async function setFlag(field: 'completedAt' | 'bookmarkedAt') {
  if (!snapshot.value || !contentId.value) return
  saveError.value = false
  const enabled = field === 'completedAt' ? !completed.value : !bookmarked.value
  const next = updateRecord(snapshot.value, contentId.value, field, enabled)
  snapshot.value = next
  try {
    backend.value = await saveProgress(next)
    storageFallback.value = backend.value === 'local'
  } catch {
    saveError.value = true
  }
}

async function copyLink() {
  if (typeof window === 'undefined') return
  const value = window.location.href
  try {
    await navigator.clipboard?.writeText(value)
  } catch {
    const input = document.createElement('input')
    input.value = value
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
  }
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1800)
}

function exportData() {
  if (!snapshot.value) return
  downloadProgress(snapshot.value, locale.value)
  exported.value = true
  window.setTimeout(() => (exported.value = false), 1800)
}

function importData(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const next = parseProgress(String(reader.result ?? ''))
      snapshot.value = next
      backend.value = await saveProgress(next)
      storageFallback.value = backend.value === 'local'
      saveError.value = false
    } catch {
      saveError.value = true
    } finally {
      input.value = ''
    }
  }
  reader.readAsText(file)
}

onMounted(async () => {
  mounted.value = true
  await refresh()
})

watch(contentId, () => {
  copied.value = false
  exported.value = false
})
</script>

<template>
  <aside v-if="mounted" class="progress-panel" :aria-label="copy.label">
    <div class="progress-heading">
      <span class="progress-label">{{ copy.label }}</span>
      <span v-if="backend === 'indexeddb'" class="storage-chip">IDB</span>
      <span v-else class="storage-chip">local</span>
    </div>
    <p v-if="!contentId" class="progress-note">{{ copy.noContentId }}</p>
    <template v-else>
      <div class="progress-actions">
        <button type="button" class="progress-button" :aria-pressed="completed" @click="setFlag('completedAt')">
          <span aria-hidden="true">{{ completed ? '✓' : '○' }}</span>
          {{ completed ? copy.completed : copy.complete }}
        </button>
        <button type="button" class="progress-button" :aria-pressed="bookmarked" @click="setFlag('bookmarkedAt')">
          <span aria-hidden="true">{{ bookmarked ? '★' : '☆' }}</span>
          {{ bookmarked ? copy.bookmarked : copy.bookmark }}
        </button>
        <button type="button" class="progress-button" @click="copyLink">
          <span aria-hidden="true">↗</span>
          {{ copied ? copy.copied : copy.share }}
        </button>
      </div>
      <div class="progress-secondary">
        <button type="button" class="progress-link" @click="exportData">{{ exported ? copy.exported : copy.export }}</button>
        <label class="progress-link import-label">
          <span>{{ copy.import }}</span>
          <input type="file" accept="application/json,.json" @change="importData" />
        </label>
      </div>
      <p class="progress-note">
        {{ storageFallback ? copy.storageFallback : copy.localOnly }}
        <span v-if="saveError"> · {{ copy.storageError }}</span>
      </p>
    </template>
  </aside>
</template>

<style scoped>
.progress-panel {
  margin: 1.5rem 0 0;
  padding: .8rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  font-size: .82rem;
}
.progress-heading { display: flex; align-items: center; gap: .45rem; margin-bottom: .55rem; }
.progress-label { font-weight: 650; color: var(--vp-c-text-1); }
.storage-chip { border: 1px solid var(--vp-c-divider); border-radius: 999px; padding: .08rem .35rem; font-size: .68rem; color: var(--vp-c-text-2); }
.progress-actions { display: flex; flex-wrap: wrap; gap: .4rem; }
.progress-button, .progress-link { border: 1px solid var(--vp-c-divider); border-radius: 7px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; padding: .35rem .55rem; font: inherit; }
.progress-button:hover, .progress-link:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.progress-button:focus-visible, .progress-link:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.progress-secondary { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: .5rem; }
.progress-link { border: 0; padding: 0; background: transparent; color: var(--vp-c-brand-1); }
.import-label { cursor: pointer; }
.import-label input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.progress-note { margin: .5rem 0 0; color: var(--vp-c-text-2); line-height: 1.35; }
@media (max-width: 640px) { .progress-panel { margin-top: 1rem; } .progress-button { flex: 1 1 11rem; } }
</style>
