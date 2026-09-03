<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import {
  VALUE_FUNCTION_FEATURE_MAPS,
  VALUE_FUNCTION_MODES,
  VALUE_FUNCTION_PROTOCOL_VERSION,
  canonicalValueFunctionFeatureMap,
  canonicalValueFunctionMode,
  valueFunctionConfigValidationError,
  type ValueFunctionAdvanceOutcome,
  type ValueFunctionConfig,
  type ValueFunctionFeatureMap,
  type ValueFunctionMode,
  type ValueFunctionOutcome,
  type ValueFunctionSnapshot,
  type ValueFunctionTransition,
  type ValueFunctionUpdate,
  type ValueFunctionWorkerRequest,
  type ValueFunctionWorkerResponse,
} from '../valueFunctionProtocol'
import { valueFunctionMessagesFor } from '../i18n/valueFunctionMessages'
import { interpolate, type Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })
const copy = computed(() => valueFunctionMessagesFor(props.locale))
const stateCount = 16
const actionCount = 5
const glyphs = ['↑', '→', '↓', '←', '•']
const baseline: ValueFunctionConfig = {
  mode: 'td_linear', featureMap: 'bias_coordinates', discount: .9, slipProbability: 0,
  epsilon: .1, alpha: .01, replayCapacity: 512, batchSize: 16, targetUpdateInterval: 20,
  maxEpisodes: 100, maxSteps: 40, seedHex: '5eed', rewards: { default: -1, boundary: -10, hazard: -10, goal: 0 },
}
const config = reactive<ValueFunctionConfig>({ ...baseline, rewards: { ...baseline.rewards } })
const appliedConfig = ref<ValueFunctionConfig>({ ...baseline, rewards: { ...baseline.rewards } })
const snapshot = ref<ValueFunctionSnapshot>(emptySnapshot(baseline))
const transitions = ref<ValueFunctionTransition[]>([])
const updates = ref<ValueFunctionUpdate[]>([])
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const awaiting = ref(false)
const running = ref(false)
const status = ref('')
const announcement = ref('')
const selectedState = ref(0)
const runKey = ref('')
const lastSequence = ref(-1)
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const validation = computed(() => valueFunctionConfigValidationError(config))
const selectedFeatures = computed(() => snapshot.value.lastFeatures ?? [])
const selectedValue = computed(() => snapshot.value.values[selectedState.value] ?? 0)
const canCommand = computed(() => phase.value === 'ready' && !awaiting.value)
const statusLabel = computed(() => phase.value === 'loading' ? copy.value.loading : phase.value === 'error' ? copy.value.failed : running.value ? copy.value.running : snapshot.value.exhausted ? copy.value.exhausted : copy.value.ready)
const chart = computed(() => {
  const values = snapshot.value.values
  const min = Math.min(...values, 0); const max = Math.max(...values, 0); const span = Math.max(max - min, 1e-9)
  return { min, max, points: values.map((value, index) => `${18 + index / (values.length - 1) * 524},${18 + (max - value) / span * 114}`).join(' ') }
})

