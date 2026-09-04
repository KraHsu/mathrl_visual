<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  GRID_POLICY_KINDS,
  GRID_POLICY_PROTOCOL_VERSION,
  acceptsGridPolicyResponse,
  canonicalGridPolicyKind,
  gridPolicyConfigValidationError,
  type GridPolicyAdvanceOutcome,
  type GridPolicyConfig,
  type GridPolicyKind,
  type GridPolicyReference,
  type GridPolicySnapshot,
  type GridPolicySweepOutcome,
  type GridPolicyTerm,
  type GridPolicyTransition,
  type GridPolicyUpdate,
  type GridPolicyWorkerRequest,
  type GridPolicyWorkerResponse,
} from '../gridPolicyProtocol'
import { gridPolicyMessagesFor } from '../i18n/gridPolicyMessages'
import { interpolate, type Locale } from '../i18n/messages'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })

type ViewMode = 'backup' | 'dependencies' | 'policy' | 'matrix' | 'convergence' | 'audit'

const storageVersion = 1
const storageKey = `mathrl:exp-ch02-grid-policy:v${storageVersion}`
const stateCount = 16
const actionCount = 5
const stateIndexes = Array.from({ length: stateCount }, (_, index) => index)
const actionIndexes = Array.from({ length: actionCount }, (_, index) => index)
const actionGlyphs = ['↑', '→', '↓', '←', '•']
const copy = computed(() => gridPolicyMessagesFor(props.locale))

const baselineConfig: GridPolicyConfig = {
  policy: 'uniform',
  discount: 0.9,
  slipProbability: 0,
  tolerance: 1e-10,
  maxSweeps: 1_000,
  seedHex: '5eed',
  rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
}

const config = reactive<GridPolicyConfig>(cloneConfig(baselineConfig))
const appliedConfig = ref<GridPolicyConfig>(cloneConfig(baselineConfig))
const snapshot = ref<GridPolicySnapshot>(emptySnapshot())
const reference = ref<GridPolicyReference>(emptyReference())
const model = ref<GridPolicyTransition[]>([])
const updates = ref<GridPolicyUpdate[]>([])
const residualHistory = ref<number[]>([])
const mode = ref<ViewMode>('backup')
const selectedState = ref(0)
const speedMs = ref(320)
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const announcement = ref('')
const visualStatus = ref('')
const engineVersion = ref('')
const currentRunId = ref('')
const lastSequence = ref(-1)
const awaitingSweep = ref(false)
const running = ref(false)
const prefersReducedMotion = ref(false)
let worker: Worker | undefined
let pendingConfig: GridPolicyConfig | undefined
let runTimer: ReturnType<typeof setTimeout> | undefined
let motionPreference: MediaQueryList | undefined
let pauseRequested = false

const modeOptions: Array<{ value: ViewMode; key: keyof typeof copy.value }> = [
  { value: 'backup', key: 'modeBackup' },
  { value: 'dependencies', key: 'modeDependencies' },
  { value: 'policy', key: 'modePolicy' },
  { value: 'matrix', key: 'modeMatrix' },
  { value: 'convergence', key: 'modeConvergence' },
  { value: 'audit', key: 'modeAudit' },
]

