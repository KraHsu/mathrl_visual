<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  STOCHASTIC_APPROXIMATION_MODES,
  STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
  STOCHASTIC_APPROXIMATION_ROOT_FUNCTIONS,
  STOCHASTIC_APPROXIMATION_SCHEDULES,
  acceptsStochasticApproximationResponse,
  canonicalStochasticApproximationMode,
  canonicalStochasticApproximationRootFunction,
  canonicalStochasticApproximationSchedule,
  stochasticApproximationConfigValidationError,
  type StochasticApproximationConfig,
  type StochasticApproximationMode,
  type StochasticApproximationRootFunction,
  type StochasticApproximationSchedule,
  type StochasticApproximationSnapshot,
  type StochasticApproximationWorkerRequest,
  type StochasticApproximationWorkerResponse,
} from '../stochasticApproximationProtocol'
import { stochasticApproximationMessagesFor } from '../i18n/stochasticApproximationMessages'
import type { Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })
const copy = computed(() => stochasticApproximationMessagesFor(props.locale))

const baselineConfig: StochasticApproximationConfig = {
  mode: 'mean',
  schedule: 'harmonic',
  rootFunction: 'linear',
  target: 1,
  initialW: 0,
  alpha: 0.8,
  polynomialPower: 1,
  noiseStd: 0.25,
  sampleCount: 200,
  batchSize: 1,
  tolerance: 1e-3,
  seedHex: '5eed',
}

const config = reactive<StochasticApproximationConfig>({ ...baselineConfig })
const appliedConfig = ref<StochasticApproximationConfig>({ ...baselineConfig })
const snapshot = ref<StochasticApproximationSnapshot>(emptySnapshot(baselineConfig))
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const running = ref(false)
const awaiting = ref(false)
const errorMessage = ref('')
const workerFailure = ref('')
const announcement = ref('')
const visualStatus = ref('')
const engineVersion = ref('')
const currentRunId = ref('')
const lastSequence = ref(-1)
const runRemaining = ref(0)

// Keep each response small enough to leave the controls responsive while
// allowing a user-selected budget (up to 100,000 updates) to finish. The
// timer between chunks also gives the Pause button a reliable interaction
// point before the next Worker request.
const RUN_CHUNK_SIZE = 100
const RUN_YIELD_MS = 16
const DEMO_RUN_CHUNK_SIZE = 50
const DEMO_RUN_YIELD_MS = 80

let worker: Worker | undefined
let runTimer: ReturnType<typeof setTimeout> | undefined

const modes = STOCHASTIC_APPROXIMATION_MODES
const schedules = STOCHASTIC_APPROXIMATION_SCHEDULES
const rootFunctions = STOCHASTIC_APPROXIMATION_ROOT_FUNCTIONS

const configValidation = computed(() => stochasticApproximationConfigValidationError(config))
const history = computed(() => snapshot.value.history ?? [])
const recentHistory = computed(() => history.value.slice(-12))
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.loading
  if (phase.value === 'error') return copy.value.failed
  if (running.value) return copy.value.run
  if (snapshot.value.exhausted) return copy.value.exhausted
  if (snapshot.value.truncated) return copy.value.truncated
  if (snapshot.value.converged) return copy.value.converged
  return copy.value.ready
})

const modeLabel = computed(() => messageForMode(snapshot.value.mode || config.mode))

const chartValues = computed(() => {
  const values = history.value.map((row) => row.wAfter).filter(Number.isFinite)
  if (values.length === 0) return [snapshot.value.initialW]
  // The core keeps a bounded recent window. When it has slid, start the
  // polyline at the first retained row rather than drawing a fictitious jump
  // from the original initial value.
  const start = (history.value[0]?.index ?? 1) > 1
    ? history.value[0]?.wBefore
    : snapshot.value.initialW
  return [Number.isFinite(start) ? start : snapshot.value.initialW, ...values]
})

