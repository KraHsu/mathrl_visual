<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import {
  ACTOR_CRITIC_MODES,
  ACTOR_CRITIC_PROTOCOL_VERSION,
  acceptsActorCriticResponse,
  actorCriticConfigValidationError,
  canonicalActorCriticMode,
  type ActorCriticConfig,
  type ActorCriticMode,
  type ActorCriticSnapshot,
  type ActorCriticWorkerRequest,
  type ActorCriticWorkerResponse,
} from '../actorCriticProtocol'
import { actorCriticMessagesFor } from '../i18n/actorCriticMessages'
import { interpolate, type Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })
const copy = computed(() => actorCriticMessagesFor(props.locale))

const baselineConfig: ActorCriticConfig = {
  mode: 'a2c',
  actorAlpha: 0.2,
  criticAlpha: 0.35,
  discount: 0.9,
  epsilon: 0.2,
  maxEpisodes: 200,
  maxSteps: 10,
  seedHex: '5eed',
}
const config = reactive<ActorCriticConfig>({ ...baselineConfig })
const appliedConfig = ref<ActorCriticConfig>({ ...baselineConfig })
const snapshot = ref<ActorCriticSnapshot>(emptySnapshot(baselineConfig))
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const awaiting = ref(false)
const running = ref(false)
const errorCode = ref('')
const currentRunId = ref('')
const sequence = ref(-1)
const runRemaining = ref(0)
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const modes = ACTOR_CRITIC_MODES
const validation = computed(() => actorCriticConfigValidationError(config))
const recentHistory = computed(() => snapshot.value.history.slice(-18))
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.loading
  if (phase.value === 'error') return copy.value.failed
  if (running.value) return copy.value.run
  if (snapshot.value.exhausted) return `${copy.value.exhausted}: ${snapshot.value.episodeCount}`
  return copy.value.ready
})

function emptySnapshot(source: ActorCriticConfig): ActorCriticSnapshot {
  return {
    mode: source.mode,
    actorAlpha: source.actorAlpha,
    criticAlpha: source.criticAlpha,
    discount: source.discount,
    epsilon: source.epsilon,
    maxEpisodes: source.maxEpisodes,
    maxSteps: source.maxSteps,
    seedHex: source.seedHex,
    episodeCount: 0,
    totalSteps: 0,
    actorLogits: [[0, 0], [0, 0]],
    actorProbabilities: [[0.5, 0.5], [0.5, 0.5]],
    criticValues: [0, 0, 0],
    qValues: [[0, 0], [0, 0], [0, 0]],
    averageReturn: 0,
    returnVariance: 0,
    averageTdError: 0,
    averageAdvantage: 0,
    averageImportanceRatio: 1,
    entropy: Math.log(2),
    converged: false,
    truncated: false,
    exhausted: false,
    lastEpisodeReturn: 0,
    history: [],
  }
}

