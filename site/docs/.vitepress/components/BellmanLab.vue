<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  BELLMAN_PROTOCOL_VERSION,
  acceptsBellmanResponse,
  bellmanConfigValidationError,
  type BellmanAdvanceOutcome,
  type BellmanConfig,
  type BellmanSnapshot,
  type BellmanSweepOutcome,
  type BellmanTerm,
  type BellmanTransition,
  type BellmanValueUpdate,
  type BellmanWorkerRequest,
  type BellmanWorkerResponse,
} from '../bellmanProtocol'
import { bellmanMessagesFor } from '../i18n/bellmanMessages'
import { interpolate, type Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'en',
})

type BellmanMode = 'backup' | 'dependencies' | 'matrix' | 'convergence' | 'audit'

const storageVersion = 1
const storageKey = `mathrl:exp-ch02-bellman:v${storageVersion}`
const stateCount = 4
const stateIndexes = [0, 1, 2, 3]
const copy = computed(() => bellmanMessagesFor(props.locale))

const modeOptions: Array<{
  value: BellmanMode
  key: 'modeBackup' | 'modeDependencies' | 'modeMatrix' | 'modeConvergence' | 'modeAudit'
}> = [
  { value: 'backup', key: 'modeBackup' },
  { value: 'dependencies', key: 'modeDependencies' },
  { value: 'matrix', key: 'modeMatrix' },
  { value: 'convergence', key: 'modeConvergence' },
  { value: 'audit', key: 'modeAudit' },
]

const config = reactive<BellmanConfig>({
  discount: 0.9,
  tolerance: 0.001,
  maxSweeps: 200,
})
const appliedConfig = ref<BellmanConfig>(cloneConfig(config))
const snapshot = ref<BellmanSnapshot>(emptySnapshot())
const model = ref<BellmanTransition[]>([])
const exactValues = ref<number[]>([0, 0, 0, 0])
const updates = ref<BellmanValueUpdate[]>([])
const residualHistory = ref<number[]>([])
const mode = ref<BellmanMode>('backup')
const selectedState = ref(0)
const speedMs = ref(350)
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const announcement = ref('')
const visualStatus = ref('')
const prefersReducedMotion = ref(false)
const engineVersion = ref('')
const currentRunId = ref('')
const lastSequence = ref(-1)
const awaitingSweep = ref(false)
const running = ref(false)
let worker: Worker | undefined
let pendingConfig: BellmanConfig | undefined
let runTimer: ReturnType<typeof setTimeout> | undefined
let motionPreference: MediaQueryList | undefined
let pauseRequested = false

