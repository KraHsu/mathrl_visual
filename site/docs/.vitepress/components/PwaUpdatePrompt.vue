<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

import { messagesFor, type Locale } from '../i18n/messages'

interface PwaUpdateApi {
  activateUpdate?: () => Promise<boolean>
}

interface PwaUpdateEventDetail {
  registration?: ServiceWorkerRegistration
}

type PwaWindow = Window & { mathrlPwa?: PwaUpdateApi }

const { lang } = useData()
const locale = computed<Locale>(() => (lang.value.toLowerCase().startsWith('zh') ? 'zh-Hans' : 'en'))
const copy = computed(() => messagesFor(locale.value).pwa)

const mounted = ref(false)
const available = ref(false)
const activating = ref(false)
const activated = ref(false)
const failed = ref(false)
const dismissed = ref(false)
const registration = ref<ServiceWorkerRegistration | undefined>()

function onUpdate(event: Event): void {
  const detail = (event as CustomEvent<PwaUpdateEventDetail>).detail
  registration.value = detail?.registration
  available.value = true
  activated.value = false
  failed.value = false
  dismissed.value = false
}

async function discoverWaitingWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const current = await navigator.serviceWorker.getRegistration()
    if (current?.waiting) {
      registration.value = current
      available.value = true
    }
  } catch {
    // A private browsing context can reject getRegistration; the prompt is
    // optional and should never make the static lesson fail.
  }
}

async function activate(): Promise<void> {
  const api = (window as PwaWindow).mathrlPwa
  if (!api?.activateUpdate) {
    failed.value = true
    return
  }
  activating.value = true
  failed.value = false
  try {
    const didActivate = await api.activateUpdate()
    if (!didActivate) {
      failed.value = true
      return
    }
    // Deliberately do not reload here.  Activation is explicit, while the
    // user chooses when to leave the current reading position and refresh.
    available.value = false
    activated.value = true
  } catch {
    failed.value = true
  } finally {
    activating.value = false
  }
}

function refresh(): void {
  window.location.reload()
}

function dismiss(): void {
  dismissed.value = true
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('mathrl:pwa-update', onUpdate)
  void discoverWaitingWorker()
})

onBeforeUnmount(() => {
  window.removeEventListener('mathrl:pwa-update', onUpdate)
})
</script>

<template>
  <aside
    v-if="mounted && !dismissed && (available || activated || failed)"
    class="pwa-update-prompt"
    data-testid="pwa-update-prompt"
    :data-state="activating ? 'activating' : activated ? 'activated' : failed ? 'error' : 'available'"
    :aria-label="copy.ariaLabel"
    role="region"
    aria-live="polite"
  >
    <div class="pwa-update-prompt__copy">
      <strong>{{ activated ? copy.updated : failed ? copy.unavailable : activating ? copy.updating : copy.updateAvailable }}</strong>
      <span v-if="!activated && !failed">{{ copy.updateDetails }}</span>
    </div>
    <div class="pwa-update-prompt__actions">
      <button
        v-if="!activated"
        type="button"
        class="pwa-update-prompt__button"
        data-testid="pwa-update-activate"
        :disabled="activating"
        @click="activate"
      >
        {{ activating ? copy.updating : copy.updateButton }}
      </button>
      <button
        v-if="activated"
        type="button"
        class="pwa-update-prompt__button"
        data-testid="pwa-update-refresh"
        @click="refresh"
      >
        {{ copy.refreshButton }}
      </button>
      <button
        v-if="!activated"
        type="button"
        class="pwa-update-prompt__dismiss"
        data-testid="pwa-update-dismiss"
        @click="dismiss"
      >
        {{ copy.dismiss }}
      </button>
    </div>
  </aside>
</template>