function id(): string {
  return `ac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function localizedError(code: string): string {
  return (copy.value.errors as Record<string, string>)[code]
    ?? interpolate(copy.value.unknownError, { code })
}

function createWorker(): boolean {
  try {
    const next = new Worker(new URL('../workers/actor-critic.worker.ts', import.meta.url), { type: 'module' })
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

function post(kind: ActorCriticWorkerRequest['kind'], payload: Record<string, unknown> = {}): void {
  worker?.postMessage({
    v: ACTOR_CRITIC_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind,
    sequence: sequence.value + 1,
    ...payload,
  } as ActorCriticWorkerRequest)
}

function start(): void {
  if (awaiting.value || running.value) return
  stop()
  const next = { ...config, mode: canonicalActorCriticMode(config.mode) ?? config.mode }
  const issue = actorCriticConfigValidationError(next)
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

function handle(event: MessageEvent<ActorCriticWorkerResponse>): void {
  const response = event.data
  if (!acceptsActorCriticResponse(response)) return
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
    const consumed = response.outcome.episodes.length
    runRemaining.value = Math.max(0, runRemaining.value - consumed)
    if (runRemaining.value === 0 || snapshot.value.exhausted) stop()
    else schedule()
  }
}

function oneEpisode(): void {
  if (phase.value !== 'ready' || awaiting.value || running.value) return
  awaiting.value = true
  post('step')
}

function advance(): void {
  if (phase.value !== 'ready' || awaiting.value || running.value) return
  awaiting.value = true
  post('advance', { episodes: 10 })
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
  post('advance', { episodes: Math.min(25, runRemaining.value) })
}

function schedule(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    dispatch()
  }, 70)
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
  const values: Record<string, Partial<ActorCriticConfig>> = {
    qac: { mode: 'qac', actorAlpha: 0.2, criticAlpha: 0.35 },
    a2c: { mode: 'a2c', actorAlpha: 0.2, criticAlpha: 0.35 },
    off_policy: { mode: 'off_policy', actorAlpha: 0.15, criticAlpha: 0.35, epsilon: 0.25 },
    deterministic: { mode: 'deterministic', actorAlpha: 0.12, criticAlpha: 0.35, epsilon: 0 },
  }
  Object.assign(config, values[name] ?? values.a2c)
  start()
}

function onPresetChange(event: Event): void {
  preset((event.target as HTMLSelectElement).value)
}

function modeLabel(mode: ActorCriticMode): string {
  const keys: Record<ActorCriticMode, keyof typeof copy.value> = {
    qac: 'modeQac',
    a2c: 'modeA2c',
    off_policy: 'modeOffPolicy',
    deterministic: 'modeDeterministic',
  }
  return copy.value[keys[mode]] as string
}

function format(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return Math.abs(value) >= 1000 ? value.toExponential(2) : value.toFixed(4)
}

onMounted(start)
onBeforeUnmount(() => {
  stop()
  worker?.terminate()
  worker = undefined
})
</script>

<template>
  <section class="lab-shell actor-critic-lab" data-testid="actor-critic-lab" :data-phase="phase" :data-episode="snapshot.episodeCount" :data-running="running" :aria-busy="phase === 'loading' || awaiting">
    <header class="lab-hero"><p class="lab-eyebrow">{{ copy.eyebrow }}</p><h2>{{ copy.title }}</h2><p>{{ copy.description }}</p><span class="engine-chip">{{ phase === 'loading' ? copy.loading : phase === 'error' ? copy.failed : copy.engine }}</span></header>
    <p class="sa-status" role="status" aria-live="polite">{{ statusLabel }}</p>
    <div class="lab-grid">
      <aside class="lab-panel">
        <h2>{{ copy.controls }}</h2>
        <label><span>{{ copy.preset }}</span><select :aria-label="copy.preset" @change="onPresetChange"><option value="a2c">{{ copy.presetA2c }}</option><option value="qac">{{ copy.presetQac }}</option><option value="off_policy">{{ copy.presetOffPolicy }}</option><option value="deterministic">{{ copy.presetDeterministic }}</option></select></label>
        <label><span>{{ copy.mode }}</span><select v-model="config.mode" :aria-label="copy.mode"><option v-for="mode in modes" :key="mode" :value="mode">{{ modeLabel(mode) }}</option></select></label>
        <label><span>{{ copy.actorAlpha }}</span><input v-model.number="config.actorAlpha" type="number" min="0.001" max="10" step="0.01" :aria-label="copy.actorAlpha" /></label>
        <label><span>{{ copy.criticAlpha }}</span><input v-model.number="config.criticAlpha" type="number" min="0.001" max="10" step="0.01" :aria-label="copy.criticAlpha" /></label>
        <label><span>{{ copy.discount }}</span><input v-model.number="config.discount" type="number" min="0" max="1" step="0.05" :aria-label="copy.discount" /></label>
        <label><span>{{ copy.epsilon }}</span><input v-model.number="config.epsilon" type="number" min="0" max="1" step="0.05" :aria-label="copy.epsilon" /></label>
        <label><span>{{ copy.episodes }}</span><input v-model.number="config.maxEpisodes" type="number" min="1" max="100000" step="1" :aria-label="copy.episodes" /></label>
        <label><span>{{ copy.maxSteps }}</span><input v-model.number="config.maxSteps" type="number" min="1" max="10" step="1" :aria-label="copy.maxSteps" /></label>
        <label><span>{{ copy.seed }}</span><input v-model.trim="config.seedHex" type="text" :aria-label="copy.seed" /></label>
        <div class="lab-actions"><button class="lab-button lab-button--primary" data-testid="ac-apply" type="button" :disabled="phase === 'loading' || awaiting || running" @click="start">{{ copy.apply }}</button><button class="lab-button" data-testid="ac-step" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="oneEpisode">{{ copy.step }}</button><button class="lab-button" data-testid="ac-advance" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="advance">{{ copy.advance }}</button><button class="lab-button" data-testid="ac-run" type="button" :disabled="phase !== 'ready' || (awaiting && !running)" @click="running ? stop() : run()">{{ running ? copy.pause : copy.run }}</button><button class="lab-button" data-testid="ac-reset" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="reset">{{ copy.reset }}</button></div>
        <p v-if="validation" class="lab-error" role="alert">{{ copy.validation }}: {{ localizedError(validation.code) }}</p><p v-if="errorCode && !validation" class="lab-error" role="alert">{{ copy.errorPrefix }} {{ localizedError(errorCode) }}</p>
      </aside>
      <div class="lab-panel">
        <h2>{{ copy.metrics }}</h2>
        <div class="metric-strip" data-testid="ac-metrics"><div><span>{{ copy.averageReturn }}</span><strong>{{ format(snapshot.averageReturn) }}</strong></div><div><span>{{ copy.averageTdError }}</span><strong>{{ format(snapshot.averageTdError) }}</strong></div><div><span>{{ copy.averageAdvantage }}</span><strong>{{ format(snapshot.averageAdvantage) }}</strong></div><div><span>{{ copy.averageImportanceRatio }}</span><strong>{{ format(snapshot.averageImportanceRatio) }}</strong></div></div>
        <section class="concept-callout" data-testid="ac-policy"><strong>{{ copy.policy }}</strong><p>{{ copy.policyBody }}</p><div v-for="(row, state) in snapshot.actorProbabilities" :key="state" class="pg-policy-row"><span>s{{ state }}</span><div class="pg-policy-bars"><span v-for="(p, action) in row" :key="action" class="pg-policy-bar" :style="{ width: `${Math.max(2, p * 100)}%` }">a{{ action }} {{ (p * 100).toFixed(1) }}%</span></div></div></section>
        <section class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.trajectory"><table class="mini-table" data-testid="ac-trace"><caption>{{ copy.trajectory }}</caption><thead><tr><th scope="col">{{ copy.tableEpisode }}</th><th scope="col">{{ copy.tableTime }}</th><th scope="col">{{ copy.tableState }}</th><th scope="col">{{ copy.tableAction }}</th><th scope="col">{{ copy.tableReward }}</th><th scope="col">{{ copy.tableTdError }}</th><th scope="col">{{ copy.tableAdvantage }}</th><th scope="col">{{ copy.tableRatio }}</th><th scope="col">{{ copy.tableActor }}</th><th scope="col">{{ copy.tableCritic }}</th></tr></thead><tbody><tr v-for="(row, index) in recentHistory" :key="`${row.episode}-${row.time}-${index}`"><td>{{ row.episode }}</td><td>{{ row.time }}</td><td>s{{ row.state }}</td><td>a{{ row.action }}</td><td>{{ format(row.reward) }}</td><td>{{ format(row.tdError) }}</td><td>{{ format(row.advantage) }}</td><td>{{ format(row.importanceRatio) }}</td><td>{{ format(row.actorUpdate.reduce((sum, value) => sum + Math.abs(value), 0)) }}</td><td>{{ format(row.criticUpdate) }}</td></tr></tbody></table></section>
      </div>
    </div>
    <div class="lab-grid"><section class="lab-panel"><h2>{{ copy.environment }}</h2><p>{{ copy.environmentBody }}</p><table class="mini-table"><thead><tr><th scope="col">s</th><th scope="col">a0</th><th scope="col">a1</th></tr></thead><tbody><tr><th scope="row">s0</th><td>s1, r=0</td><td>s2, r=1</td></tr><tr><th scope="row">s1</th><td>s2, r=2</td><td>s2, r=−1</td></tr></tbody></table></section><aside class="concept-callout" data-testid="ac-diagnostics"><strong>{{ copy.diagnostics }}</strong><p>{{ copy.critic }}: <b>[{{ snapshot.criticValues.map(format).join(', ') }}]</b></p><p>{{ copy.qTable }}: <b>{{ snapshot.qValues.map((row) => `[${row.map(format).join(', ')}]`).join(' ') }}</b></p><p>{{ copy.entropy }}: <b>{{ format(snapshot.entropy) }}</b> · {{ copy.converged }}: <b>{{ snapshot.converged ? copy.yes : copy.no }}</b> · {{ copy.exhausted }}: <b>{{ snapshot.exhausted ? copy.yes : copy.no }}</b></p><p>{{ copy.finiteRun }}</p></aside></div>
    <p class="concept-callout">{{ copy.question }}</p>
  </section>
</template>