const canRestart = computed(() => phase.value !== 'loading' && !awaitingSweep.value)
const canReset = computed(() => phase.value === 'ready' && !awaitingSweep.value)
const canSweep = computed(
  () =>
    phase.value === 'ready' &&
    !awaitingSweep.value &&
    !snapshot.value.converged &&
    !snapshot.value.truncated,
)
const configValidation = computed(() => bellmanConfigValidationError(config))
const discountInvalid = computed(
  () => configValidation.value?.code === 'evaluation_discount_range',
)
const toleranceInvalid = computed(
  () => configValidation.value?.code === 'evaluation_tolerance_range',
)
const maxSweepsInvalid = computed(
  () => configValidation.value?.code === 'evaluation_max_sweeps_range',
)
const validationDescription = computed(() =>
  configValidation.value
    ? `${copy.value.errorPrefix} ${localizedError(configValidation.value.code)}`
    : '',
)
const selectedUpdate = computed(
  () => updates.value.find((update) => update.state === selectedState.value),
)
const selectedTransitions = computed(() =>
  model.value.filter((transition) => transition.state === selectedState.value),
)
const displayTerms = computed<BellmanTerm[]>(() => {
  if (selectedUpdate.value) return selectedUpdate.value.terms
  return selectedTransitions.value.map((transition) => {
    const nextValue = snapshot.value.values[transition.nextState] ?? 0
    const discountedNextValue = appliedConfig.value.discount * nextValue
    return {
      nextState: transition.nextState,
      probability: transition.probability,
      reward: transition.reward,
      nextValue,
      discountedNextValue,
      contribution: transition.probability * (transition.reward + discountedNextValue),
    }
  })
})
const backupTotal = computed(() =>
  displayTerms.value.reduce((total, term) => total + term.contribution, 0),
)
const transitionMatrix = computed(() =>
  stateIndexes.map((state) =>
    stateIndexes.map((nextState) =>
      model.value
        .filter((transition) => transition.state === state && transition.nextState === nextState)
        .reduce((total, transition) => total + transition.probability, 0),
    ),
  ),
)
const expectedRewards = computed(() =>
  stateIndexes.map((state) =>
    model.value
      .filter((transition) => transition.state === state)
      .reduce(
        (total, transition) => total + transition.probability * transition.reward,
        0,
      ),
  ),
)
const locallyComputedResidual = computed(() => residualFor(snapshot.value.values))
const exactResidual = computed(() => residualFor(exactValues.value))
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.statusLoading
  if (phase.value === 'error') return copy.value.statusError
  if (snapshot.value.converged) return copy.value.statusConverged
  if (snapshot.value.truncated) return copy.value.statusTruncated
  return copy.value.statusReady
})
const auditItems = computed(() => [
  {
    label: copy.value.auditRows,
    pass:
      model.value.length === 7 &&
      transitionMatrix.value.every(
        (row) => Math.abs(row.reduce((sum, probability) => sum + probability, 0) - 1) < 1e-12,
      ),
  },
  {
    label: copy.value.auditFinite,
    pass:
      Number.isFinite(snapshot.value.residual) &&
      snapshot.value.values.every(Number.isFinite) &&
      exactValues.value.every(Number.isFinite),
  },
  {
    label: copy.value.auditSnapshotResidual,
    pass: Math.abs(locallyComputedResidual.value - snapshot.value.residual) < 1e-10,
  },
  {
    label: copy.value.auditExactResidual,
    pass: exactResidual.value < 1e-10,
  },
  { label: copy.value.auditScope, pass: true },
])
const chartPoints = computed(() => {
  if (residualHistory.value.length === 0) return ''
  const width = 420
  const height = 130
  const padding = 12
  const logs = residualHistory.value.map((value) => Math.log10(Math.max(value, 1e-12)))
  const maximum = Math.max(...logs)
  const minimum = Math.min(...logs)
  const range = Math.max(maximum - minimum, 1)
  const denominator = Math.max(logs.length - 1, 1)
  return logs
    .map((value, index) => {
      const x = padding + (index / denominator) * (width - padding * 2)
      const y = padding + ((maximum - value) / range) * (height - padding * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

function cloneConfig(source: BellmanConfig): BellmanConfig {
  return { ...source }
}

function emptySnapshot(): BellmanSnapshot {
  return {
    values: [0, 0, 0, 0],
    sweepCount: 0,
    residual: 0,
    converged: false,
    truncated: false,
  }
}

function newRunId(): string {
  return `ch02-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function post(request: BellmanWorkerRequest): void {
  worker?.postMessage(request)
}

function setStatus(message: string, announce = true): void {
  visualStatus.value = message
  if (announce) announcement.value = message
}

function pausedMessage(): string {
  return interpolate(copy.value.paused, {
    sweep: snapshot.value.sweepCount,
    residual: formatNumber(snapshot.value.residual),
  })
}

function updateMotionPreference(event?: MediaQueryListEvent): void {
  prefersReducedMotion.value = event?.matches ?? motionPreference?.matches ?? false
}

function createWorker(): boolean {
  let nextWorker: Worker
  try {
    nextWorker = new Worker(new URL('../workers/bellman.worker.ts', import.meta.url), {
      type: 'module',
    })
  } catch {
    awaitingSweep.value = false
    pendingConfig = undefined
    phase.value = 'error'
    worker = undefined
    setStatus(copy.value.failed)
    return false
  }
  nextWorker.addEventListener('message', handleResponse)
  nextWorker.addEventListener('error', () => {
    if (worker !== nextWorker) return
    pause()
    awaitingSweep.value = false
    pendingConfig = undefined
    phase.value = 'error'
    setStatus(copy.value.failed)
    nextWorker.terminate()
    worker = undefined
  })
  worker = nextWorker
  return true
}

function start(restoreSweeps = 0): void {
  pause()
  const nextConfig = cloneConfig(config)
  const validationError = bellmanConfigValidationError(nextConfig)
  if (validationError) {
    awaitingSweep.value = false
    pendingConfig = undefined
    phase.value = 'error'
    setStatus(`${copy.value.errorPrefix} ${localizedError(validationError.code)}`)
    return
  }
  if (!worker && !createWorker()) return
  pendingConfig = nextConfig
  currentRunId.value = newRunId()
  lastSequence.value = -1
  awaitingSweep.value = false
  updates.value = []
  residualHistory.value = []
  snapshot.value = emptySnapshot()
  phase.value = 'loading'
  setStatus(copy.value.loading)
  post({
    v: BELLMAN_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'start',
    config: nextConfig,
    restoreSweeps,
  })
}

function restart(): void {
  if (!canRestart.value) return
  start(0)
}

function dispatchSweep(announce: boolean): void {
  if (!canSweep.value) return
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
  awaitingSweep.value = true
  setStatus(copy.value.working, announce)
  post({
    v: BELLMAN_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'sweep',
  })
}

function requestSweep(): void {
  if (!canSweep.value || running.value) return
  dispatchSweep(true)
}

function runToTolerance(): void {
  if (!canSweep.value || running.value) return
  pauseRequested = false
  running.value = true
  setStatus(copy.value.working)
  if (prefersReducedMotion.value) {
    awaitingSweep.value = true
    post({
      v: BELLMAN_PROTOCOL_VERSION,
      runId: currentRunId.value,
      kind: 'run',
    })
    return
  }
  dispatchSweep(false)
}

function pause(): void {
  running.value = false
  pauseRequested = false
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
}

function pauseRun(): void {
  if (!running.value) return
  const waitForCurrentSweep = awaitingSweep.value
  pause()
  if (waitForCurrentSweep) {
    pauseRequested = true
  } else {
    setStatus(pausedMessage())
  }
}

function scheduleSweep(): void {
  if (!running.value || !canSweep.value) return
  runTimer = setTimeout(() => {
    if (!running.value) return
    dispatchSweep(false)
  }, speedMs.value)
}

function resetValues(): void {
  if (!canReset.value) return
  pause()
  Object.assign(config, cloneConfig(appliedConfig.value))
  awaitingSweep.value = true
  setStatus(copy.value.working)
  post({
    v: BELLMAN_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'reset',
  })
}

function handleResponse(event: MessageEvent<BellmanWorkerResponse>): void {
  const response = event.data
  if (!acceptsBellmanResponse(response, currentRunId.value, lastSequence.value)) return
  lastSequence.value = response.sequence

  if (response.kind === 'error') {
    awaitingSweep.value = false
    pause()
    setStatus(`${copy.value.errorPrefix} ${localizedError(response.code)}`)
    phase.value = response.recoverable ? 'ready' : 'error'
    if (!response.recoverable) pendingConfig = undefined
    return
  }

  phase.value = 'ready'
  awaitingSweep.value = false
  if (response.kind === 'started') {
    if (pendingConfig) appliedConfig.value = cloneConfig(pendingConfig)
    pendingConfig = undefined
    engineVersion.value = response.engineVersion
    snapshot.value = response.snapshot
    model.value = response.model
    exactValues.value = [...response.exactValues]
    residualHistory.value = [...response.residualHistory]
    if (response.snapshot.converged) {
      setStatus(interpolate(copy.value.converged, {
        sweep: response.snapshot.sweepCount,
        residual: formatNumber(response.snapshot.residual),
      }))
    } else if (response.snapshot.truncated) {
      setStatus(copy.value.limitReached)
    } else {
      setStatus(copy.value.ready)
    }
    saveExperiment()
    return
  }

  if (response.kind === 'reset') {
    snapshot.value = response.snapshot
    updates.value = []
    residualHistory.value = [response.snapshot.residual]
    setStatus(copy.value.resetDone)
    saveExperiment()
    return
  }

  if (response.kind === 'advanced') {
    applyAdvance(response.outcome)
  } else {
    applySweep(response.outcome)
  }
}

function applySweep(outcome: BellmanSweepOutcome): void {
  const automaticRun = running.value
  const announcePause = pauseRequested
  pauseRequested = false
  snapshot.value = outcome.snapshot
  updates.value = outcome.updates
  residualHistory.value.push(outcome.snapshot.residual)
  if (outcome.snapshot.converged) {
    pause()
    setStatus(interpolate(copy.value.converged, {
      sweep: outcome.snapshot.sweepCount,
      residual: formatNumber(outcome.snapshot.residual),
    }))
  } else if (outcome.snapshot.truncated) {
    pause()
    setStatus(copy.value.limitReached)
  } else if (announcePause) {
    setStatus(pausedMessage())
  } else {
    setStatus(interpolate(copy.value.sweepDone, {
      sweep: outcome.snapshot.sweepCount,
      residual: formatNumber(outcome.snapshot.residual),
    }), !automaticRun)
  }
  saveExperiment()
  scheduleSweep()
}

function applyAdvance(outcome: BellmanAdvanceOutcome): void {
  snapshot.value = outcome.snapshot
  updates.value = []
  residualHistory.value = [
    ...residualHistory.value,
    ...outcome.residualHistory.slice(residualHistory.value.length > 0 ? 1 : 0),
  ]
  pause()
  if (outcome.snapshot.converged) {
    setStatus(interpolate(copy.value.converged, {
      sweep: outcome.snapshot.sweepCount,
      residual: formatNumber(outcome.snapshot.residual),
    }))
  } else {
    setStatus(copy.value.limitReached)
  }
  saveExperiment()
}

function localizedError(code: string): string {
  return (
    (copy.value.errors as Record<string, string>)[code] ??
    interpolate(copy.value.unknownError, { code })
  )
}

function stateName(state: number): string {
  return copy.value.stateNames[String(state) as keyof typeof copy.value.stateNames]
}

function formatNumber(value: number): string {
  const absolute = Math.abs(value)
  if (absolute > 0 && absolute < 0.0001) return value.toExponential(2)
  return new Intl.NumberFormat(props.locale, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(value)
}

function valueStyle(value: number): Record<string, string> {
  const scale = Math.max(...exactValues.value.map(Math.abs), 1e-9)
  const normalized = Math.min(Math.abs(value) / scale, 1)
  const alpha = 0.1 + normalized * 0.48
  return {
    backgroundColor:
      value >= 0 ? `rgba(13, 118, 110, ${alpha})` : `rgba(190, 70, 60, ${alpha})`,
  }
}

function residualFor(values: number[]): number {
  if (model.value.length === 0 || values.length !== stateCount) return Number.POSITIVE_INFINITY
  let residual = 0
  for (const state of stateIndexes) {
    const target = model.value
      .filter((transition) => transition.state === state)
      .reduce(
        (sum, transition) =>
          sum +
          transition.probability *
            (transition.reward + appliedConfig.value.discount * values[transition.nextState]),
        0,
      )
    residual = Math.max(residual, Math.abs(target - values[state]))
  }
  return residual
}

function edgePath(transition: BellmanTransition): string {
  const paths: Record<string, string> = {
    '0-1': 'M 105 70 L 250 49',
    '0-2': 'M 105 91 L 250 151',
    '1-0': 'M 250 63 Q 176 97 105 83',
    '1-3': 'M 310 52 L 440 91',
    '2-0': 'M 250 140 Q 176 108 105 96',
    '2-3': 'M 310 148 L 440 109',
    '3-3': 'M 470 72 C 524 34 524 166 470 128',
  }
  return paths[`${transition.state}-${transition.nextState}`] ?? ''
}

function edgeLabelPosition(transition: BellmanTransition): { x: number; y: number } {
  const positions: Record<string, { x: number; y: number }> = {
    '0-1': { x: 174, y: 48 },
    '0-2': { x: 174, y: 145 },
    '1-0': { x: 176, y: 94 },
    '1-3': { x: 374, y: 59 },
    '2-0': { x: 176, y: 119 },
    '2-3': { x: 374, y: 143 },
    '3-3': { x: 520, y: 103 },
  }
  return positions[`${transition.state}-${transition.nextState}`] ?? { x: 0, y: 0 }
}

function saveExperiment(): void {
  if (phase.value !== 'ready') return
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        v: storageVersion,
        config: cloneConfig(appliedConfig.value),
        sweepCount: snapshot.value.sweepCount,
        mode: mode.value,
        selectedState: selectedState.value,
        speedMs: speedMs.value,
      }),
    )
  } catch {
    // Session persistence is optional; the evaluator remains usable without it.
  }
}

function restoreExperiment(): number {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return 0
    const saved = JSON.parse(raw) as {
      v?: unknown
      config?: Partial<BellmanConfig>
      sweepCount?: unknown
      mode?: unknown
      selectedState?: unknown
      speedMs?: unknown
    }
    const restored = saved.config
    if (
      saved.v !== storageVersion ||
      !restored ||
      typeof restored.discount !== 'number' ||
      !Number.isFinite(restored.discount) ||
      restored.discount < 0 ||
      restored.discount >= 1 ||
      typeof restored.tolerance !== 'number' ||
      !Number.isFinite(restored.tolerance) ||
      restored.tolerance <= 0 ||
      restored.tolerance > 1 ||
      typeof restored.maxSweeps !== 'number' ||
      !Number.isInteger(restored.maxSweeps) ||
      restored.maxSweeps < 1 ||
      restored.maxSweeps > 10_000 ||
      typeof saved.sweepCount !== 'number' ||
      !Number.isInteger(saved.sweepCount) ||
      saved.sweepCount < 0 ||
      saved.sweepCount > restored.maxSweeps
    ) {
      return 0
    }

    Object.assign(config, restored)
    if (modeOptions.some((option) => option.value === saved.mode)) {
      mode.value = saved.mode as BellmanMode
    }
    if (
      typeof saved.selectedState === 'number' &&
      Number.isInteger(saved.selectedState) &&
      saved.selectedState >= 0 &&
      saved.selectedState < stateCount
    ) {
      selectedState.value = saved.selectedState
    }
    if (
      typeof saved.speedMs === 'number' &&
      Number.isFinite(saved.speedMs) &&
      saved.speedMs >= 80 &&
      saved.speedMs <= 1200
    ) {
      speedMs.value = saved.speedMs
    }
    return saved.sweepCount
  } catch {
    return 0
  }
}

watch([mode, selectedState, speedMs], saveExperiment)

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionPreference.addEventListener('change', updateMotionPreference)
  start(restoreExperiment())
})

onBeforeUnmount(() => {
  pause()
  saveExperiment()
  motionPreference?.removeEventListener('change', updateMotionPreference)
  motionPreference = undefined
  worker?.terminate()
  worker = undefined
})
</script>

<template>
  <section
    class="grid-lab bellman-lab"
    :aria-labelledby="`bellman-lab-title-${locale}`"
    :data-sweep-count="snapshot.sweepCount"
    :data-converged="snapshot.converged"
    :data-truncated="snapshot.truncated"
    :aria-busy="phase === 'loading' || awaitingSweep"
  >
    <header class="grid-lab__header">
      <div>
        <p class="grid-lab__eyebrow">{{ copy.eyebrow }}</p>
        <h2 :id="`bellman-lab-title-${locale}`">{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </div>
      <span class="engine-chip" :data-phase="phase">
        <span aria-hidden="true" class="engine-chip__dot" />
        {{ engineVersion ? interpolate(copy.version, { version: engineVersion }) : copy.engine }}
      </span>
    </header>

    <p class="bellman-lab__deterministic">{{ copy.deterministic }}</p>

    <section class="bellman-controls" :aria-label="copy.controls">
      <label>
        <span>{{ copy.discount }}</span>
        <input
          v-model.number="config.discount"
          type="number"
          min="0"
          max="0.9999999999999999"
          step="any"
          :aria-invalid="discountInvalid"
          :aria-describedby="discountInvalid ? `bellman-validation-${locale}` : undefined"
        />
      </label>
      <label>
        <span>{{ copy.tolerance }}</span>
        <input
          v-model.number="config.tolerance"
          type="number"
          min="5e-324"
          max="1"
          step="any"
          :aria-invalid="toleranceInvalid"
          :aria-describedby="toleranceInvalid ? `bellman-validation-${locale}` : undefined"
        />
      </label>
      <label>
        <span>{{ copy.maxSweeps }}</span>
        <input
          v-model.number="config.maxSweeps"
          type="number"
          min="1"
          max="10000"
          step="1"
          :aria-invalid="maxSweepsInvalid"
          :aria-describedby="maxSweepsInvalid ? `bellman-validation-${locale}` : undefined"
        />
      </label>
      <label>
        <span>{{ interpolate(copy.speed, { milliseconds: speedMs }) }}</span>
        <input v-model.number="speedMs" type="range" min="80" max="1200" step="10" />
      </label>
      <div class="bellman-controls__buttons">
        <button class="lab-button" type="button" :aria-disabled="!canRestart" @click="restart">
          {{ copy.apply }}
        </button>
        <button class="lab-button" type="button" :aria-disabled="!canSweep || running" @click="requestSweep">
          {{ copy.step }}
        </button>
        <button class="lab-button lab-button--primary" type="button" :aria-disabled="!canSweep || running" @click="runToTolerance">
          {{ copy.run }}
        </button>
        <button class="lab-button" type="button" :aria-disabled="!running" @click="pauseRun">
          {{ copy.pause }}
        </button>
        <button class="lab-button" type="button" :aria-disabled="!canReset" @click="resetValues">
          {{ copy.reset }}
        </button>
      </div>
    </section>

    <p :id="`bellman-validation-${locale}`" class="sr-only">
      {{ validationDescription }}
    </p>

    <div class="lab-mode-tabs" :aria-label="copy.modeLabel" role="group">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        class="lab-mode-tab"
        :class="{ 'lab-mode-tab--active': mode === option.value }"
        type="button"
        :aria-pressed="mode === option.value"
        @click="mode = option.value"
      >
        {{ copy[option.key] }}
      </button>
    </div>

    <div class="bellman-workspace">
      <section class="bellman-heatmap-panel" :aria-labelledby="`bellman-heatmap-${locale}`">
        <h3 :id="`bellman-heatmap-${locale}`">{{ copy.heatmapTitle }}</h3>
        <p>{{ copy.heatmapBody }}</p>
        <div class="bellman-heatmap">
          <button
            v-for="state in stateIndexes"
            :key="state"
            class="bellman-state"
            :class="{ 'bellman-state--selected': selectedState === state, 'bellman-state--terminal': state === 3 }"
            :style="valueStyle(snapshot.values[state] ?? 0)"
            :data-state="state"
            :data-value="snapshot.values[state] ?? 0"
            type="button"
            :aria-pressed="selectedState === state"
            :aria-label="interpolate(copy.stateAria, {
              state,
              name: stateName(state),
              value: formatNumber(snapshot.values[state] ?? 0),
              exact: formatNumber(exactValues[state] ?? 0),
            })"
            @click="selectedState = state"
          >
            <span>s{{ state }} · {{ stateName(state) }}</span>
            <strong>{{ formatNumber(snapshot.values[state] ?? 0) }}</strong>
            <small>{{ copy.exactValue }} {{ formatNumber(exactValues[state] ?? 0) }}</small>
          </button>
        </div>
        <p class="lab-panel__hint"><strong>{{ copy.trajectoryModel }}</strong><br />{{ copy.modelNote }}</p>
      </section>

      <section v-if="mode === 'backup'" class="bellman-view-panel">
        <h3>{{ interpolate(copy.backupTitle, { state: selectedState }) }}</h3>
        <p>{{ copy.backupBody }}</p>
        <p v-if="selectedUpdate" class="lab-panel__hint">
          {{ interpolate(copy.lastUpdate, {
            oldValue: formatNumber(selectedUpdate.oldValue),
            newValue: formatNumber(selectedUpdate.newValue),
            delta: formatNumber(Math.abs(selectedUpdate.delta)),
          }) }}
        </p>
        <p v-else class="lab-panel__hint">{{ copy.backupPrompt }}</p>
        <div class="formula-card bellman-equation-card">
          <span>{{ copy.backupEquation }}</span>
          <strong>V<sub>k+1</sub>(s{{ selectedState }}) = {{ formatNumber(backupTotal) }}</strong>
        </div>
        <div class="mini-table-wrap">
          <table class="mini-table bellman-term-table">
            <thead>
              <tr>
                <th scope="col">{{ copy.nextState }}</th>
                <th scope="col">{{ copy.probability }}</th>
                <th scope="col">{{ copy.reward }}</th>
                <th scope="col">{{ copy.nextValue }}</th>
                <th scope="col">{{ copy.discountedNext }}</th>
                <th scope="col">{{ copy.contribution }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="term in displayTerms" :key="term.nextState">
                <td>s{{ term.nextState }}</td>
                <td>{{ formatNumber(term.probability) }}</td>
                <td>{{ formatNumber(term.reward) }}</td>
                <td>{{ formatNumber(term.nextValue) }}</td>
                <td>{{ formatNumber(term.discountedNextValue) }}</td>
                <td>{{ formatNumber(term.contribution) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th colspan="5" scope="row">{{ copy.total }}</th>
                <td>{{ formatNumber(backupTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section v-else-if="mode === 'dependencies'" class="bellman-view-panel">
        <h3>{{ copy.dependenciesTitle }}</h3>
        <p>{{ copy.dependenciesBody }}</p>
        <svg
          class="bellman-graph"
          viewBox="0 0 550 200"
          role="img"
          :aria-labelledby="`bellman-graph-title-${locale} bellman-graph-desc-${locale}`"
        >
          <title :id="`bellman-graph-title-${locale}`">{{ copy.graphAria }}</title>
          <desc :id="`bellman-graph-desc-${locale}`">{{ copy.graphDescription }}</desc>
          <defs>
            <marker :id="`bellman-arrow-${locale}`" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>
          <g class="bellman-graph__edges">
            <g v-for="transition in model" :key="`${transition.state}-${transition.nextState}`">
              <path :d="edgePath(transition)" :marker-end="`url(#bellman-arrow-${locale})`" />
              <text :x="edgeLabelPosition(transition).x" :y="edgeLabelPosition(transition).y">
                {{ formatNumber(transition.probability) }}
              </text>
            </g>
          </g>
          <g class="bellman-graph__nodes">
            <g transform="translate(80 82)"><circle r="27" /><text text-anchor="middle" dy="5">s0</text></g>
            <g transform="translate(280 48)"><circle r="27" /><text text-anchor="middle" dy="5">s1</text></g>
            <g transform="translate(280 152)"><circle r="27" /><text text-anchor="middle" dy="5">s2</text></g>
            <g transform="translate(470 100)"><circle r="27" /><text text-anchor="middle" dy="5">s3</text></g>
          </g>
        </svg>
        <div class="mini-table-wrap">
          <table class="mini-table">
            <thead><tr><th scope="col">{{ copy.fromState }}</th><th scope="col">{{ copy.toState }}</th><th scope="col">{{ copy.probability }}</th><th scope="col">{{ copy.reward }}</th></tr></thead>
            <tbody>
              <tr v-for="transition in model" :key="`${transition.state}-${transition.nextState}`">
                <td>s{{ transition.state }}</td><td>s{{ transition.nextState }}</td><td>{{ formatNumber(transition.probability) }}</td><td>{{ formatNumber(transition.reward) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="mode === 'matrix'" class="bellman-view-panel">
        <h3>{{ copy.matrixTitle }}</h3>
        <p>{{ copy.matrixBody }}</p>
        <div class="mini-table-wrap">
          <table class="mini-table bellman-matrix-table">
            <thead>
              <tr><th scope="col">P<sub>π</sub></th><th v-for="state in stateIndexes" :key="state" scope="col">s{{ state }}</th><th scope="col">{{ copy.expectedReward }}</th><th scope="col">{{ copy.matrixValue }}</th><th scope="col">{{ copy.matrixExact }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="state in stateIndexes" :key="state">
                <th scope="row">s{{ state }}</th>
                <td v-for="nextState in stateIndexes" :key="nextState">{{ formatNumber(transitionMatrix[state]?.[nextState] ?? 0) }}</td>
                <td>{{ formatNumber(expectedRewards[state] ?? 0) }}</td>
                <td>{{ formatNumber(snapshot.values[state] ?? 0) }}</td>
                <td>{{ formatNumber(exactValues[state] ?? 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="mode === 'convergence'" class="bellman-view-panel">
        <h3>{{ copy.convergenceTitle }}</h3>
        <p>{{ copy.convergenceBody }}</p>
        <svg
          class="bellman-residual-chart"
          viewBox="0 0 420 130"
          role="img"
          :aria-labelledby="`bellman-history-title-${locale} bellman-history-desc-${locale}`"
        >
          <title :id="`bellman-history-title-${locale}`">{{ copy.historyAria }}</title>
          <desc :id="`bellman-history-desc-${locale}`">{{ copy.historyDescription }}</desc>
          <line x1="12" y1="118" x2="408" y2="118" />
          <line x1="12" y1="12" x2="12" y2="118" />
          <polyline v-if="residualHistory.length > 1" :points="chartPoints" />
          <circle v-if="residualHistory.length === 1" cx="12" cy="12" r="3" />
        </svg>
        <p v-if="residualHistory.length <= 1" class="lab-panel__hint">{{ copy.noHistory }}</p>
        <div class="mini-table-wrap bellman-history-table">
          <table class="mini-table">
            <thead><tr><th scope="col">{{ copy.sweeps }}</th><th scope="col">{{ copy.residual }}</th></tr></thead>
            <tbody>
              <tr v-for="(residual, index) in residualHistory" :key="index">
                <td>{{ index }}</td><td>{{ formatNumber(residual) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="bellman-view-panel">
        <h3>{{ copy.auditTitle }}</h3>
        <p>{{ copy.auditBody }}</p>
        <ul class="audit-list">
          <li v-for="item in auditItems" :key="item.label" :data-pass="item.pass">
            <span aria-hidden="true">{{ item.pass ? '✓' : '!' }}</span>
            <span>{{ item.label }}</span>
            <strong>{{ item.pass ? copy.pass : copy.fail }}</strong>
          </li>
        </ul>
      </section>
    </div>

    <div class="metric-strip" :aria-label="copy.metrics">
      <div><span>{{ copy.sweeps }}</span><strong>{{ snapshot.sweepCount }}</strong></div>
      <div><span>{{ copy.residual }}</span><strong>{{ formatNumber(snapshot.residual) }}</strong></div>
      <div><span>{{ copy.tolerance }}</span><strong>{{ formatNumber(appliedConfig.tolerance) }}</strong></div>
      <div><span>{{ copy.status }}</span><strong>{{ statusLabel }}</strong></div>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <p
      :id="`bellman-status-${locale}`"
      class="grid-lab__status"
      :data-phase="phase"
    >
      {{ visualStatus }}
    </p>
  </section>
</template>