const chartDomain = computed(() => {
  const values = [...chartValues.value, snapshot.value.target].filter(Number.isFinite)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = Math.max(maximum - minimum, 1e-9)
  const pad = Math.max(span * 0.08, 0.05)
  return { min: minimum - pad, max: maximum + pad }
})

const chartY = (value: number): number => {
  const domain = chartDomain.value
  const ratio = (value - domain.min) / Math.max(domain.max - domain.min, 1e-9)
  return 166 - ratio * 148
}

const chartPoints = computed(() => {
  const values = chartValues.value
  const width = 560
  const padX = 18
  return values
    .map((value, index) => {
      const x = padX + (index / Math.max(values.length - 1, 1)) * (width - padX * 2)
      return `${x.toFixed(2)},${chartY(value).toFixed(2)}`
    })
    .join(' ')
})

const targetY = computed(() => chartY(snapshot.value.target))
const chartSummary = computed(() => {
  if (history.value.length === 0) return copy.value.ready
  return `${copy.value.chartLabel}: ${format(snapshot.value.initialW)} → ${format(snapshot.value.currentW)}`
})

const presets: Record<string, Partial<StochasticApproximationConfig>> = {
  mean: { mode: 'mean', schedule: 'harmonic', rootFunction: 'linear', noiseStd: 0.2, batchSize: 1 },
  rm: { mode: 'robbins_monro', schedule: 'harmonic', rootFunction: 'tanh', noiseStd: 0.15, batchSize: 1 },
  sgd: { mode: 'sgd', schedule: 'constant', rootFunction: 'linear', noiseStd: 0.3, batchSize: 1 },
  batch: { mode: 'batch_gradient', schedule: 'constant', rootFunction: 'linear', noiseStd: 0.3 },
}

function emptySnapshot(source: StochasticApproximationConfig): StochasticApproximationSnapshot {
  return {
    mode: source.mode,
    schedule: source.schedule,
    rootFunction: source.rootFunction,
    target: source.target,
    root: source.target,
    initialW: source.initialW,
    currentW: source.initialW,
    w: source.initialW,
    alpha: source.alpha,
    polynomialPower: source.polynomialPower,
    noiseStd: source.noiseStd,
    sampleCount: source.sampleCount,
    batchSize: source.batchSize,
    datasetSize: 0,
    tolerance: source.tolerance,
    seedHex: source.seedHex,
    iterationCount: 0,
    alphaSum: 0,
    alphaSquaredSum: 0,
    noiseSum: 0,
    noiseMean: 0,
    noiseVariance: 0,
    error: source.initialW - source.target,
    rootResidual: source.initialW - source.target,
    absoluteError: Math.abs(source.initialW - source.target),
    objective: 0.5 * (source.initialW - source.target) ** 2,
    loss: 0.5 * (source.initialW - source.target) ** 2,
    stepSizeConditions: source.schedule === 'harmonic'
      || (source.schedule === 'polynomial' && source.polynomialPower > 0.5 && source.polynomialPower <= 1),
    converged: Math.abs(source.initialW - source.target) <= source.tolerance,
    truncated: false,
    exhausted: false,
    history: [],
  }
}

