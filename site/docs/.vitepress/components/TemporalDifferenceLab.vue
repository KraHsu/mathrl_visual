<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import {
  TEMPORAL_DIFFERENCE_MODES,
  TEMPORAL_DIFFERENCE_PROTOCOL_VERSION,
  canonicalTemporalDifferenceMode,
  temporalDifferenceConfigValidationError,
  type TemporalDifferenceAdvanceOutcome,
  type TemporalDifferenceConfig,
  type TemporalDifferenceMode,
  type TemporalDifferenceOutcome,
  type TemporalDifferenceSnapshot,
  type TemporalDifferenceWorkerRequest,
  type TemporalDifferenceWorkerResponse,
  type TemporalDifferenceTransition,
  type TemporalDifferenceUpdate,
} from '../temporalDifferenceProtocol'
import { temporalDifferenceMessagesFor } from '../i18n/temporalDifferenceMessages'
import { interpolate, type Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })
const copy = computed(() => temporalDifferenceMessagesFor(props.locale))
const stateCount = 16
const actionCount = 5
const actionGlyphs = ['↑', '→', '↓', '←', '•']
const baseline: TemporalDifferenceConfig = {
  mode: 'sarsa', discount: 0.9, slipProbability: 0, epsilon: 0.1, alpha: 0.1,
  nStep: 3, maxEpisodes: 100, maxSteps: 40, seedHex: '5eed',
  rewards: { default: -1, boundary: -10, hazard: -10, goal: 0 },
}
const config = reactive<TemporalDifferenceConfig>({ ...baseline, rewards: { ...baseline.rewards } })
const appliedConfig = ref<TemporalDifferenceConfig>({ ...config, rewards: { ...config.rewards } })
const snapshot = ref<TemporalDifferenceSnapshot>(emptySnapshot(baseline))
const trace = ref<TemporalDifferenceTransition[]>([])
const updates = ref<TemporalDifferenceUpdate[]>([])
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const awaiting = ref(false)
const running = ref(false)
const status = ref('')
const announcement = ref('')
const selectedState = ref(0)
const currentRunId = ref('')
const sequence = ref(-1)
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const validation = computed(() => temporalDifferenceConfigValidationError(config))
const selectedValue = computed(() => snapshot.value.values[selectedState.value] ?? 0)
const selectedActionValues = computed(() => snapshot.value.actionValues[selectedState.value] ?? Array(actionCount).fill(0))
const latestUpdate = computed(() => updates.value.at(-1) ?? snapshot.value.lastUpdate)
const canCommand = computed(() => phase.value === 'ready' && !awaiting.value)
const statusLabel = computed(() => phase.value === 'loading' ? copy.value.loading : phase.value === 'error' ? copy.value.failed : running.value ? copy.value.running : snapshot.value.exhausted ? copy.value.exhausted : copy.value.ready)
const chart = computed(() => {
  const values = snapshot.value.values
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = Math.max(max - min, 1e-9)
  const points = values.map((value, index) => `${18 + (index / (values.length - 1)) * 524},${18 + ((max - value) / span) * 114}`).join(' ')
  return { points, min, max }
})

