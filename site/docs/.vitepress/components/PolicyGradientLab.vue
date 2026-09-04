<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import {
  POLICY_GRADIENT_MODES,
  POLICY_GRADIENT_PROTOCOL_VERSION,
  acceptsPolicyGradientResponse,
  canonicalPolicyGradientMode,
  policyGradientConfigValidationError,
  type PolicyGradientConfig,
  type PolicyGradientMode,
  type PolicyGradientSnapshot,
  type PolicyGradientWorkerRequest,
  type PolicyGradientWorkerResponse,
} from '../policyGradientProtocol'
import { policyGradientMessagesFor } from '../i18n/policyGradientMessages'
import { interpolate, type Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })
const copy = computed(() => policyGradientMessagesFor(props.locale))

const baselineConfig: PolicyGradientConfig = {
  mode: 'reinforce',
  alpha: 0.25,
  discount: 1,
  noiseStd: 0.15,
  maxEpisodes: 200,
  seedHex: '5eed',
}

const config = reactive<PolicyGradientConfig>({ ...baselineConfig })
const appliedConfig = ref<PolicyGradientConfig>({ ...baselineConfig })
const snapshot = ref<PolicyGradientSnapshot>(emptySnapshot(baselineConfig))
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const awaiting = ref(false)
const running = ref(false)
const errorCode = ref('')
const status = ref('')
const currentRunId = ref('')
const sequence = ref(-1)
const runRemaining = ref(0)
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const modes = POLICY_GRADIENT_MODES
const validation = computed(() => policyGradientConfigValidationError(config))
const recentHistory = computed(() => snapshot.value.history.slice(-16))
const modeLabel = computed(() => configModeLabel(snapshot.value.mode))
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.loading
  if (phase.value === 'error') return copy.value.failed
  if (running.value) return copy.value.run
  if (snapshot.value.exhausted) return `${copy.value.exhausted}: ${snapshot.value.episodeCount}`
  return copy.value.ready
})

function emptySnapshot(source: PolicyGradientConfig): PolicyGradientSnapshot {
  return {
    mode: source.mode,
    alpha: source.alpha,
    discount: source.discount,
    noiseStd: source.noiseStd,
    maxEpisodes: source.maxEpisodes,
    seedHex: source.seedHex,
    episodeCount: 0,
    logits: Array.from({ length: 3 }, () => [0, 0, 0]),
    probabilities: Array.from({ length: 3 }, () => [1 / 3, 1 / 3, 1 / 3]),
    baselineValues: [0, 0, 0],
    baselineCounts: [0, 0, 0],
    objective: 0,
    entropy: Math.log(3),
    gradientNorm: 0,
    returnMean: 0,
    returnVariance: 0,
    advantageVariance: 0,
    converged: false,
    truncated: false,
    exhausted: false,
    history: [],
  }
}