function newRunId(): string {
  return `ch06-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function post(kind: StochasticApproximationWorkerRequest['kind'], payload: Record<string, unknown> = {}): void {
  if (!worker) return
  worker.postMessage({
    v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind,
    ...payload,
  } as StochasticApproximationWorkerRequest)
}

function start(): void {
  // Do not let repeated clicks race session initialization. A stale start
  // response is correctly ignored by the protocol, but the discarded request
  // would otherwise leave the UI waiting for a run that can never complete.
  if (currentRunId.value && (phase.value === 'loading' || awaiting.value || running.value)) return
  stopRun()
  awaiting.value = false
  errorMessage.value = ''
  workerFailure.value = ''
  engineVersion.value = ''

  const nextConfig: StochasticApproximationConfig = {
    ...config,
    mode: canonicalStochasticApproximationMode(config.mode) ?? config.mode,
    schedule: canonicalStochasticApproximationSchedule(config.schedule) ?? config.schedule,
    rootFunction: canonicalStochasticApproximationRootFunction(config.rootFunction) ?? config.rootFunction,
  }
  const validation = stochasticApproximationConfigValidationError(nextConfig)
  if (validation) {
    phase.value = 'error'
    errorMessage.value = validation.message
    setStatus(`${copy.value.validation}: ${validation.message}`)
    return
  }
  if (!worker && !createWorker()) return

  currentRunId.value = newRunId()
  lastSequence.value = -1
  appliedConfig.value = { ...nextConfig }
  snapshot.value = emptySnapshot(nextConfig)
  phase.value = 'loading'
  setStatus(copy.value.loading)
  post('start', { config: nextConfig, restoreIterations: 0 })
}

function createWorker(): boolean {
  const markWorkerFailed = (next: Worker, message: string): void => {
    if (worker !== next) return
    stopRun()
    awaiting.value = false
    phase.value = 'error'
    workerFailure.value = message
    errorMessage.value = message
    setStatus(copy.value.failed)
    next.terminate()
    worker = undefined
  }
  try {
    const next = new Worker(new URL('../workers/stochastic-approximation.worker.ts', import.meta.url), {
      type: 'module',
    })
    next.addEventListener('message', handleResponse)
    next.addEventListener('error', (event) => {
      markWorkerFailed(next, event.message || 'Worker failed to execute')
    })
    next.addEventListener('messageerror', () => {
      markWorkerFailed(next, 'Worker message could not be decoded')
    })
    worker = next
    return true
  } catch (error) {
    phase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : String(error)
    setStatus(copy.value.failed)
    return false
  }
}

function handleResponse(event: MessageEvent<StochasticApproximationWorkerResponse>): void {
  const response = event.data
  if (!acceptsStochasticApproximationResponse(response, currentRunId.value, lastSequence.value)) return
  lastSequence.value = response.sequence

  if (response.kind === 'error') {
    awaiting.value = false
    stopRun()
    errorMessage.value = response.message
    phase.value = response.recoverable ? 'ready' : 'error'
    setStatus(response.recoverable ? `${copy.value.validation}: ${response.message}` : copy.value.failed)
    return
  }

  awaiting.value = false
  if (response.kind === 'started') {
    snapshot.value = response.snapshot
    phase.value = 'ready'
    engineVersion.value = response.engineVersion
    errorMessage.value = ''
    setStatus(copy.value.ready)
    return
  }

  const outcome = response.outcome
  const wasRunning = running.value
  snapshot.value = outcome.snapshot
  errorMessage.value = ''
  if (response.kind === 'advanced' && wasRunning) {
    const consumed = 'iterations' in outcome ? outcome.iterations.length : 0
    runRemaining.value = Math.max(0, runRemaining.value - consumed)
    if (snapshot.value.exhausted || snapshot.value.truncated || runRemaining.value <= 0) {
      stopRun()
    }
  } else if (response.kind === 'reset') {
    stopRun()
  }
  if (snapshot.value.exhausted || snapshot.value.truncated) stopRun()
  phase.value = 'ready'
  if (response.kind === 'reset') {
    setStatus(copy.value.ready)
  } else if (running.value) {
    setStatus(copy.value.run, false)
    scheduleRunChunk()
  } else {
    setStatus(statusLabel.value, false)
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
  post('advance', { iterations: 25 })
}

function run(): void {
  if (phase.value !== 'ready' || awaiting.value || snapshot.value.exhausted) return
  running.value = true
  runRemaining.value = Math.max(0, appliedConfig.value.sampleCount - snapshot.value.iterationCount)
  setStatus(copy.value.run)
  dispatchRunChunk()
}

function pause(): void {
  if (!running.value) return
  stopRun()
  setStatus(copy.value.ready)
}

function dispatchRunChunk(): void {
  if (
    !running.value
    || phase.value !== 'ready'
    || awaiting.value
    || runRemaining.value <= 0
    || snapshot.value.exhausted
  ) {
    if (running.value && (runRemaining.value <= 0 || snapshot.value.exhausted)) {
      stopRun()
      setStatus(statusLabel.value, false)
    }
    return
  }
  awaiting.value = true
  // Keep the default 200-update lesson paced so readers can reliably pause
  // between visible chunks. Larger custom budgets use tighter yielding.
  const demoPacing = runRemaining.value <= 500
  const chunkSize = demoPacing ? DEMO_RUN_CHUNK_SIZE : RUN_CHUNK_SIZE
  post('advance', { iterations: Math.min(chunkSize, runRemaining.value) })
}

function scheduleRunChunk(): void {
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
  if (!running.value) return
  const delay = runRemaining.value <= 500 ? DEMO_RUN_YIELD_MS : RUN_YIELD_MS
  runTimer = setTimeout(() => {
    runTimer = undefined
    dispatchRunChunk()
  }, delay)
}

function stopRun(): void {
  running.value = false
  runRemaining.value = 0
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
}

function reset(): void {
  if (phase.value !== 'ready' || awaiting.value) return
  awaiting.value = true
  post('reset', { seedHex: config.seedHex })
}

function applyPreset(name: string): void {
  if (phase.value === 'loading' || awaiting.value || running.value) return
  const preset = presets[name]
  if (!preset) return
  Object.assign(config, preset)
  if (name === 'batch') config.batchSize = Math.min(256, Math.max(1, Math.trunc(config.sampleCount)))
  start()
}

function onPresetChange(event: Event): void {
  applyPreset((event.target as HTMLSelectElement).value)
}

function format(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1000) return value.toExponential(2)
  return value.toFixed(4)
}

function messageForMode(mode: StochasticApproximationMode): string {
  const keys: Record<StochasticApproximationMode, keyof typeof copy.value> = {
    mean: 'modeMean',
    robbins_monro: 'modeRobbinsMonro',
    sgd: 'modeSgd',
    mini_batch: 'modeMiniBatch',
    batch_gradient: 'modeBatchGradient',
  }
  return copy.value[keys[mode]] as string
}

function messageForRoot(root: StochasticApproximationRootFunction): string {
  const keys: Record<StochasticApproximationRootFunction, keyof typeof copy.value> = {
    linear: 'linear',
    tanh: 'tanh',
    cubic: 'cubic',
  }
  return copy.value[keys[root]] as string
}

function messageForSchedule(schedule: StochasticApproximationSchedule): string {
  return copy.value[schedule] as string
}

function flag(value: boolean): string {
  return value ? copy.value.yes : copy.value.no
}

function setStatus(message: string, announce = true): void {
  visualStatus.value = message
  if (announce) announcement.value = message
}

onMounted(() => {
  start()
})

onBeforeUnmount(() => {
  stopRun()
  worker?.terminate()
  worker = undefined
})

watch(() => props.locale, () => {
  if (visualStatus.value) setStatus(visualStatus.value, false)
})
</script>

<template>
  <section
    class="lab-shell stochastic-approximation-lab"
    data-testid="stochastic-approximation-lab"
    :data-phase="phase"
    :data-running="running"
    :data-iteration="snapshot.iterationCount"
    :aria-busy="phase === 'loading' || awaiting"
  >
    <header class="lab-hero">
      <p class="lab-eyebrow">{{ copy.eyebrow }}</p>
      <h2>{{ copy.title }}</h2>
      <p>{{ copy.description }}</p>
      <span class="engine-chip" :data-phase="phase">
        {{ phase === 'loading' ? copy.loading : phase === 'error' ? copy.failed : copy.engine }}
        <span v-if="engineVersion"> · {{ engineVersion }}</span>
      </span>
    </header>

    <p class="sa-status" role="status" aria-live="polite">
      {{ visualStatus || statusLabel }}
      <span class="sr-only">{{ announcement }}</span>
    </p>

    <div class="lab-grid">
      <aside class="lab-panel">
        <h2>{{ copy.controls }}</h2>

        <label>
          <span>{{ copy.preset }}</span>
          <select :aria-label="copy.preset" :disabled="phase === 'loading' || awaiting || running" @change="onPresetChange">
            <option value="mean">{{ copy.presetMean }}</option>
            <option value="rm">{{ copy.presetRobbinsMonro }}</option>
            <option value="sgd">{{ copy.presetSgd }}</option>
            <option value="batch">{{ copy.presetBatch }}</option>
          </select>
        </label>

        <label>
          <span>{{ copy.mode }}</span>
          <select v-model="config.mode" :aria-label="copy.mode">
            <option v-for="mode in modes" :key="mode" :value="mode">{{ messageForMode(mode) }}</option>
          </select>
        </label>

        <label>
          <span>{{ copy.schedule }}</span>
          <select v-model="config.schedule" :aria-label="copy.schedule">
            <option v-for="schedule in schedules" :key="schedule" :value="schedule">
              {{ messageForSchedule(schedule) }}
            </option>
          </select>
        </label>

        <label>
          <span>{{ copy.rootFunction }}</span>
          <select v-model="config.rootFunction" :aria-label="copy.rootFunction">
            <option v-for="root in rootFunctions" :key="root" :value="root">{{ messageForRoot(root) }}</option>
          </select>
        </label>

        <label>
          <span>{{ copy.target }}</span>
          <input v-model.number="config.target" :aria-label="copy.target" type="number" step="0.1" />
        </label>
        <label>
          <span>{{ copy.initialW }}</span>
          <input v-model.number="config.initialW" :aria-label="copy.initialW" type="number" step="0.1" />
        </label>
        <label>
          <span>{{ copy.alpha }}</span>
          <input v-model.number="config.alpha" :aria-label="copy.alpha" type="number" min="0.001" max="10" step="0.01" />
        </label>
        <label>
          <span>{{ copy.polynomialPower }}</span>
          <input v-model.number="config.polynomialPower" :aria-label="copy.polynomialPower" type="number" min="0.01" max="4" step="0.05" />
        </label>
        <label>
          <span>{{ copy.noiseStd }}</span>
          <input v-model.number="config.noiseStd" :aria-label="copy.noiseStd" type="number" min="0" step="0.05" />
        </label>
        <label>
          <span>{{ copy.sampleCount }}</span>
          <input v-model.number="config.sampleCount" :aria-label="copy.sampleCount" type="number" min="1" max="100000" step="1" />
        </label>
        <label>
          <span>{{ copy.batchSize }}</span>
          <input v-model.number="config.batchSize" :aria-label="copy.batchSize" type="number" min="1" max="256" step="1" />
        </label>
        <label>
          <span>{{ copy.tolerance }}</span>
          <input v-model.number="config.tolerance" :aria-label="copy.tolerance" type="number" min="0.000001" step="0.001" />
        </label>
        <label>
          <span>{{ copy.seed }}</span>
          <input v-model.trim="config.seedHex" :aria-label="copy.seed" type="text" inputmode="text" />
        </label>

        <div class="lab-actions">
          <button class="lab-button lab-button--primary" data-testid="sa-apply" type="button" :disabled="phase === 'loading' || awaiting || running" @click="start">
            {{ copy.apply }}
          </button>
          <button class="lab-button" data-testid="sa-step" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="step">
            {{ copy.step }}
          </button>
          <button class="lab-button" data-testid="sa-advance" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="advance">
            {{ copy.advance }}
          </button>
          <button class="lab-button" data-testid="sa-run" type="button" :disabled="phase !== 'ready' || (awaiting && !running)" @click="running ? pause() : run()">
            {{ running ? copy.pause : copy.run }}
          </button>
          <button class="lab-button" data-testid="sa-reset" type="button" :disabled="phase !== 'ready' || awaiting || running" @click="reset">
            {{ copy.reset }}
          </button>
        </div>

        <p v-if="configValidation" class="lab-error" role="alert">{{ copy.validation }}: {{ configValidation.message }}</p>
        <p v-if="errorMessage && !configValidation" class="lab-error" role="alert">{{ errorMessage }}</p>
        <p v-if="workerFailure" class="lab-error" role="alert">{{ copy.failed }}: {{ workerFailure }}</p>
      </aside>

      <div class="lab-panel">
        <h2>{{ copy.trajectory }}</h2>
        <div class="metric-strip" data-testid="sa-metrics">
          <div><span>{{ copy.iteration }}</span><strong>{{ snapshot.iterationCount }}</strong></div>
          <div><span>{{ copy.currentW }}</span><strong>{{ format(snapshot.currentW) }}</strong></div>
          <div><span>{{ copy.error }}</span><strong>{{ format(snapshot.error) }}</strong></div>
          <div><span>{{ copy.objective }}</span><strong>{{ format(snapshot.objective) }}</strong></div>
        </div>

        <svg class="sa-chart" viewBox="0 0 560 180" role="img" :aria-label="chartSummary">
          <line class="sa-chart__axis" x1="18" y1="166" x2="542" y2="166" />
          <line class="sa-chart__target" x1="18" :y1="targetY" x2="542" :y2="targetY" />
          <polyline v-if="chartPoints" :points="chartPoints" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
        </svg>

        <div class="chart-caption" aria-live="polite">{{ modeLabel }} · {{ chartSummary }}</div>

        <div class="mini-table-wrap">
          <table class="mini-table" data-testid="sa-trace">
            <caption>{{ copy.trajectory }}</caption>
            <thead>
              <tr>
                <th scope="col">{{ copy.tableIteration }}</th>
                <th scope="col">{{ copy.tableBefore }}</th>
                <th scope="col">{{ copy.tableAfter }}</th>
                <th scope="col">{{ copy.tableAlpha }}</th>
                <th scope="col">{{ copy.tableObservation }}</th>
                <th scope="col">{{ copy.tableGradient }}</th>
                <th scope="col">{{ copy.tableNoise }}</th>
                <th scope="col">{{ copy.tableUpdate }}</th>
                <th scope="col">{{ copy.tableBatch }}</th>
                <th scope="col">{{ copy.projected }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in recentHistory" :key="row.index" :data-iteration="row.index">
                <td>{{ row.index }}</td>
                <td>{{ format(row.wBefore) }}</td>
                <td>{{ format(row.wAfter) }}</td>
                <td>{{ format(row.alpha) }}</td>
                <td>{{ format(row.observation) }}</td>
                <td>{{ format(row.gradient) }}</td>
                <td>{{ format(row.noise) }}</td>
                <td>{{ format(row.update) }}</td>
                <td>{{ row.batchSize }}<small v-if="row.batchIndices.length"> [{{ row.batchIndices.join(', ') }}]</small></td>
                <td>{{ row.projected ? copy.yes : copy.no }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <aside class="concept-callout sa-diagnostics" data-testid="sa-diagnostics">
      <strong>{{ copy.diagnostics }}</strong>
      <div class="sa-diagnostic-grid">
        <span>{{ copy.alphaSum }} <b>{{ format(snapshot.alphaSum) }}</b></span>
        <span>{{ copy.alphaSquaredSum }} <b>{{ format(snapshot.alphaSquaredSum) }}</b></span>
        <span>{{ copy.noiseMean }} <b>{{ format(snapshot.noiseMean) }}</b></span>
        <span>{{ copy.noiseVariance }} <b>{{ format(snapshot.noiseVariance) }}</b></span>
      </div>
      <div class="sa-flags">
        <span>{{ copy.stepSizeConditions }}: <b>{{ flag(snapshot.stepSizeConditions) }}</b></span>
        <span>{{ copy.converged }}: <b>{{ flag(snapshot.converged) }}</b></span>
        <span>{{ copy.exhausted }}: <b>{{ flag(snapshot.exhausted) }}</b></span>
        <span>{{ copy.truncated }}: <b>{{ flag(snapshot.truncated) }}</b></span>
      </div>
      <p>{{ copy.modelFreeAudit }}</p>
      <p>{{ copy.finiteRunNote }}</p>
    </aside>
  </section>
</template>