function emptySnapshot(source: TemporalDifferenceConfig): TemporalDifferenceSnapshot {
  return {
    mode: source.mode, episodeCount: 0, totalSteps: 0, values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, () => Array(actionCount).fill(0)),
    policy: Array(stateCount).fill(-1), policyProbabilities: Array.from({ length: stateCount }, () => Array(actionCount).fill(0)),
    lastState: 0, lastAction: 255, lastTarget: 0, lastTdError: 0, episodeReturnMean: 0, episodeReturnVariance: 0,
    converged: false, truncated: false, exhausted: false,
  }
}
function cloneConfig(value: TemporalDifferenceConfig): TemporalDifferenceConfig { return { ...value, rewards: { ...value.rewards } } }
function runId(): string { return `ch07-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }
function setStatus(message: string, announce = true): void { status.value = message; if (announce) announcement.value = message }
function localizedError(code: string): string {
  return (copy.value.errors as Record<string, string>)[code]
    ?? interpolate(copy.value.unknownError, { code })
}
function createWorker(): boolean {
  try {
    const next = new Worker(new URL('../workers/temporal-difference.worker.ts', import.meta.url), { type: 'module' })
    next.addEventListener('message', handleResponse)
    const failed = () => { if (worker !== next) return; stopRun(); phase.value = 'error'; awaiting.value = false; setStatus(`${copy.value.failed}: ${localizedError('temporal_difference_worker')}`); next.terminate(); worker = undefined }
    next.addEventListener('error', failed)
    next.addEventListener('messageerror', failed)
    worker = next
    return true
  } catch { phase.value = 'error'; setStatus(`${copy.value.failed}: ${localizedError('temporal_difference_worker')}`); return false }
}
function post(request: TemporalDifferenceWorkerRequest): void { worker?.postMessage(request) }
function start(): void {
  stopRun()
  const next = cloneConfig(config)
  const issue = temporalDifferenceConfigValidationError(next)
  if (issue) { phase.value = 'error'; setStatus(`${copy.value.validation}: ${localizedError(issue.code)}`); return }
  if (!worker && !createWorker()) return
  appliedConfig.value = next
  currentRunId.value = runId(); sequence.value = -1; awaiting.value = true; phase.value = 'loading'; trace.value = []; updates.value = []; snapshot.value = emptySnapshot(next); setStatus(copy.value.loading)
  post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: currentRunId.value, kind: 'start', config: next })
}
function dispatch(kind: 'step' | 'advance' | 'reset', transitions = 1): void {
  if (!worker || !currentRunId.value || !canCommand.value) return
  awaiting.value = true
  if (kind === 'advance') post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: currentRunId.value, kind, transitions })
  else if (kind === 'reset') post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: currentRunId.value, kind })
  else post({ v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION, runId: currentRunId.value, kind })
}
function step(): void { dispatch('step') }
function advance(): void { dispatch('advance', 25) }
function run(): void { if (!canCommand.value || snapshot.value.exhausted) return; running.value = true; setStatus(copy.value.running); schedule() }
function schedule(): void { if (!running.value || awaiting.value || snapshot.value.exhausted) return; dispatch('advance', 80) }
function pause(): void { stopRun(); setStatus(copy.value.paused, true) }
function stopRun(): void { running.value = false; if (timer) clearTimeout(timer); timer = undefined }
function reset(): void { stopRun(); dispatch('reset') }
function modeLabel(mode: TemporalDifferenceMode): string { return copy.value[`mode${mode === 'td_zero' ? 'TdZero' : mode === 'sarsa' ? 'Sarsa' : mode === 'n_step_sarsa' ? 'NStep' : 'QLearning'}` as keyof typeof copy.value] as string }
function handleResponse(event: MessageEvent<TemporalDifferenceWorkerResponse>): void {
  const response = event.data
  if (response.v !== TEMPORAL_DIFFERENCE_PROTOCOL_VERSION || response.runId !== currentRunId.value || response.sequence <= sequence.value) return
  sequence.value = response.sequence
  if (response.kind === 'error') { awaiting.value = false; if (!response.recoverable) { stopRun(); phase.value = 'error' }; setStatus(`${copy.value.failed}: ${localizedError(response.code)}`); return }
  awaiting.value = false
  if (response.kind === 'started') { snapshot.value = response.snapshot; phase.value = 'ready'; setStatus(copy.value.ready); if (running.value) schedule(); return }
  if (response.kind === 'reset') { snapshot.value = response.snapshot; trace.value = []; updates.value = []; setStatus(copy.value.resetDone); return }
  applyOutcome(response.outcome)
  if (running.value && !snapshot.value.exhausted) timer = setTimeout(schedule, 90)
}
function isAdvance(outcome: TemporalDifferenceOutcome | TemporalDifferenceAdvanceOutcome): outcome is TemporalDifferenceAdvanceOutcome { return 'transitions' in outcome }
function applyOutcome(outcome: TemporalDifferenceOutcome | TemporalDifferenceAdvanceOutcome): void {
  snapshot.value = outcome.snapshot
  const transitions = isAdvance(outcome) ? outcome.transitions : [outcome.transition]
  trace.value = [...trace.value, ...transitions].slice(-240)
  updates.value = [...updates.value, ...outcome.updates].slice(-240)
  phase.value = 'ready'
}
function cellClass(state: number): string[] { return ['td-state', state === selectedState.value ? 'is-selected' : '', state === 0 ? 'is-start' : '', state === 15 ? 'is-goal' : '', [6, 9].includes(state) ? 'is-hazard' : ''].filter(Boolean) }
function stateLabel(state: number): string { return `s${state}` }
function format(value: number): string { return Number.isFinite(value) ? value.toFixed(Math.abs(value) >= 100 ? 1 : 4) : '—' }
function actionName(value: number): string { return value >= 0 && value < actionCount ? actionGlyphs[value] : '—' }

onMounted(() => { start() })
onBeforeUnmount(() => { stopRun(); worker?.terminate(); worker = undefined })
</script>

<template>
  <section class="td-lab lab-shell" data-testid="temporal-difference-lab" :data-phase="phase" :data-mode="appliedConfig.mode" :data-episode-count="snapshot.episodeCount" :data-total-steps="snapshot.totalSteps" :aria-busy="phase === 'loading'">
    <header class="lab-hero">
      <p class="lab-eyebrow">{{ copy.eyebrow }}</p>
      <h2>{{ copy.title }}</h2>
      <p>{{ copy.description }}</p>
      <span class="engine-chip">{{ copy.engine }}</span>
    </header>
    <div class="lab-status" role="status" aria-live="polite"><span class="status-dot" :data-phase="phase" />{{ status || statusLabel }}<span class="sr-only">{{ announcement }}</span></div>

    <section class="lab-controls" :aria-label="copy.controls">
      <div class="control-grid">
        <label>{{ copy.mode }}<select v-model="config.mode" data-td-mode :aria-label="copy.mode"><option v-for="mode in TEMPORAL_DIFFERENCE_MODES" :key="mode" :value="mode">{{ modeLabel(mode) }}</option></select></label>
        <label>{{ copy.discount }}<input v-model.number="config.discount" type="number" min="0" max="1" step="0.05" /></label>
        <label>{{ copy.alpha }}<input v-model.number="config.alpha" type="number" min="0.001" max="1" step="0.01" /></label>
        <label>{{ copy.epsilon }}<input v-model.number="config.epsilon" type="range" min="0" max="1" step="0.05" /><output>{{ config.epsilon.toFixed(2) }}</output></label>
        <label>{{ copy.wind }}<input v-model.number="config.slipProbability" type="range" min="0" max="1" step="0.05" /><output>{{ Math.round(config.slipProbability * 100) }}%</output></label>
        <label>{{ copy.nStep }}<input v-model.number="config.nStep" type="number" min="1" max="100" step="1" /></label>
        <label>{{ copy.maxEpisodes }}<input v-model.number="config.maxEpisodes" type="number" min="1" max="100000" step="1" /></label>
        <label>{{ copy.maxSteps }}<input v-model.number="config.maxSteps" type="number" min="1" max="100" step="1" /></label>
        <label>{{ copy.seed }}<input v-model="config.seedHex" spellcheck="false" inputmode="text" /></label>
      </div>
      <p v-if="validation" class="validation-message" role="alert">{{ copy.validation }}: {{ localizedError(validation.code) }}</p>
      <div class="control-actions">
        <button type="button" class="action-button action-button--primary" :disabled="phase === 'loading'" @click="start">{{ copy.apply }}</button>
        <button type="button" class="action-button" :disabled="!canCommand" @click="step">{{ copy.step }}</button>
        <button type="button" class="action-button" :disabled="!canCommand" @click="advance">{{ copy.advance }}</button>
        <button type="button" class="action-button" :disabled="phase !== 'ready' || (awaiting && !running)" @click="running ? pause() : run()">{{ running ? copy.pause : copy.run }}</button>
        <button type="button" class="action-button" :disabled="!canCommand" @click="reset">{{ copy.reset }}</button>
      </div>
    </section>

    <div class="metric-grid">
      <article><span>{{ copy.episodes }}</span><strong data-td-episodes>{{ snapshot.episodeCount }}</strong></article>
      <article><span>{{ copy.steps }}</span><strong>{{ snapshot.totalSteps }}</strong></article>
      <article><span>{{ copy.tdTarget }}</span><strong>{{ format(snapshot.lastTarget) }}</strong></article>
      <article><span>{{ copy.tdError }}</span><strong>{{ format(snapshot.lastTdError) }}</strong></article>
      <article><span>{{ copy.returnMean }}</span><strong>{{ format(snapshot.episodeReturnMean) }}</strong></article>
      <article><span>{{ copy.exhausted }}</span><strong>{{ snapshot.exhausted ? copy.yes : copy.no }}</strong></article>
    </div>

    <div class="td-grid-layout">
      <section class="lab-card">
        <div class="card-heading"><h3>{{ copy.grid }}</h3><span>{{ copy.clickCell }}</span></div>
        <div class="td-grid" role="group" :aria-label="copy.grid">
          <button v-for="state in stateCount" :key="state - 1" type="button" :class="cellClass(state - 1)" :aria-label="`${stateLabel(state - 1)}: ${format(snapshot.values[state - 1] ?? 0)}`" @click="selectedState = state - 1"><span>{{ stateLabel(state - 1) }}</span><strong>{{ format(snapshot.values[state - 1] ?? 0) }}</strong><small>{{ actionName(snapshot.policy[state - 1] ?? -1) }}</small></button>
        </div>
      </section>
      <section class="lab-card">
        <div class="card-heading"><h3>{{ copy.valueChart }}</h3><span>s₀…s₁₅</span></div>
        <svg viewBox="0 0 560 150" role="img" :aria-label="copy.valueChart"><line x1="18" y1="132" x2="542" y2="132" class="chart-axis" /><polyline :points="chart.points" class="chart-line" /><circle v-for="(value, index) in snapshot.values" :key="index" :cx="18 + (index / (snapshot.values.length - 1)) * 524" :cy="18 + ((chart.max - value) / Math.max(chart.max - chart.min, 1e-9)) * 114" r="2.5" class="chart-dot" /></svg>
      </section>
    </div>

    <section class="lab-card td-inspector">
      <div class="card-heading"><h3>{{ copy.inspector }}</h3><span>{{ stateLabel(selectedState) }}</span></div>
      <div class="inspector-grid"><div><span>{{ copy.selectedValue }}</span><strong>{{ format(selectedValue) }}</strong></div><div><span>{{ copy.actionValues }}</span><strong>{{ selectedActionValues.map(format).join(' · ') }}</strong></div><div><span>{{ copy.lastAction }}</span><strong>{{ actionName(snapshot.lastAction) }}</strong></div><div><span>{{ copy.featureNote }}</span><strong>{{ appliedConfig.mode === 'q_learning' ? copy.offPolicy : copy.onPolicy }}</strong></div></div>
      <p v-if="latestUpdate" class="equation-audit"><code>{{ format(latestUpdate.newValue) }} = {{ format(latestUpdate.oldValue) }} + α × ({{ format(latestUpdate.target) }} − {{ format(latestUpdate.oldValue) }})</code></p>
    </section>

    <section class="lab-card">
      <div class="card-heading"><h3>{{ copy.trace }}</h3><span>{{ trace.length }} / 240</span></div>
      <div class="table-wrap"><table><thead><tr><th>{{ copy.index }}</th><th>{{ copy.state }}</th><th>{{ copy.action }}</th><th>{{ copy.reward }}</th><th>{{ copy.nextState }}</th><th>{{ copy.target }}</th><th>{{ copy.error }}</th></tr></thead><tbody><tr v-for="(row, index) in trace.slice(-40)" :key="`${row.episodeStep}-${index}`"><td>{{ row.episodeStep }}</td><td>{{ stateLabel(row.state) }}</td><td>{{ actionName(row.action) }}</td><td>{{ format(row.reward) }}</td><td>{{ stateLabel(row.nextState) }}</td><td>{{ format(updates.at(-(trace.length - index))?.target ?? 0) }}</td><td>{{ format(updates.at(-(trace.length - index))?.tdError ?? 0) }}</td></tr><tr v-if="trace.length === 0"><td colspan="7">{{ copy.noTrace }}</td></tr></tbody></table></div>
    </section>

    <div class="lab-audit"><strong>{{ copy.auditTitle }}</strong><span>✓ {{ copy.auditModelFree }}</span><span>✓ {{ copy.auditTarget }}</span><span>✓ {{ copy.auditSeed }}</span></div>
  </section>
</template>

<style scoped>
.td-lab { --lab-accent: #0d766e; }
.td-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .5rem; max-width: 34rem; }
.td-state { min-height: 5rem; border: 1px solid var(--vp-c-divider); border-radius: .7rem; background: var(--vp-c-bg-soft); color: inherit; text-align: left; padding: .5rem; cursor: pointer; display: flex; flex-direction: column; gap: .2rem; }
.td-state:hover, .td-state.is-selected { border-color: var(--lab-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lab-accent) 20%, transparent); }
.td-state.is-goal { background: color-mix(in srgb, #e5b94e 20%, var(--vp-c-bg-soft)); }.td-state.is-hazard { background: color-mix(in srgb, #e76f51 14%, var(--vp-c-bg-soft)); }
.td-state span, .td-state small { color: var(--vp-c-text-2); font-size: .75rem; opacity: 1; }.td-state strong { font-size: 1rem; }.td-state small { margin-top: auto; font-size: 1.1rem; }
.td-grid-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 1rem; margin: 1rem 0; }
.td-inspector .inspector-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }.inspector-grid div { padding: .7rem; background: var(--vp-c-bg-soft); border-radius: .6rem; }.inspector-grid span { display:block; font-size:.78rem; opacity:.72; }.inspector-grid strong { display:block; margin-top:.3rem; overflow-wrap:anywhere; }
.equation-audit { margin: .9rem 0 0; padding: .7rem; background: color-mix(in srgb, var(--lab-accent) 8%, var(--vp-c-bg-soft)); border-radius: .5rem; overflow:auto; }.equation-audit code { color: var(--vp-c-text-1); }
.chart-axis { stroke: var(--vp-c-divider); stroke-width: 1; }.chart-line { fill:none; stroke:var(--lab-accent); stroke-width:2.5; }.chart-dot { fill:var(--lab-accent); }
@media (max-width: 760px) { .td-grid-layout { grid-template-columns: 1fr; }.td-inspector .inspector-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
</style>