function id(): string {
  return `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function localizedError(code: string): string {
  return (copy.value.errors as Record<string, string>)[code]
    ?? interpolate(copy.value.unknownError, { code })
}

function createWorker(): boolean {
  try {
    const next = new Worker(new URL('../workers/policy-gradient.worker.ts', import.meta.url), { type: 'module' })
    next.addEventListener('message', handle)
    next.addEventListener('error', () => fail('worker_error'))
    next.addEventListener('messageerror', () => fail('worker_error'))
    worker = next
    return true
  } catch {
    fail('worker_error')
    return false
  }
}

function fail(code: string): void {
  stop()
  awaiting.value = false
  phase.value = 'error'
  errorCode.value = code
}

function post(kind: PolicyGradientWorkerRequest['kind'], payload: Record<string, unknown> = {}): void {
  worker?.postMessage({
    v: POLICY_GRADIENT_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind,
    sequence: sequence.value + 1,
    ...payload,
  } as PolicyGradientWorkerRequest)
}

function start(): void {
  if (awaiting.value || running.value) return
  stop()
  const next = { ...config, mode: canonicalPolicyGradientMode(config.mode) ?? config.mode }
  const issue = policyGradientConfigValidationError(next)
  if (issue) {
    phase.value = 'error'
    errorCode.value = issue.code
    return
  }
  if (!worker && !createWorker()) return
  appliedConfig.value = { ...next }
  snapshot.value = emptySnapshot(next)
  currentRunId.value = id()
  sequence.value = -1
  phase.value = 'loading'
  awaiting.value = true
  errorCode.value = ''
  post('start', { config: next })
}

function handle(event: MessageEvent<PolicyGradientWorkerResponse>): void {
  const response = event.data
  if (!acceptsPolicyGradientResponse(response)) return
  if (response.runId !== currentRunId.value || response.sequence <= sequence.value) return
  sequence.value = response.sequence
  awaiting.value = false
  if (response.kind === 'error') {
    stop()
    errorCode.value = response.code
    phase.value = 'error'
    return
  }
  if (response.kind === 'ready' || response.kind === 'reset') {
    snapshot.value = response.snapshot
    phase.value = 'ready'
    errorCode.value = ''
    return
  }
  snapshot.value = response.outcome.snapshot
  phase.value = 'ready'
  errorCode.value = ''
  if (running.value && response.kind === 'advance') {
    runRemaining.value = Math.max(0, runRemaining.value - response.outcome.steps.length)
    if (runRemaining.value === 0 || snapshot.value.exhausted) stop()
    else schedule()
  }
}

function step(): void {
  if (phase.value !== 'ready' || awaiting.value || running.value) return
  awaiting.value = true
  post('step')
}

function advance(): void {
  if (phase.value !== 'ready' || awaiting.value || running.value) return
  awaiting.value = true
  post('advance', { episodes: 25 })
}

function run(): void {
  if (phase.value !== 'ready' || awaiting.value || snapshot.value.exhausted) return
  running.value = true
  runRemaining.value = Math.max(0, appliedConfig.value.maxEpisodes - snapshot.value.episodeCount)
  dispatch()
}

function dispatch(): void {
  if (!running.value || awaiting.value || runRemaining.value <= 0 || snapshot.value.exhausted) {
    if (running.value) stop()
    return
  }
  awaiting.value = true
  post('advance', { episodes: Math.min(50, runRemaining.value) })
}

function schedule(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    dispatch()
  }, 60)
}

function pause(): void {
  stop()
}

function stop(): void {
  running.value = false
  runRemaining.value = 0
  if (timer) clearTimeout(timer)
  timer = undefined
}

function reset(): void {
  if (phase.value !== 'ready' || awaiting.value) return
  awaiting.value = true
  post('reset', { seedHex: config.seedHex })
}

function preset(name: string): void {
  if (awaiting.value || running.value) return
  Object.assign(config, name === 'baseline' ? { mode: 'baseline', noiseStd: 0.15 } : { mode: 'reinforce', noiseStd: 0.15 })
  start()
}

function onPresetChange(event: Event): void {
  preset((event.target as HTMLSelectElement).value)
}

function modeChange(event: Event): void {
  config.mode = (event.target as HTMLSelectElement).value as PolicyGradientMode
}

function configModeLabel(mode: PolicyGradientMode): string {
  return mode === 'baseline' ? copy.value.modeBaseline : copy.value.modeReinforce
}

function format(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return Math.abs(value) >= 1000 ? value.toExponential(2) : value.toFixed(4)
}

function probability(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

onMounted(start)
onBeforeUnmount(() => {
  stop()
  worker?.terminate()
  worker = undefined
})
</script>

<template>
  <section class="lab-shell policy-gradient-lab" data-testid="policy-gradient-lab" :data-phase="phase" :data-episode="snapshot.episodeCount" :data-running="running" :aria-busy="phase === 'loading' || awaiting">
    <header class="lab-hero">
      <p class="lab-eyebrow">{{ copy.eyebrow }}</p>
      <h2>{{ copy.title }}</h2>
      <p>{{ copy.description }}</p>
      <span class="engine-chip">{{ phase === 'loading' ? copy.loading : phase === 'error' ? copy.failed : copy.engine }}</span>
    </header>
    <p class="sa-status" role="status" aria-live="polite">{{ status || statusLabel }}</p>

    <div class="lab-grid">
      <aside class="lab-panel">
        <h2>{{ copy.controls }}</h2>
        <label><span>{{ copy.preset }}</span><select :aria-label="copy.preset" @change="onPresetChange"><option value="reinforce">{{ copy.presetReinforce }}</option><option value="baseline">{{ copy.presetBaseline }}</option></select></label>
        <label><span>{{ copy.mode }}</span><select :value="config.mode" :aria-label="copy.mode" @change="modeChange"><option v-for="mode in modes" :key="mode" :value="mode">{{ configModeLabel(mode) }}</option></select></label>
        <label><span>{{ copy.alpha }}</span><input v-model.number="config.alpha" type="number" min="0.001" max="10" step="0.01" :aria-label="copy.alpha" /></label>
        <label><span>{{ copy.discount }}</span><input v-model.number="config.discount" type="number" min="0" max="1" step="0.05" :aria-label="copy.discount" /></label>
        <label><span>{{ copy.noiseStd }}</span><input v-model.number="config.noiseStd" type="number" min="0" step="0.05" :aria-label="copy.noiseStd" /></label>
        <label><span>{{ copy.episodes }}</span><input v-model.number="config.maxEpisodes" type="number" min="1" max="100000" step="1" :aria-label="copy.episodes" /></label>
        <label><span>{{ copy.seed }}</span><input v-model.trim="config.seedHex" type="text" :aria-label="copy.seed" /></label>
        <div class="lab-actions">
          <button class="lab-button lab-button--primary" data-testid="pg-apply" type="button" :disabled="phase === 'loading' || awaiting || running" @click="start">{{ copy.apply }}</button>
          <button class="lab-button" data-testid="pg-step" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="step">{{ copy.step }}</button>
          <button class="lab-button" data-testid="pg-advance" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="advance">{{ copy.advance }}</button>
          <button class="lab-button" data-testid="pg-run" type="button" :disabled="phase !== 'ready' || (awaiting && !running)" @click="running ? pause() : run()">{{ running ? copy.pause : copy.run }}</button>
          <button class="lab-button" data-testid="pg-reset" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="reset">{{ copy.reset }}</button>
        </div>
        <p v-if="validation" class="lab-error" role="alert">{{ copy.validation }}: {{ localizedError(validation.code) }}</p>
        <p v-if="errorCode && !validation" class="lab-error" role="alert">{{ copy.errorPrefix }} {{ localizedError(errorCode) }}</p>
      </aside>

      <div class="lab-panel">
        <h2>{{ copy.metrics }}</h2>
        <div class="metric-strip" data-testid="pg-metrics">
          <div><span>{{ copy.objectiveShort }}</span><strong>{{ format(snapshot.objective) }}</strong></div>
          <div><span>{{ copy.entropyShort }}</span><strong>{{ format(snapshot.entropy) }}</strong></div>
          <div><span>{{ copy.returnMean }}</span><strong>{{ format(snapshot.returnMean) }}</strong></div>
          <div><span>{{ copy.gradientNorm }}</span><strong>{{ format(snapshot.gradientNorm) }}</strong></div>
        </div>

        <section class="concept-callout" data-testid="pg-policy">
          <strong>{{ copy.policySurface }}</strong>
          <p>{{ copy.policySurfaceBody }}</p>
          <div v-for="(row, state) in snapshot.probabilities" :key="state" class="pg-policy-row">
            <span>{{ copy.context.replace('{state}', String(state)) }}</span>
            <div class="pg-policy-bars"><span v-for="(p, action) in row" :key="action" class="pg-policy-bar" :style="{ width: `${Math.max(2, p * 100)}%` }" :title="`${copy.actionLabel.replace('{action}', String(action))}: ${probability(p)}`">{{ copy.actionLabel.replace('{action}', String(action)) }} {{ probability(p) }}</span></div>
          </div>
        </section>

        <section class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.traceTable">
          <table class="mini-table" data-testid="pg-trace">
            <caption>{{ copy.traceTable }}</caption>
            <thead><tr><th scope="col">{{ copy.tableEpisode }}</th><th scope="col">{{ copy.tableState }}</th><th scope="col">{{ copy.tableAction }}</th><th scope="col">{{ copy.tableReward }}</th><th scope="col">{{ copy.tableReturn }}</th><th scope="col">{{ copy.tableBaseline }}</th><th scope="col">{{ copy.tableAdvantage }}</th><th scope="col">{{ copy.tableProbability }}</th><th scope="col">{{ copy.tableUpdate }}</th></tr></thead>
            <tbody><tr v-for="row in recentHistory" :key="row.episode" :data-episode="row.episode"><td>{{ row.episode }}</td><td>s{{ row.state }}</td><td>a{{ row.action }}</td><td>{{ format(row.reward) }}</td><td>{{ format(row.returnValue) }}</td><td>{{ format(row.baseline) }}</td><td>{{ format(row.advantage) }}</td><td>{{ format(row.probabilities[row.action] ?? 0) }}</td><td>{{ format(row.gradientNorm) }}</td></tr></tbody>
          </table>
        </section>
      </div>
    </div>

    <div class="lab-grid">
      <section class="lab-panel"><h2>{{ copy.rewardTable }}</h2><p>{{ copy.rewardTableBody }}</p><table class="mini-table"><thead><tr><th scope="col">{{ copy.state }}</th><th scope="col">a0</th><th scope="col">a1</th><th scope="col">a2</th></tr></thead><tbody><tr><th scope="row">s0</th><td>1.0</td><td>0.0</td><td>−1.0</td></tr><tr><th scope="row">s1</th><td>−0.5</td><td>1.25</td><td>0.25</td></tr><tr><th scope="row">s2</th><td>0.2</td><td>−0.8</td><td>1.4</td></tr></tbody></table></section>
      <aside class="concept-callout" data-testid="pg-diagnostics"><strong>{{ copy.diagnostics }}</strong><p>{{ copy.modelNote }}</p><p>{{ copy.returnVariance }}: <b>{{ format(snapshot.returnVariance) }}</b> · {{ copy.advantageVariance }}: <b>{{ format(snapshot.advantageVariance) }}</b></p><p>{{ copy.baselineCount }}: <b>{{ snapshot.baselineCounts.reduce((sum, value) => sum + value, 0) }}</b> · {{ copy.converged }}: <b>{{ snapshot.converged ? copy.yes : copy.no }}</b> · {{ copy.exhausted }}: <b>{{ snapshot.exhausted ? copy.yes : copy.no }}</b></p><p>{{ copy.finiteRun }}</p></aside>
    </div>
    <p class="concept-callout">{{ copy.question }}</p>
  </section>
</template>