const canRestart = computed(() => phase.value !== 'loading' && !awaitingSweep.value)
const canReset = computed(() => phase.value === 'ready' && !awaitingSweep.value)
const canSweep = computed(
  () =>
    phase.value === 'ready' &&
    !awaitingSweep.value &&
    !snapshot.value.converged &&
    !snapshot.value.truncated,
)
const validation = computed(() => gridPolicyConfigValidationError(config))
const validationDescription = computed(() =>
  validation.value
    ? `${copy.value.errorPrefix} ${localizedError(validation.value.code)}`
    : '',
)
const invalidField = (field: string) => validation.value?.field === field
const selectedUpdate = computed(() => updates.value.find((item) => item.state === selectedState.value))
const selectedPolicy = computed(() => snapshot.value.policyProbabilities[selectedState.value] ?? [0, 0, 0, 0, 0])
const selectedActionValues = computed(() => snapshot.value.actionValues[selectedState.value] ?? [0, 0, 0, 0, 0])
const selectedTerms = computed<GridPolicyTerm[]>(() => {
  if (selectedUpdate.value) return selectedUpdate.value.terms
  return model.value
    .filter((transition) => transition.state === selectedState.value)
    .map((transition) => {
      const policyProbability = selectedPolicy.value[transition.requestedAction] ?? 0
      const nextValue = transition.nextState === 15 ? 0 : snapshot.value.values[transition.nextState] ?? 0
      const probability = policyProbability * transition.probability
      const discountedNextValue = appliedConfig.value.discount * nextValue
      return {
        requestedAction: transition.requestedAction,
        actualAction: transition.actualAction,
        nextState: transition.nextState,
        policyProbability,
        transitionProbability: transition.probability,
        probability,
        reward: transition.reward,
        nextValue,
        discountedNextValue,
        contribution: probability * (transition.reward + discountedNextValue),
        boundaryCollision: transition.boundaryCollision,
      }
    })
})
const backupTotal = computed(() => selectedTerms.value.reduce((sum, term) => sum + term.contribution, 0))
const selectedDependencies = computed(() =>
  stateIndexes
    .filter((state) => (snapshot.value.transitionMatrix[selectedState.value]?.[state] ?? 0) > 1e-12)
    .map((state) => ({
      state,
      probability: snapshot.value.transitionMatrix[selectedState.value]?.[state] ?? 0,
    })),
)
const selectedRowSum = computed(() =>
  (snapshot.value.transitionMatrix[selectedState.value] ?? []).reduce((sum, value) => sum + value, 0),
)
const locallyComputedResidual = computed(() => residualFor(snapshot.value.values))
const exactResidual = computed(() => residualFor(reference.value.values))
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.statusLoading
  if (phase.value === 'error') return copy.value.statusError
  if (snapshot.value.converged) return copy.value.statusConverged
  if (snapshot.value.truncated) return copy.value.statusTruncated
  return copy.value.statusReady
})
const auditItems = computed(() => [
  { label: copy.value.auditRows, pass: auditPolicyRows() },
  { label: copy.value.auditTransitions, pass: auditTransitionRows() },
  {
    label: copy.value.auditTerminal,
    pass:
      snapshot.value.values[15] === 0 &&
      snapshot.value.transitionMatrix[15]?.every((value) => value === 0),
  },
  { label: copy.value.auditFinite, pass: auditFinite() },
  {
    label: copy.value.auditSnapshotResidual,
    pass: Math.abs(locallyComputedResidual.value - snapshot.value.residual) < 1e-9,
  },
  { label: copy.value.auditExactResidual, pass: exactResidual.value < 1e-8 },
  { label: copy.value.auditScope, pass: true },
])
const chartPoints = computed(() => {
  if (residualHistory.value.length === 0) return ''
  const width = 500
  const height = 150
  const pad = 14
  const logs = residualHistory.value.map((value) => Math.log10(Math.max(value, 1e-14)))
  const max = Math.max(...logs)
  const min = Math.min(...logs)
  const range = Math.max(max - min, 1)
  const denominator = Math.max(logs.length - 1, 1)
  return logs
    .map((value, index) => {
      const x = pad + (index / denominator) * (width - pad * 2)
      const y = pad + ((max - value) / range) * (height - pad * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

function cloneConfig(value: GridPolicyConfig): GridPolicyConfig {
  return { ...value, rewards: { ...value.rewards } }
}

function emptySnapshot(): GridPolicySnapshot {
  return {
    policy: 'uniform',
    seedHex: '0000000000005eed',
    values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, () => Array(actionCount).fill(0)),
    policyProbabilities: Array.from({ length: stateCount }, (_, state) =>
      state === 15 ? Array(actionCount).fill(0) : Array(actionCount).fill(0.2),
    ),
    expectedRewards: Array(stateCount).fill(0),
    transitionMatrix: Array.from({ length: stateCount }, () => Array(stateCount).fill(0)),
    sweepCount: 0,
    residual: 0,
    converged: false,
    truncated: false,
  }
}

function emptyReference(): GridPolicyReference {
  return { values: Array(stateCount).fill(0), residual: Number.POSITIVE_INFINITY }
}

function newRunId(): string {
  return `ch02-grid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function post(request: GridPolicyWorkerRequest): void {
  worker?.postMessage(request)
}

function setStatus(message: string, announce = true): void {
  visualStatus.value = message
  if (announce) announcement.value = message
}

function updateMotionPreference(event?: MediaQueryListEvent): void {
  prefersReducedMotion.value = event?.matches ?? motionPreference?.matches ?? false
}

function createWorker(): boolean {
  let nextWorker: Worker
  try {
    nextWorker = new Worker(new URL('../workers/grid-policy.worker.ts', import.meta.url), { type: 'module' })
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
    phase.value = 'error'
    pendingConfig = undefined
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
  const error = gridPolicyConfigValidationError(nextConfig)
  if (error) {
    awaitingSweep.value = false
    pendingConfig = undefined
    phase.value = 'error'
    setStatus(`${copy.value.errorPrefix} ${localizedError(error.code)}`)
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
  reference.value = emptyReference()
  model.value = []
  phase.value = 'loading'
  setStatus(copy.value.loading)
  post({
    v: GRID_POLICY_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'start',
    config: nextConfig,
    restoreSweeps,
  })
}

function restart(): void {
  if (canRestart.value) start(0)
}

function dispatchSweep(announce: boolean): void {
  if (!canSweep.value) return
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
  awaitingSweep.value = true
  setStatus(copy.value.working, announce)
  post({ v: GRID_POLICY_PROTOCOL_VERSION, runId: currentRunId.value, kind: 'sweep' })
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
    post({ v: GRID_POLICY_PROTOCOL_VERSION, runId: currentRunId.value, kind: 'run' })
  } else {
    dispatchSweep(false)
  }
}

function pause(): void {
  running.value = false
  pauseRequested = false
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
}

function pauseRun(): void {
  if (!running.value) return
  const waiting = awaitingSweep.value
  pause()
  if (waiting) pauseRequested = true
  else setStatus(interpolate(copy.value.paused, { sweep: snapshot.value.sweepCount, residual: formatNumber(snapshot.value.residual) }))
}

function scheduleSweep(): void {
  if (!running.value || !canSweep.value) return
  runTimer = setTimeout(() => {
    if (running.value) dispatchSweep(false)
  }, speedMs.value)
}

function resetValues(): void {
  if (!canReset.value) return
  pause()
  Object.assign(config, cloneConfig(appliedConfig.value))
  awaitingSweep.value = true
  setStatus(copy.value.working)
  post({ v: GRID_POLICY_PROTOCOL_VERSION, runId: currentRunId.value, kind: 'reset' })
}

function handleResponse(event: MessageEvent<GridPolicyWorkerResponse>): void {
  const response = event.data
  if (!acceptsGridPolicyResponse(response, currentRunId.value, lastSequence.value)) return
  lastSequence.value = response.sequence
  if (response.kind === 'error') {
    awaitingSweep.value = false
    pause()
    phase.value = response.recoverable ? 'ready' : 'error'
    setStatus(`${copy.value.errorPrefix} ${localizedError(response.code)}`)
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
    reference.value = response.reference
    residualHistory.value = [...response.residualHistory]
    setStatus(
      response.snapshot.converged
        ? interpolate(copy.value.converged, {
            sweep: response.snapshot.sweepCount,
            residual: formatNumber(response.snapshot.residual),
          })
        : response.snapshot.truncated
          ? copy.value.limitReached
          : copy.value.ready,
    )
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
  if (response.kind === 'swept') applySweep(response.outcome)
  else applyAdvance(response.outcome)
}

function applySweep(outcome: GridPolicySweepOutcome): void {
  const automatic = running.value
  const announcePause = pauseRequested
  pauseRequested = false
  snapshot.value = outcome.snapshot
  updates.value = outcome.updates
  residualHistory.value.push(outcome.snapshot.residual)
  if (outcome.snapshot.converged) {
    pause()
    setStatus(interpolate(copy.value.converged, { sweep: outcome.snapshot.sweepCount, residual: formatNumber(outcome.snapshot.residual) }))
  } else if (outcome.snapshot.truncated) {
    pause()
    setStatus(copy.value.limitReached)
  } else if (announcePause) {
    setStatus(interpolate(copy.value.paused, { sweep: outcome.snapshot.sweepCount, residual: formatNumber(outcome.snapshot.residual) }))
  } else {
    setStatus(interpolate(copy.value.sweepDone, { sweep: outcome.snapshot.sweepCount, residual: formatNumber(outcome.snapshot.residual) }), !automatic)
  }
  saveExperiment()
  scheduleSweep()
}

function applyAdvance(outcome: GridPolicyAdvanceOutcome): void {
  snapshot.value = outcome.snapshot
  updates.value = []
  residualHistory.value = [...residualHistory.value, ...outcome.residualHistory.slice(residualHistory.value.length > 0 ? 1 : 0)]
  pause()
  setStatus(
    outcome.snapshot.converged
      ? interpolate(copy.value.converged, { sweep: outcome.snapshot.sweepCount, residual: formatNumber(outcome.snapshot.residual) })
      : copy.value.limitReached,
  )
  saveExperiment()
}

function localizedError(code: string): string {
  return (copy.value.errors as Record<string, string>)[code] ?? interpolate(copy.value.unknownError, { code })
}

function stateName(state: number): string {
  return copy.value.stateNames[String(state) as keyof typeof copy.value.stateNames]
}

function formatNumber(value: number): string {
  if (Math.abs(value) > 0 && Math.abs(value) < 0.0001) return value.toExponential(2)
  return new Intl.NumberFormat(props.locale, { maximumFractionDigits: 4 }).format(value)
}

function valueStyle(value: number): Record<string, string> {
  const scale = Math.max(...reference.value.values.map((item) => Math.abs(item)), 1e-9)
  const normalized = Math.min(Math.abs(value) / scale, 1)
  const alpha = 0.1 + normalized * 0.5
  return { backgroundColor: value >= 0 ? `rgba(13, 118, 110, ${alpha})` : `rgba(190, 70, 60, ${alpha})` }
}

function residualFor(values: number[]): number {
  if (values.length !== stateCount) return Number.POSITIVE_INFINITY
  let residual = 0
  for (const state of stateIndexes) {
    const row = snapshot.value.transitionMatrix[state] ?? []
    const target = (snapshot.value.expectedRewards[state] ?? 0) +
      appliedConfig.value.discount * row.reduce((sum, probability, nextState) => sum + probability * (values[nextState] ?? 0), 0)
    residual = Math.max(residual, Math.abs(target - (values[state] ?? 0)))
  }
  return residual
}

function auditPolicyRows(): boolean {
  return snapshot.value.policyProbabilities.every((row, state) => {
    const sum = row.reduce((total, probability) => total + probability, 0)
    return state === 15 ? Math.abs(sum) < 1e-12 : Math.abs(sum - 1) < 1e-12
  })
}

function auditTransitionRows(): boolean {
  return stateIndexes.every((state) =>
    state === 15 || actionIndexes.every((action) => {
      const sum = model.value
        .filter((row) => row.state === state && row.requestedAction === action)
        .reduce((total, row) => total + row.probability, 0)
      return Math.abs(sum - 1) < 1e-12
    }),
  )
}

function auditFinite(): boolean {
  return [
    ...snapshot.value.values,
    ...snapshot.value.actionValues.flat(),
    ...snapshot.value.policyProbabilities.flat(),
    ...snapshot.value.expectedRewards,
    ...snapshot.value.transitionMatrix.flat(),
    snapshot.value.residual,
    ...reference.value.values,
  ].every(Number.isFinite)
}

function saveExperiment(): void {
  if (phase.value !== 'ready') return
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({
      v: storageVersion,
      config: cloneConfig(appliedConfig.value),
      sweepCount: snapshot.value.sweepCount,
      selectedState: selectedState.value,
      speedMs: speedMs.value,
      mode: mode.value,
    }))
  } catch {
    // Optional persistence; the evaluator remains usable without storage.
  }
}

function restoreExperiment(): number {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as {
      v?: unknown
      config?: Partial<GridPolicyConfig>
      sweepCount?: unknown
      selectedState?: unknown
      speedMs?: unknown
      mode?: unknown
    } | null
    const restored = saved?.config
    if (
      saved?.v !== storageVersion ||
      !restored ||
      gridPolicyConfigValidationError({ ...baselineConfig, ...restored, rewards: { ...baselineConfig.rewards, ...restored.rewards } }) ||
      typeof saved.sweepCount !== 'number' ||
      !Number.isInteger(saved.sweepCount) ||
      saved.sweepCount < 0 ||
      saved.sweepCount > (restored.maxSweeps ?? 0)
    ) return 0
    Object.assign(config, restored, { rewards: { ...baselineConfig.rewards, ...restored.rewards } })
    if (typeof saved.selectedState === 'number' && Number.isInteger(saved.selectedState) && saved.selectedState >= 0 && saved.selectedState < stateCount) selectedState.value = saved.selectedState
    if (typeof saved.speedMs === 'number' && saved.speedMs >= 80 && saved.speedMs <= 1200) speedMs.value = saved.speedMs
    if (['backup', 'dependencies', 'policy', 'matrix', 'convergence', 'audit'].includes(String(saved.mode))) mode.value = saved.mode as ViewMode
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
    class="grid-lab bellman-lab grid-policy-evaluation-lab"
    :aria-labelledby="`grid-policy-lab-title-${locale}`"
    :data-sweep-count="snapshot.sweepCount"
    :data-state-count="stateCount"
    :data-converged="snapshot.converged"
    :data-truncated="snapshot.truncated"
    :aria-busy="phase === 'loading' || awaitingSweep"
  >
    <header class="grid-lab__header">
      <div>
        <p class="grid-lab__eyebrow">{{ copy.eyebrow }}</p>
        <h2 :id="`grid-policy-lab-title-${locale}`">{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </div>
      <span class="engine-chip" :data-phase="phase">
        <span aria-hidden="true" class="engine-chip__dot" />
        {{ engineVersion ? interpolate(copy.version, { version: engineVersion }) : copy.engine }}
      </span>
    </header>

    <p class="bellman-lab__deterministic">{{ interpolate(copy.deterministic, { seed: appliedConfig.seedHex }) }}</p>

    <section class="bellman-controls grid-policy-controls" :aria-label="copy.controls">
      <label>
        <span>{{ copy.policy }}</span>
        <select v-model="config.policy" :aria-invalid="invalidField('policy')">
          <option v-for="kind in GRID_POLICY_KINDS" :key="kind" :value="kind">
            {{ kind === 'uniform' ? copy.uniformPolicy : copy.goalPolicy }}
          </option>
        </select>
      </label>
      <label>
        <span>{{ copy.discount }}</span>
        <input v-model.number="config.discount" type="number" min="0" max="0.99" step="any" :aria-invalid="invalidField('discount')" />
      </label>
      <label>
        <span>{{ copy.wind }}</span>
        <input v-model.number="config.slipProbability" type="number" min="0" max="1" step="any" :aria-invalid="invalidField('slipProbability')" />
      </label>
      <label>
        <span>{{ copy.tolerance }}</span>
        <input v-model.number="config.tolerance" type="number" min="5e-324" max="1" step="any" :aria-invalid="invalidField('tolerance')" />
      </label>
      <label>
        <span>{{ copy.maxSweeps }}</span>
        <input v-model.number="config.maxSweeps" type="number" min="1" max="10000" step="1" :aria-invalid="invalidField('maxSweeps')" />
      </label>
      <label>
        <span>{{ interpolate(copy.speed, { milliseconds: speedMs }) }}</span>
        <input v-model.number="speedMs" type="range" min="80" max="1200" step="10" />
      </label>
      <div class="bellman-controls__buttons">
        <button class="lab-button" type="button" :disabled="!canRestart" @click="restart">{{ copy.apply }}</button>
        <button class="lab-button" type="button" :disabled="!canSweep || running" @click="requestSweep">{{ copy.step }}</button>
        <button class="lab-button lab-button--primary" type="button" :disabled="!canSweep || running" @click="runToTolerance">{{ copy.run }}</button>
        <button class="lab-button" type="button" :disabled="!running" @click="pauseRun">{{ copy.pause }}</button>
        <button class="lab-button" type="button" :disabled="!canReset" @click="resetValues">{{ copy.reset }}</button>
      </div>
    </section>

    <p :id="`grid-policy-validation-${locale}`" class="sr-only">{{ validationDescription }}</p>

    <div class="lab-mode-tabs" :aria-label="copy.modeLabel" role="group">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        class="lab-mode-tab"
        :class="{ 'lab-mode-tab--active': mode === option.value }"
        type="button"
        :aria-pressed="mode === option.value"
        @click="mode = option.value"
      >{{ copy[option.key] }}</button>
    </div>

    <div class="bellman-workspace grid-policy-workspace">
      <section class="bellman-heatmap-panel grid-policy-heatmap-panel" :aria-labelledby="`grid-policy-heatmap-${locale}`">
        <h3 :id="`grid-policy-heatmap-${locale}`">{{ copy.heatmapTitle }}</h3>
        <p>{{ copy.heatmapBody }}</p>
        <div class="grid-policy-heatmap" role="group" :aria-label="copy.heatmapTitle">
          <button
            v-for="state in stateIndexes"
            :key="state"
            class="bellman-state grid-policy-state"
            :class="{ 'bellman-state--selected': selectedState === state, 'bellman-state--terminal': state === 15 }"
            :style="valueStyle(snapshot.values[state] ?? 0)"
            :data-state="state"
            :data-value="snapshot.values[state] ?? 0"
            type="button"
            :aria-pressed="selectedState === state"
            :aria-label="interpolate(copy.stateAria, { state, row: Math.floor(state / 4) + 1, column: state % 4 + 1, value: formatNumber(snapshot.values[state] ?? 0), exact: formatNumber(reference.values[state] ?? 0) })"
            @click="selectedState = state"
          >
            <span>s{{ state }} · {{ stateName(state) }}</span>
            <strong>{{ formatNumber(snapshot.values[state] ?? 0) }}</strong>
            <small>{{ copy.exactValue }} {{ formatNumber(reference.values[state] ?? 0) }}</small>
          </button>
        </div>
        <p class="lab-panel__hint"><strong>{{ copy.sharedModel }}</strong><br />{{ copy.modelNote }}</p>
      </section>

      <section v-if="mode === 'backup'" class="bellman-view-panel grid-policy-view-panel">
        <h3>{{ interpolate(copy.backupTitle, { state: selectedState }) }}</h3>
        <p>{{ copy.backupBody }}</p>
        <p v-if="selectedUpdate" class="lab-panel__hint">{{ interpolate(copy.lastUpdate, { oldValue: formatNumber(selectedUpdate.oldValue), newValue: formatNumber(selectedUpdate.newValue), delta: formatNumber(Math.abs(selectedUpdate.delta)) }) }}</p>
        <p v-else class="lab-panel__hint">{{ copy.backupPrompt }}</p>
        <div class="formula-card bellman-equation-card"><span>{{ copy.backupEquation }}</span><strong>{{ formatNumber(backupTotal) }}</strong></div>
        <div class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.backupTitle"><table class="mini-table grid-policy-term-table">
          <thead><tr><th scope="col">{{ copy.requestedAction }}</th><th scope="col">{{ copy.actualAction }}</th><th scope="col">{{ copy.nextState }}</th><th scope="col">{{ copy.policyProbability }}</th><th scope="col">{{ copy.transitionProbability }}</th><th scope="col">{{ copy.probability }}</th><th scope="col">{{ copy.reward }}</th><th scope="col">{{ copy.nextValue }}</th><th scope="col">{{ copy.contribution }}</th></tr></thead>
          <tbody><tr v-for="(term, index) in selectedTerms" :key="`${term.requestedAction}-${term.actualAction}-${term.nextState}-${index}`"><td>{{ actionGlyphs[term.requestedAction] }}</td><td>{{ actionGlyphs[term.actualAction] }}</td><td>s{{ term.nextState }}</td><td>{{ formatNumber(term.policyProbability) }}</td><td>{{ formatNumber(term.transitionProbability) }}</td><td>{{ formatNumber(term.probability) }}</td><td>{{ formatNumber(term.reward) }}</td><td>{{ formatNumber(term.nextValue) }}</td><td>{{ formatNumber(term.contribution) }}</td></tr></tbody>
          <tfoot><tr><th colspan="8" scope="row">{{ copy.total }}</th><td>{{ formatNumber(backupTotal) }}</td></tr></tfoot>
        </table></div>
      </section>

      <section v-else-if="mode === 'dependencies'" class="bellman-view-panel grid-policy-view-panel">
        <h3>{{ copy.dependenciesTitle }}</h3><p>{{ copy.dependenciesBody }}</p>
        <svg class="grid-policy-dependency-graph" viewBox="0 0 440 270" role="img" :aria-labelledby="`grid-policy-graph-title-${locale} grid-policy-graph-desc-${locale}`">
          <title :id="`grid-policy-graph-title-${locale}`">{{ copy.graphAria }}</title><desc :id="`grid-policy-graph-desc-${locale}`">{{ copy.graphDescription }}</desc>
          <g class="grid-policy-graph__edges"><line v-for="item in selectedDependencies" :key="item.state" x1="50" y1="135" :x2="80 + (item.state % 4) * 92" :y2="35 + Math.floor(item.state / 4) * 68" /><text v-for="item in selectedDependencies" :key="`label-${item.state}`" :x="84 + (item.state % 4) * 92" :y="31 + Math.floor(item.state / 4) * 68">{{ formatNumber(item.probability) }}</text></g>
          <g class="grid-policy-graph__nodes"><circle cx="50" cy="135" r="25" /><text x="50" y="140" text-anchor="middle">s{{ selectedState }}</text><g v-for="item in selectedDependencies" :key="`node-${item.state}`"><circle :cx="80 + (item.state % 4) * 92" :cy="35 + Math.floor(item.state / 4) * 68" r="22" /><text :x="80 + (item.state % 4) * 92" :y="40 + Math.floor(item.state / 4) * 68" text-anchor="middle">s{{ item.state }}</text></g></g>
        </svg>
        <div class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.dependenciesTitle"><table class="mini-table"><thead><tr><th scope="col">{{ copy.fromState }}</th><th scope="col">{{ copy.toState }}</th><th scope="col">{{ copy.matrixProbability }}</th></tr></thead><tbody><tr v-for="item in selectedDependencies" :key="item.state"><td>s{{ selectedState }}</td><td>s{{ item.state }}</td><td>{{ formatNumber(item.probability) }}</td></tr></tbody><tfoot><tr><th colspan="2" scope="row">{{ copy.rowSum }}</th><td>{{ formatNumber(selectedRowSum) }}</td></tr></tfoot></table></div>
      </section>

      <section v-else-if="mode === 'policy'" class="bellman-view-panel grid-policy-view-panel">
        <h3>{{ interpolate(copy.policyTitle, { state: selectedState }) }}</h3><p>{{ copy.policyBody }}</p>
        <div class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.policyTitle"><table class="mini-table"><thead><tr><th scope="col">{{ copy.action }}</th><th scope="col">{{ copy.policyProbability }}</th><th scope="col">{{ copy.actionValue }}</th></tr></thead><tbody><tr v-for="action in actionIndexes" :key="action"><th scope="row">{{ actionGlyphs[action] }}</th><td>{{ formatNumber(selectedPolicy[action] ?? 0) }}</td><td>{{ formatNumber(selectedActionValues[action] ?? 0) }}</td></tr></tbody></table></div>
      </section>

      <section v-else-if="mode === 'matrix'" class="bellman-view-panel grid-policy-view-panel">
        <h3>{{ copy.matrixTitle }}</h3><p>{{ copy.matrixBody }}</p>
        <div class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.matrixTitle"><table class="mini-table grid-policy-matrix-table"><thead><tr><th scope="col">Pπ</th><th v-for="state in stateIndexes" :key="state" scope="col">s{{ state }}</th><th scope="col">{{ copy.expectedReward }}</th><th scope="col">{{ copy.matrixValue }}</th><th scope="col">{{ copy.matrixExact }}</th></tr></thead><tbody><tr v-for="state in stateIndexes" :key="state"><th scope="row">s{{ state }}</th><td v-for="nextState in stateIndexes" :key="nextState">{{ formatNumber(snapshot.transitionMatrix[state]?.[nextState] ?? 0) }}</td><td>{{ formatNumber(snapshot.expectedRewards[state] ?? 0) }}</td><td>{{ formatNumber(snapshot.values[state] ?? 0) }}</td><td>{{ formatNumber(reference.values[state] ?? 0) }}</td></tr></tbody></table></div>
      </section>

      <section v-else-if="mode === 'convergence'" class="bellman-view-panel grid-policy-view-panel">
        <h3>{{ copy.convergenceTitle }}</h3><p>{{ copy.convergenceBody }}</p>
        <svg class="bellman-residual-chart" viewBox="0 0 500 150" role="img" :aria-labelledby="`grid-policy-history-title-${locale} grid-policy-history-desc-${locale}`"><title :id="`grid-policy-history-title-${locale}`">{{ copy.historyAria }}</title><desc :id="`grid-policy-history-desc-${locale}`">{{ copy.historyDescription }}</desc><line x1="14" y1="136" x2="486" y2="136" /><line x1="14" y1="14" x2="14" y2="136" /><polyline v-if="residualHistory.length > 1" :points="chartPoints" /><circle v-else cx="14" cy="14" r="3" /></svg>
        <p v-if="residualHistory.length <= 1" class="lab-panel__hint">{{ copy.noHistory }}</p>
        <div class="mini-table-wrap grid-policy-history-table" tabindex="0" role="region" :aria-label="copy.convergenceTitle"><table class="mini-table"><thead><tr><th scope="col">{{ copy.sweeps }}</th><th scope="col">{{ copy.residual }}</th></tr></thead><tbody><tr v-for="(residual, index) in residualHistory" :key="index"><td>{{ index }}</td><td>{{ formatNumber(residual) }}</td></tr></tbody></table></div>
      </section>

      <section v-else class="bellman-view-panel grid-policy-view-panel"><h3>{{ copy.auditTitle }}</h3><p>{{ copy.auditBody }}</p><ul class="audit-list"><li v-for="item in auditItems" :key="item.label" :data-pass="item.pass"><span aria-hidden="true">{{ item.pass ? '✓' : '!' }}</span><span>{{ item.label }}</span><strong>{{ item.pass ? copy.pass : copy.fail }}</strong></li></ul></section>
    </div>

    <div class="metric-strip" :aria-label="copy.metrics"><div><span>{{ copy.states }}</span><strong>{{ stateCount }}</strong></div><div><span>{{ copy.sweeps }}</span><strong>{{ snapshot.sweepCount }}</strong></div><div><span>{{ copy.residual }}</span><strong>{{ formatNumber(snapshot.residual) }}</strong></div><div><span>{{ copy.toleranceMetric }}</span><strong>{{ formatNumber(appliedConfig.tolerance) }}</strong></div><div><span>{{ copy.status }}</span><strong>{{ statusLabel }}</strong></div></div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <p class="grid-lab__status" :data-phase="phase">{{ visualStatus }}</p>
  </section>
</template>

<style scoped>
.grid-policy-evaluation-lab {
  container-type: inline-size;
}

.grid-policy-controls {
  grid-template-columns: repeat(3, minmax(130px, 1fr));
}

.grid-policy-controls select,
.grid-policy-controls input {
  accent-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  min-width: 0;
  padding: 0.42rem 0.5rem;
  width: 100%;
}

.grid-policy-controls input[type='range'] {
  padding: 0.42rem 0;
}

.grid-policy-workspace {
  grid-template-columns: minmax(260px, 0.85fr) minmax(420px, 1.5fr);
}

.grid-policy-heatmap {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(4, minmax(52px, 1fr));
  margin: 0.9rem 0;
}

.grid-policy-state {
  aspect-ratio: 1 / 1;
  gap: 0.15rem;
  padding: 0.35rem;
}

.grid-policy-state span,
.grid-policy-state small {
  font-size: clamp(0.48rem, 1.2cqw, 0.65rem);
  line-height: 1.1;
}

.grid-policy-state strong {
  font-size: clamp(0.85rem, 2.3cqw, 1.45rem);
}

.grid-policy-state small {
  color: var(--mathrl-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-policy-view-panel {
  min-width: 0;
}

.grid-policy-term-table,
.grid-policy-matrix-table {
  min-width: 860px;
}

.grid-policy-history-table {
  max-height: 260px;
  overflow-y: auto;
}

.grid-policy-dependency-graph {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  display: block;
  margin: 0.8rem 0;
  max-height: 280px;
  width: 100%;
}

.grid-policy-graph__edges line {
  stroke: var(--vp-c-brand-1);
  stroke-dasharray: 4 3;
  stroke-width: 1.5;
}

.grid-policy-graph__edges text {
  fill: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
}

.grid-policy-graph__nodes circle {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.5;
}

.grid-policy-graph__nodes text {
  fill: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
}

@container (max-width: 720px) {
  .grid-policy-controls {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .grid-policy-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}

@container (max-width: 440px) {
  .grid-policy-controls,
  .grid-policy-controls .bellman-controls__buttons {
    grid-template-columns: minmax(0, 1fr);
  }

  .grid-policy-heatmap {
    gap: 0.3rem;
  }

  .grid-policy-state {
    padding: 0.22rem;
  }

  .grid-policy-state span,
  .grid-policy-state small {
    font-size: 0.48rem;
  }
}
</style>