function emptySnapshot(source: ValueFunctionConfig): ValueFunctionSnapshot {
  return { mode: source.mode, featureMap: source.featureMap, featureCount: source.featureMap === 'coordinates' ? 2 : source.featureMap === 'bias_coordinates' ? 3 : source.featureMap === 'polynomial' ? 6 : source.featureMap === 'fourier' ? 9 : 16, weights: Array(16).fill(0), actionWeights: Array.from({ length: 5 }, () => Array(16).fill(0)), targetActionWeights: Array.from({ length: 5 }, () => Array(16).fill(0)), values: Array(16).fill(0), actionValues: Array.from({ length: 16 }, () => Array(5).fill(0)), policy: Array(16).fill(-1), policyProbabilities: Array.from({ length: 16 }, () => Array(5).fill(0)), lastFeatures: Array(16).fill(0), lastState: 0, lastAction: 255, lastPrediction: 0, lastTarget: 0, lastTdError: 0, lastLoss: 0, lastGradientNorm: 0, lastUpdateNorm: 0, replaySize: 0, updateCount: 0, targetSyncCount: 0, episodeCount: 0, totalSteps: 0, episodeReturnMean: 0, episodeReturnVariance: 0, converged: false, truncated: false, exhausted: false }
}
function clone(value: ValueFunctionConfig): ValueFunctionConfig { return { ...value, rewards: { ...value.rewards } } }
function id(): string { return `ch08-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }
function setStatus(message: string, announce = true): void { status.value = message; if (announce) announcement.value = message }
function localizedError(code: string): string {
  return (copy.value.errors as Record<string, string>)[code]
    ?? interpolate(copy.value.unknownError, { code })
}
function createWorker(): boolean {
  try {
    const next = new Worker(new URL('../workers/value-function.worker.ts', import.meta.url), { type: 'module' })
    next.addEventListener('message', handleResponse)
    const failed = () => { if (worker !== next) return; stopRun(); phase.value = 'error'; awaiting.value = false; setStatus(`${copy.value.failed}: ${localizedError('value_function_worker')}`); next.terminate(); worker = undefined }
    next.addEventListener('error', failed); next.addEventListener('messageerror', failed); worker = next; return true
  } catch { phase.value = 'error'; setStatus(`${copy.value.failed}: ${localizedError('value_function_worker')}`); return false }
}
function post(request: ValueFunctionWorkerRequest): void { worker?.postMessage(request) }
function start(): void {
  stopRun(); const next = clone(config); const issue = valueFunctionConfigValidationError(next)
  if (issue) { phase.value = 'error'; setStatus(`${copy.value.validation}: ${localizedError(issue.code)}`); return }
  if (!worker && !createWorker()) return
  appliedConfig.value = next; runKey.value = id(); lastSequence.value = -1; awaiting.value = true; phase.value = 'loading'; transitions.value = []; updates.value = []; snapshot.value = emptySnapshot(next); setStatus(copy.value.loading)
  post({ v: VALUE_FUNCTION_PROTOCOL_VERSION, runId: runKey.value, kind: 'start', config: next })
}
function dispatch(kind: 'step' | 'advance' | 'reset', count = 1): void {
  if (!worker || !runKey.value || !canCommand.value) return; awaiting.value = true
  if (kind === 'advance') post({ v: VALUE_FUNCTION_PROTOCOL_VERSION, runId: runKey.value, kind, transitions: count })
  else if (kind === 'reset') post({ v: VALUE_FUNCTION_PROTOCOL_VERSION, runId: runKey.value, kind })
  else post({ v: VALUE_FUNCTION_PROTOCOL_VERSION, runId: runKey.value, kind })
}
function run(): void { if (!canCommand.value || snapshot.value.exhausted) return; running.value = true; setStatus(copy.value.running); schedule() }
function schedule(): void { if (!running.value || awaiting.value || snapshot.value.exhausted) return; dispatch('advance', 80) }
function pause(): void { stopRun(); setStatus(copy.value.paused) }
function stopRun(): void { running.value = false; if (timer) clearTimeout(timer); timer = undefined }
function handleResponse(event: MessageEvent<ValueFunctionWorkerResponse>): void {
  const response = event.data; if (response.v !== VALUE_FUNCTION_PROTOCOL_VERSION || response.runId !== runKey.value || response.sequence <= lastSequence.value) return; lastSequence.value = response.sequence
  if (response.kind === 'error') { awaiting.value = false; if (!response.recoverable) { stopRun(); phase.value = 'error' }; setStatus(`${copy.value.failed}: ${localizedError(response.code)}`); return }
  awaiting.value = false
  if (response.kind === 'started') { snapshot.value = response.snapshot; phase.value = 'ready'; setStatus(copy.value.ready); if (running.value) schedule(); return }
  if (response.kind === 'reset') { snapshot.value = response.snapshot; transitions.value = []; updates.value = []; setStatus(copy.value.resetDone); return }
  applyOutcome(response.outcome); if (running.value && !snapshot.value.exhausted) timer = setTimeout(schedule, 90)
}
function isAdvance(outcome: ValueFunctionOutcome | ValueFunctionAdvanceOutcome): outcome is ValueFunctionAdvanceOutcome { return 'transitions' in outcome }
function applyOutcome(outcome: ValueFunctionOutcome | ValueFunctionAdvanceOutcome): void { snapshot.value = outcome.snapshot; const rows = isAdvance(outcome) ? outcome.transitions : [outcome.transition]; transitions.value = [...transitions.value, ...rows].slice(-240); updates.value = [...updates.value, ...outcome.updates].slice(-240); phase.value = 'ready' }
function modeLabel(mode: ValueFunctionMode): string { return copy.value[`mode${mode === 'td_linear' ? 'Td' : mode === 'sarsa_linear' ? 'Sarsa' : mode === 'q_learning_linear' ? 'QLearning' : 'DeepQ'}` as keyof typeof copy.value] as string }
function featureLabel(map: ValueFunctionFeatureMap): string { return copy.value[`feature${map === 'coordinates' ? 'Coordinates' : map === 'bias_coordinates' ? 'Bias' : map === 'polynomial' ? 'Polynomial' : map === 'fourier' ? 'Fourier' : 'OneHot'}` as keyof typeof copy.value] as string }
function format(value: number): string { return Number.isFinite(value) ? value.toFixed(Math.abs(value) >= 100 ? 1 : 4) : '—' }
function action(value: number): string { return value >= 0 && value < actionCount ? glyphs[value] : '—' }
function cellClass(state: number): string[] { return ['vf-state', state === selectedState.value ? 'is-selected' : '', state === 0 ? 'is-start' : '', state === 15 ? 'is-goal' : '', [6, 9].includes(state) ? 'is-hazard' : ''].filter(Boolean) }

onMounted(start)
onBeforeUnmount(() => { stopRun(); worker?.terminate(); worker = undefined })
</script>

<template>
  <section class="value-function-lab lab-shell" data-testid="value-function-lab" :data-phase="phase" :data-mode="appliedConfig.mode" :data-feature-map="appliedConfig.featureMap" :data-episode-count="snapshot.episodeCount" :data-total-steps="snapshot.totalSteps" :data-replay-size="snapshot.replaySize" :aria-busy="phase === 'loading'">
    <header class="lab-hero"><p class="lab-eyebrow">{{ copy.eyebrow }}</p><h2>{{ copy.title }}</h2><p>{{ copy.description }}</p><span class="engine-chip">{{ copy.engine }}</span></header>
    <div class="lab-status" role="status" aria-live="polite"><span class="status-dot" :data-phase="phase" />{{ status || statusLabel }}<span class="sr-only">{{ announcement }}</span></div>
    <section class="lab-controls" :aria-label="copy.controls"><div class="control-grid">
      <label>{{ copy.mode }}<select v-model="config.mode" data-vf-mode><option v-for="mode in VALUE_FUNCTION_MODES" :key="mode" :value="mode">{{ modeLabel(mode) }}</option></select></label>
      <label>{{ copy.featureMap }}<select v-model="config.featureMap" data-feature-map><option v-for="map in VALUE_FUNCTION_FEATURE_MAPS" :key="map" :value="map">{{ featureLabel(map) }}</option></select></label>
      <label>{{ copy.discount }}<input v-model.number="config.discount" type="number" min="0" max="1" step=".05" /></label>
      <label>{{ copy.alpha }}<input v-model.number="config.alpha" type="number" min=".0001" max="1" step=".001" /></label>
      <label>{{ copy.epsilon }}<input v-model.number="config.epsilon" type="range" min="0" max="1" step=".05" /><output>{{ config.epsilon.toFixed(2) }}</output></label>
      <label>{{ copy.wind }}<input v-model.number="config.slipProbability" type="range" min="0" max="1" step=".05" /><output>{{ Math.round(config.slipProbability * 100) }}%</output></label>
      <label>{{ copy.batchSize }}<input v-model.number="config.batchSize" type="number" min="1" max="256" step="1" /></label>
      <label>{{ copy.targetInterval }}<input v-model.number="config.targetUpdateInterval" type="number" min="1" max="10000" step="1" /></label>
      <label>{{ copy.replayCapacity }}<input v-model.number="config.replayCapacity" type="number" min="1" max="10000" step="1" /></label>
      <label>{{ copy.maxEpisodes }}<input v-model.number="config.maxEpisodes" type="number" min="1" max="100000" step="1" /></label>
      <label>{{ copy.seed }}<input v-model="config.seedHex" spellcheck="false" /></label>
    </div><p v-if="validation" class="validation-message" role="alert">{{ copy.validation }}: {{ localizedError(validation.code) }}</p><div class="control-actions"><button type="button" class="action-button action-button--primary" :disabled="phase === 'loading'" @click="start">{{ copy.apply }}</button><button type="button" class="action-button" :disabled="!canCommand" @click="dispatch('step')">{{ copy.step }}</button><button type="button" class="action-button" :disabled="!canCommand" @click="dispatch('advance', 25)">{{ copy.advance }}</button><button type="button" class="action-button" :disabled="phase !== 'ready' || (awaiting && !running)" @click="running ? pause() : run()">{{ running ? copy.pause : copy.run }}</button><button type="button" class="action-button" :disabled="!canCommand" @click="dispatch('reset')">{{ copy.reset }}</button></div></section>
    <div class="metric-grid"><article><span>{{ copy.episodes }}</span><strong>{{ snapshot.episodeCount }}</strong></article><article><span>{{ copy.updates }}</span><strong>{{ snapshot.updateCount }}</strong></article><article><span>{{ copy.prediction }}</span><strong>{{ format(snapshot.lastPrediction) }}</strong></article><article><span>{{ copy.target }}</span><strong>{{ format(snapshot.lastTarget) }}</strong></article><article><span>{{ copy.loss }}</span><strong>{{ format(snapshot.lastLoss) }}</strong></article><article><span>{{ copy.replay }}</span><strong>{{ snapshot.replaySize }}</strong></article><article><span>{{ copy.targetSyncs }}</span><strong>{{ snapshot.targetSyncCount }}</strong></article></div>
    <div class="vf-layout"><section class="lab-card"><div class="card-heading"><h3>{{ copy.grid }}</h3><span>{{ copy.clickCell }}</span></div><div class="vf-grid" role="grid" :aria-label="copy.grid"><button v-for="state in stateCount" :key="state - 1" type="button" :class="cellClass(state - 1)" role="gridcell" @click="selectedState = state - 1"><span>s{{ state - 1 }}</span><strong>{{ format(snapshot.values[state - 1] ?? 0) }}</strong><small>{{ action(snapshot.policy[state - 1] ?? -1) }}</small></button></div></section><section class="lab-card"><div class="card-heading"><h3>{{ copy.chart }}</h3><span>{{ appliedConfig.featureMap }}</span></div><svg viewBox="0 0 560 150" role="img" :aria-label="copy.chart"><line x1="18" y1="132" x2="542" y2="132" class="chart-axis" /><polyline :points="chart.points" class="chart-line" /><circle v-for="(value, index) in snapshot.values" :key="index" :cx="18 + index / (snapshot.values.length - 1) * 524" :cy="18 + (chart.max - value) / Math.max(chart.max - chart.min, 1e-9) * 114" r="2.5" class="chart-dot" /></svg></section></div>
    <section class="lab-card"><div class="card-heading"><h3>{{ copy.inspector }}</h3><span>s{{ snapshot.lastState }}, a{{ snapshot.lastAction }}</span></div><div class="inspector-grid"><div><span>{{ copy.selectedValue }}</span><strong>{{ format(selectedValue) }}</strong></div><div><span>{{ copy.featureVector }}</span><strong class="feature-vector">[{{ selectedFeatures.slice(0, snapshot.featureCount).map(format).join(', ') }}]</strong></div><div><span>{{ copy.gradient }}</span><strong>{{ format(snapshot.lastGradientNorm) }}</strong></div><div><span>{{ copy.updateNorm }}</span><strong>{{ format(snapshot.lastUpdateNorm) }}</strong></div></div><p class="equation-audit"><code>θ ← θ + α · ({{ format(snapshot.lastTarget) }} − {{ format(snapshot.lastPrediction) }}) · φ(s)</code></p></section>
    <section class="lab-card"><div class="card-heading"><h3>{{ copy.trace }}</h3><span>{{ transitions.length }} / 240</span></div><div class="table-wrap"><table><thead><tr><th>t</th><th>{{ copy.state }}</th><th>{{ copy.action }}</th><th>{{ copy.reward }}</th><th>{{ copy.nextState }}</th><th>{{ copy.target }}</th><th>{{ copy.loss }}</th></tr></thead><tbody><tr v-for="(row, index) in transitions.slice(-40)" :key="`${row.episodeStep}-${index}`"><td>{{ row.episodeStep }}</td><td>s{{ row.state }}</td><td>{{ action(row.action) }}</td><td>{{ format(row.reward) }}</td><td>s{{ row.nextState }}</td><td>{{ format(updates.at(-(transitions.length - index))?.target ?? 0) }}</td><td>{{ format(updates.at(-(transitions.length - index))?.loss ?? 0) }}</td></tr><tr v-if="transitions.length === 0"><td colspan="7">{{ copy.noTrace }}</td></tr></tbody></table></div></section>
    <div class="lab-audit"><strong>{{ copy.auditTitle }}</strong><span>✓ {{ copy.auditFeatures }}</span><span>✓ {{ copy.auditGeneralization }}</span><span>✓ {{ copy.auditDqn }}</span></div>
  </section>
</template>

<style scoped>
.value-function-lab { --lab-accent: #5b4bb7; }.vf-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.5rem; max-width:34rem; }.vf-state { min-height:5rem; border:1px solid var(--vp-c-divider); border-radius:.7rem; background:var(--vp-c-bg-soft); color:inherit; text-align:left; padding:.5rem; cursor:pointer; display:flex; flex-direction:column; gap:.2rem; }.vf-state:hover,.vf-state.is-selected { border-color:var(--lab-accent); box-shadow:0 0 0 2px color-mix(in srgb,var(--lab-accent) 20%,transparent); }.vf-state.is-goal { background:color-mix(in srgb,#e5b94e 20%,var(--vp-c-bg-soft)); }.vf-state.is-hazard { background:color-mix(in srgb,#e76f51 14%,var(--vp-c-bg-soft)); }.vf-state span,.vf-state small {font-size:.75rem;opacity:.7}.vf-state strong{font-size:1rem}.vf-state small{margin-top:auto;font-size:1.1rem}.vf-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:1rem;margin:1rem 0}.inspector-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}.inspector-grid div{padding:.7rem;background:var(--vp-c-bg-soft);border-radius:.6rem}.inspector-grid span{display:block;font-size:.78rem;opacity:.72}.inspector-grid strong{display:block;margin-top:.3rem;overflow-wrap:anywhere}.feature-vector{font-size:.76rem}.equation-audit{margin:.9rem 0 0;padding:.7rem;background:color-mix(in srgb,var(--lab-accent) 8%,var(--vp-c-bg-soft));border-radius:.5rem;overflow:auto}.chart-axis{stroke:var(--vp-c-divider);stroke-width:1}.chart-line{fill:none;stroke:var(--lab-accent);stroke-width:2.5}.chart-dot{fill:var(--lab-accent)}@media(max-width:760px){.vf-layout{grid-template-columns:1fr}.inspector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
