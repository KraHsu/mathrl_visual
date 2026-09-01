<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  OPTIMALITY_PROTOCOL_VERSION,
  acceptsOptimalityResponse,
  optimalityConfigValidationError,
  type OptimalityAdvanceOutcome,
  type OptimalityConfig,
  type OptimalityConfigField,
  type OptimalityReference,
  type OptimalitySnapshot,
  type OptimalitySweepOutcome,
  type OptimalityTransition,
  type OptimalityUpdate,
  type OptimalityWorkerRequest,
  type OptimalityWorkerResponse,
} from '../optimalityProtocol'
import { optimalityMessagesFor } from '../i18n/optimalityMessages'
import { interpolate, type Locale } from '../i18n/messages'
import { ACTION, type ActionCode } from '../protocol'

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'en',
})

type OptimalityMode = 'backups' | 'propagation' | 'contraction' | 'factors' | 'audit'
type PresetKey = 'baseline' | 'wind20' | 'short' | 'long'

const storageVersion = 1
const storageKey = `mathrl:exp-ch03-optimality:v${storageVersion}`
const stateCount = 16
const stateIndexes = Array.from({ length: stateCount }, (_, index) => index)
const actionCodes: ActionCode[] = [ACTION.up, ACTION.right, ACTION.down, ACTION.left, ACTION.stay]
const actionGlyphs: Record<ActionCode, string> = {
  [ACTION.up]: '↑',
  [ACTION.right]: '→',
  [ACTION.down]: '↓',
  [ACTION.left]: '←',
  [ACTION.stay]: '•',
}
const copy = computed(() => optimalityMessagesFor(props.locale))

const baselineConfig: OptimalityConfig = {
  discount: 0.9,
  slipProbability: 0,
  tolerance: 1e-12,
  maxSweeps: 1_000,
  rewards: {
    default: -0.04,
    boundary: -1,
    hazard: -1,
    goal: 1,
  },
}

const presets: Record<PresetKey, OptimalityConfig> = {
  baseline: baselineConfig,
  wind20: { ...baselineConfig, slipProbability: 0.2, rewards: { ...baselineConfig.rewards } },
  short: { ...baselineConfig, discount: 0.3, rewards: { ...baselineConfig.rewards } },
  long: { ...baselineConfig, discount: 0.95, rewards: { ...baselineConfig.rewards } },
}

const modeOptions: Array<{
  value: OptimalityMode
  key: 'modeBackups' | 'modePropagation' | 'modeContraction' | 'modeFactors' | 'modeAudit'
}> = [
  { value: 'backups', key: 'modeBackups' },
  { value: 'propagation', key: 'modePropagation' },
  { value: 'contraction', key: 'modeContraction' },
  { value: 'factors', key: 'modeFactors' },
  { value: 'audit', key: 'modeAudit' },
]

const config = reactive<OptimalityConfig>(cloneConfig(baselineConfig))
const appliedConfig = ref<OptimalityConfig>(cloneConfig(baselineConfig))
const snapshot = ref<OptimalitySnapshot>(emptySnapshot())
const reference = ref<OptimalityReference>(emptyReference())
const model = ref<OptimalityTransition[]>([])
const updates = ref<OptimalityUpdate[]>([])
const residualHistory = ref<number[]>([])
const lastMaxUpdate = ref<number | undefined>()
const mode = ref<OptimalityMode>('backups')
const selectedState = ref(5)
const selectedAction = ref<ActionCode>(ACTION.right)
const selectedPreset = ref<PresetKey>('baseline')
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
let pendingConfig: OptimalityConfig | undefined
let runTimer: ReturnType<typeof setTimeout> | undefined
let motionPreference: MediaQueryList | undefined
let pauseRequested = false
let animatedSweepsInRun = 0
let focusAfterResponse: HTMLElement | undefined

const canRestart = computed(() => phase.value !== 'loading' && !awaitingSweep.value)
const canReset = computed(() => phase.value === 'ready' && !awaitingSweep.value)
const canPause = computed(() => running.value)
const canSweep = computed(
  () =>
    phase.value === 'ready' &&
    !awaitingSweep.value &&
    !snapshot.value.converged &&
    !snapshot.value.truncated,
)
const configValidation = computed(() => optimalityConfigValidationError(config))
const validationDescription = computed(() =>
  configValidation.value
    ? `${copy.value.errorPrefix} ${localizedError(configValidation.value.code)}`
    : '',
)
const selectedUpdate = computed(() =>
  updates.value.find((update) => update.state === selectedState.value),
)
const selectedActionValues = computed(
  () => snapshot.value.actionValues[selectedState.value] ?? [0, 0, 0, 0, 0],
)
const selectedGreedyMask = computed(() => snapshot.value.greedyMasks[selectedState.value] ?? 0)
const selectedOutcomes = computed(() =>
  model.value.filter(
    (transition) =>
      transition.state === selectedState.value &&
      transition.requestedAction === selectedAction.value,
  ),
)
const ledgerRows = computed(() =>
  selectedOutcomes.value.map((transition) => {
    const nextValue = transition.nextState === 15
      ? 0
      : (snapshot.value.values[transition.nextState] ?? 0)
    const discountedNextValue = appliedConfig.value.discount * nextValue
    return {
      ...transition,
      nextValue,
      discountedNextValue,
      contribution:
        transition.probability * (transition.reward + discountedNextValue),
    }
  }),
)
const ledgerTotal = computed(() =>
  ledgerRows.value.reduce((total, row) => total + row.contribution, 0),
)
const operatorTotal = computed(() =>
  selectedState.value === 15 ? 0 : Math.max(...selectedActionValues.value),
)
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.statusLoading
  if (phase.value === 'error') return copy.value.statusError
  if (snapshot.value.converged) return copy.value.statusConverged
  if (snapshot.value.truncated) return copy.value.statusTruncated
  return copy.value.statusReady
})
const chartSample = computed(() => {
  const history = residualHistory.value
  const maximumVisiblePoints = 2_000
  if (history.length <= maximumVisiblePoints) {
    return history.map((value, index) => ({ index, value }))
  }

  const lastIndex = history.length - 1
  return Array.from({ length: maximumVisiblePoints }, (_, sampleIndex) => {
    const index = Math.round((sampleIndex / (maximumVisiblePoints - 1)) * lastIndex)
    return { index, value: history[index] ?? 0 }
  })
})
const chartPoints = computed(() => {
  if (chartSample.value.length === 0) return ''
  const width = 440
  const height = 142
  const padding = 14
  const logs = chartSample.value.map(({ index, value }) => ({
    index,
    value: Math.log10(Math.max(value, 1e-14)),
  }))
  const maximum = Math.max(...logs.map((point) => point.value))
  const minimum = Math.min(...logs.map((point) => point.value))
  const range = Math.max(maximum - minimum, 1)
  const denominator = Math.max(residualHistory.value.length - 1, 1)
  return logs
    .map((point) => {
      const x = padding + (point.index / denominator) * (width - padding * 2)
      const y = padding + ((maximum - point.value) / range) * (height - padding * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
const witnessBound = computed(() =>
  lastMaxUpdate.value === undefined
    ? undefined
    : appliedConfig.value.discount * lastMaxUpdate.value,
)
const contractionPass = computed(() => {
  if (witnessBound.value === undefined) return false
  const tolerance = 1e-10 * Math.max(1, Math.abs(witnessBound.value))
  return snapshot.value.residual <= witnessBound.value + tolerance
})
const changedGreedyCount = computed(() =>
  stateIndexes.filter(
    (state) => snapshot.value.greedyMasks[state] !== reference.value.greedyMasks[state],
  ).length,
)
const locallyComputedResidual = computed(() => residualFor(snapshot.value.values))
const auditItems = computed(() => [
  { label: copy.value.auditRows, pass: auditTransitionRows() },
  {
    label: copy.value.auditTerminal,
    pass:
      !model.value.some((transition) => transition.state === 15) &&
      snapshot.value.values[15] === 0 &&
      snapshot.value.greedyMasks[15] === 0,
  },
  { label: copy.value.auditFinite, pass: auditFinite() },
  { label: copy.value.auditActionSums, pass: auditActionSums() },
  { label: copy.value.auditGreedy, pass: auditGreedyMasks() },
  {
    label: copy.value.auditResidual,
    pass: approximatelyEqual(locallyComputedResidual.value, snapshot.value.residual, 1e-10),
  },
  { label: copy.value.auditReference, pass: auditReferenceResidual() },
  { label: copy.value.auditContraction, pass: contractionPass.value },
])

function cloneConfig(source: OptimalityConfig): OptimalityConfig {
  return { ...source, rewards: { ...source.rewards } }
}

function emptySnapshot(): OptimalitySnapshot {
  return {
    values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, () => Array(5).fill(0)),
    greedyMasks: Array(stateCount).fill(0),
    sweepCount: 0,
    residual: 0,
    converged: false,
    truncated: false,
  }
}

function emptyReference(): OptimalityReference {
  return {
    values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, () => Array(5).fill(0)),
    greedyMasks: Array(stateCount).fill(0),
    residual: Number.POSITIVE_INFINITY,
  }
}

function newRunId(): string {
  return `ch03-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function post(request: OptimalityWorkerRequest): void {
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
    nextWorker = new Worker(new URL('../workers/optimality.worker.ts', import.meta.url), {
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
  const validationError = optimalityConfigValidationError(nextConfig)
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
  lastMaxUpdate.value = undefined
  snapshot.value = emptySnapshot()
  reference.value = emptyReference()
  model.value = []
  phase.value = 'loading'
  setStatus(copy.value.loading)
  post({
    v: OPTIMALITY_PROTOCOL_VERSION,
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

function loadPreset(): void {
  if (!canRestart.value) return
  Object.assign(config, cloneConfig(presets[selectedPreset.value]))
  start(0)
}

function dispatchSweep(announce: boolean): void {
  if (!canSweep.value) return
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
  awaitingSweep.value = true
  setStatus(copy.value.working, announce)
  post({
    v: OPTIMALITY_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'sweep',
  })
}

function requestSweep(): void {
  if (!canSweep.value || running.value) return
  if (document.activeElement instanceof HTMLElement) {
    focusAfterResponse = document.activeElement
  }
  dispatchSweep(true)
}

function restorePendingFocus(): void {
  const target = focusAfterResponse
  focusAfterResponse = undefined
  if (!target) return
  void nextTick(() => {
    if (target.isConnected && !target.hasAttribute('disabled')) target.focus()
  })
}

function runToTolerance(): void {
  if (!canSweep.value || running.value) return
  pauseRequested = false
  animatedSweepsInRun = 0
  running.value = true
  setStatus(copy.value.working)
  if (prefersReducedMotion.value) {
    dispatchAdvance()
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
  if (!canPause.value) return
  const waitForCurrentSweep = awaitingSweep.value
  pause()
  if (waitForCurrentSweep) pauseRequested = true
  else setStatus(pausedMessage())
}

function pausedMessage(): string {
  return interpolate(copy.value.paused, {
    sweep: snapshot.value.sweepCount,
    residual: formatNumber(snapshot.value.residual),
  })
}

function scheduleSweep(): void {
  if (!running.value || !canSweep.value) return
  runTimer = setTimeout(() => {
    if (!running.value) return
    if (prefersReducedMotion.value || animatedSweepsInRun >= 10) dispatchAdvance()
    else dispatchSweep(false)
  }, prefersReducedMotion.value
    ? Math.min(speedMs.value, 80)
    : animatedSweepsInRun >= 10
      ? Math.min(speedMs.value, 120)
      : speedMs.value)
}

function dispatchAdvance(): void {
  if (!canSweep.value || !running.value) return
  awaitingSweep.value = true
  setStatus(copy.value.working, false)
  post({
    v: OPTIMALITY_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'advance',
    sweeps: 25,
  })
}

function resetValues(): void {
  if (!canReset.value) return
  pause()
  Object.assign(config, cloneConfig(appliedConfig.value))
  awaitingSweep.value = true
  setStatus(copy.value.working)
  post({
    v: OPTIMALITY_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'reset',
  })
}

function handleResponse(event: MessageEvent<OptimalityWorkerResponse>): void {
  const response = event.data
  if (!acceptsOptimalityResponse(response, currentRunId.value, lastSequence.value)) return
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
    reference.value = response.reference
    residualHistory.value = [...response.residualHistory]
    updates.value = []
    lastMaxUpdate.value = response.residualHistory.length > 1
      ? response.residualHistory.at(-2)
      : undefined
    finishStatus(response.snapshot)
    saveExperiment()
    return
  }

  if (response.kind === 'reset') {
    snapshot.value = response.snapshot
    updates.value = []
    residualHistory.value = [response.snapshot.residual]
    lastMaxUpdate.value = undefined
    setStatus(copy.value.resetDone)
    saveExperiment()
    return
  }

  if (response.kind === 'advanced') applyAdvance(response.outcome)
  else if (response.kind === 'chunked') applyChunk(response.outcome)
  else applySweep(response.outcome)
}

function finishStatus(nextSnapshot: OptimalitySnapshot): void {
  if (nextSnapshot.converged) {
    setStatus(interpolate(copy.value.converged, {
      sweep: nextSnapshot.sweepCount,
      residual: formatNumber(nextSnapshot.residual),
    }))
  } else if (nextSnapshot.truncated) {
    setStatus(copy.value.limitReached)
  } else {
    setStatus(copy.value.ready)
  }
}

function applySweep(outcome: OptimalitySweepOutcome): void {
  const automaticRun = running.value
  const announcePause = pauseRequested
  pauseRequested = false
  snapshot.value = outcome.snapshot
  updates.value = outcome.updates
  lastMaxUpdate.value = outcome.maxUpdate
  residualHistory.value.push(outcome.snapshot.residual)
  if (automaticRun) animatedSweepsInRun += 1

  if (outcome.snapshot.converged) {
    pause()
    finishStatus(outcome.snapshot)
  } else if (outcome.snapshot.truncated) {
    pause()
    finishStatus(outcome.snapshot)
  } else if (announcePause) {
    setStatus(pausedMessage())
  } else {
    setStatus(
      interpolate(copy.value.sweepDone, {
        sweep: outcome.snapshot.sweepCount,
        residual: formatNumber(outcome.snapshot.residual),
      }),
      !automaticRun,
    )
  }
  saveExperiment()
  scheduleSweep()
  restorePendingFocus()
}

function applyAdvance(outcome: OptimalityAdvanceOutcome): void {
  const appended = outcome.residualHistory.slice(residualHistory.value.length > 0 ? 1 : 0)
  residualHistory.value = [...residualHistory.value, ...appended]
  snapshot.value = outcome.snapshot
  updates.value = []
  lastMaxUpdate.value = residualHistory.value.length > 1
    ? residualHistory.value.at(-2)
    : undefined
  pause()
  finishStatus(outcome.snapshot)
  saveExperiment()
}

function applyChunk(outcome: OptimalityAdvanceOutcome): void {
  const announcePause = pauseRequested
  pauseRequested = false
  residualHistory.value = [
    ...residualHistory.value,
    ...outcome.residualHistory.slice(residualHistory.value.length > 0 ? 1 : 0),
  ]
  snapshot.value = outcome.snapshot
  updates.value = []
  lastMaxUpdate.value = residualHistory.value.length > 1
    ? residualHistory.value.at(-2)
    : undefined

  if (outcome.snapshot.converged || outcome.snapshot.truncated) {
    pause()
    finishStatus(outcome.snapshot)
  } else if (announcePause || !running.value) {
    pause()
    setStatus(pausedMessage())
  } else {
    setStatus(copy.value.working, false)
  }
  saveExperiment()
  scheduleSweep()
}

function localizedError(code: string): string {
  return (
    (copy.value.errors as Record<string, string>)[code] ??
    interpolate(copy.value.unknownError, { code })
  )
}

function isFieldInvalid(field: OptimalityConfigField): boolean {
  return configValidation.value?.field === field
}

function validationId(field: OptimalityConfigField): string | undefined {
  return isFieldInvalid(field) ? `optimality-validation-${props.locale}` : undefined
}

function actionName(action: ActionCode): string {
  return copy.value.actionNames[String(action) as keyof typeof copy.value.actionNames]
}

function actionList(mask: number): string {
  const names = actionCodes
    .filter((action) => maskIncludes(mask, action))
    .map(actionName)
  return names.length > 0 ? names.join(', ') : copy.value.none
}

function maskIncludes(mask: number, action: ActionCode): boolean {
  return (mask & (1 << action)) !== 0
}

function stateKind(state: number): string {
  if (state === 15) return copy.value.goalState
  if (state === 0) return copy.value.startState
  if (state === 6 || state === 9) return copy.value.hazardState
  return copy.value.ordinaryState
}

function formatNumber(value: number): string {
  const absolute = Math.abs(value)
  if (absolute > 0 && absolute < 0.00001) return value.toExponential(3)
  return new Intl.NumberFormat(props.locale, {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }).format(value)
}

function valueStyle(value: number): Record<string, string> {
  const scale = Math.max(...reference.value.values.map(Math.abs), 1)
  const normalized = Math.min(Math.abs(value) / scale, 1)
  const alpha = 0.08 + normalized * 0.5
  return {
    backgroundColor:
      value >= 0 ? `rgba(13, 118, 110, ${alpha})` : `rgba(190, 70, 60, ${alpha})`,
  }
}

function approximatelyEqual(left: number, right: number, tolerance = 1e-11): boolean {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right))
}

function numericTie(left: number, right: number): boolean {
  return Math.abs(left - right) <= 64 * Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right))
}

function expectedActionValue(state: number, action: ActionCode, values: number[]): number {
  return model.value
    .filter(
      (transition) =>
        transition.state === state && transition.requestedAction === action,
    )
    .reduce((sum, transition) => {
      const nextValue = transition.nextState === 15 ? 0 : (values[transition.nextState] ?? 0)
      return sum + transition.probability * (
        transition.reward + appliedConfig.value.discount * nextValue
      )
    }, 0)
}

function residualFor(values: number[]): number {
  if (model.value.length === 0 || values.length !== stateCount) return Number.POSITIVE_INFINITY
  let residual = Math.abs(values[15] ?? 0)
  for (const state of stateIndexes.slice(0, 15)) {
    const best = Math.max(...actionCodes.map((action) => expectedActionValue(state, action, values)))
    residual = Math.max(residual, Math.abs(best - (values[state] ?? 0)))
  }
  return residual
}

function auditTransitionRows(): boolean {
  if (model.value.length === 0) return false
  return stateIndexes.slice(0, 15).every((state) =>
    actionCodes.every((action) => {
      const row = model.value.filter(
        (transition) => transition.state === state && transition.requestedAction === action,
      )
      return (
        row.length > 0 &&
        row.every(
          (transition) =>
            Number.isFinite(transition.probability) &&
            transition.probability >= 0 &&
            transition.probability <= 1,
        ) &&
        approximatelyEqual(
          row.reduce((sum, transition) => sum + transition.probability, 0),
          1,
        )
      )
    }),
  )
}

function auditFinite(): boolean {
  return (
    Number.isFinite(snapshot.value.residual) &&
    Number.isFinite(reference.value.residual) &&
    model.value.every((transition) =>
      Number.isFinite(transition.probability) && Number.isFinite(transition.reward),
    ) &&
    snapshot.value.values.every(Number.isFinite) &&
    snapshot.value.actionValues.flat().every(Number.isFinite) &&
    reference.value.values.every(Number.isFinite) &&
    reference.value.actionValues.flat().every(Number.isFinite)
  )
}

function auditActionSums(): boolean {
  if (model.value.length === 0) return false
  return stateIndexes.slice(0, 15).every((state) =>
    actionCodes.every((action) => approximatelyEqual(
      expectedActionValue(state, action, snapshot.value.values),
      snapshot.value.actionValues[state]?.[action] ?? Number.NaN,
      1e-10,
    )),
  )
}

function auditGreedyMasks(): boolean {
  return stateIndexes.every((state) => {
    if (state === 15) return snapshot.value.greedyMasks[state] === 0
    const row = snapshot.value.actionValues[state]
    if (!row || row.length !== 5) return false
    const best = Math.max(...row)
    const expectedMask = actionCodes.reduce<number>(
      (mask, action) => numericTie(row[action] ?? Number.NaN, best)
        ? mask | (1 << action)
        : mask,
      0,
    )
    return snapshot.value.greedyMasks[state] === expectedMask
  })
}

function auditReferenceResidual(): boolean {
  if (model.value.length === 0 || reference.value.values.length !== stateCount) return false
  const scale = Math.max(1, ...reference.value.values.map(Math.abs))
  const threshold = 1e-10 * scale
  return (
    reference.value.residual <= threshold &&
    residualFor(reference.value.values) <= threshold
  )
}

function saveExperiment(): void {
  if (phase.value !== 'ready') return
  const payload = JSON.stringify({
    v: storageVersion,
    config: cloneConfig(appliedConfig.value),
    sweepCount: snapshot.value.sweepCount,
    mode: mode.value,
    selectedState: selectedState.value,
    selectedAction: selectedAction.value,
    selectedPreset: selectedPreset.value,
    speedMs: speedMs.value,
  })
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.setItem(storageKey, payload)
    } catch {
      // Persistence is optional; the live Worker remains fully functional.
    }
  }
}

function restoreExperiment(): number {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(storageKey)
      if (!raw) continue
      const saved = JSON.parse(raw) as {
        v?: unknown
        config?: unknown
        sweepCount?: unknown
        mode?: unknown
        selectedState?: unknown
        selectedAction?: unknown
        selectedPreset?: unknown
        speedMs?: unknown
      }
      const restored = saved.config
      const validation = optimalityConfigValidationError(restored)
      if (
        saved.v !== storageVersion ||
        validation ||
        typeof saved.sweepCount !== 'number' ||
        !Number.isInteger(saved.sweepCount) ||
        saved.sweepCount < 0 ||
        saved.sweepCount > (restored as OptimalityConfig).maxSweeps
      ) continue

      Object.assign(config, cloneConfig(restored as OptimalityConfig))
      if (modeOptions.some((option) => option.value === saved.mode)) {
        mode.value = saved.mode as OptimalityMode
      }
      if (
        typeof saved.selectedState === 'number' &&
        Number.isInteger(saved.selectedState) &&
        saved.selectedState >= 0 &&
        saved.selectedState < stateCount
      ) selectedState.value = saved.selectedState
      if (
        typeof saved.selectedAction === 'number' &&
        actionCodes.includes(saved.selectedAction as ActionCode)
      ) selectedAction.value = saved.selectedAction as ActionCode
      if (
        saved.selectedPreset === 'baseline' ||
        saved.selectedPreset === 'wind20' ||
        saved.selectedPreset === 'short' ||
        saved.selectedPreset === 'long'
      ) selectedPreset.value = saved.selectedPreset
      if (
        typeof saved.speedMs === 'number' &&
        Number.isFinite(saved.speedMs) &&
        saved.speedMs >= 80 &&
        saved.speedMs <= 1_200
      ) speedMs.value = saved.speedMs
      return saved.sweepCount
    } catch {
      // Try the other storage area, then fall back to the baseline.
    }
  }
  return 0
}

watch([mode, selectedState, selectedAction, selectedPreset, speedMs], saveExperiment)

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
    class="grid-lab optimality-lab"
    :aria-labelledby="`optimality-lab-title-${locale}`"
    :data-sweep-count="snapshot.sweepCount"
    :data-converged="snapshot.converged"
    :data-truncated="snapshot.truncated"
    :data-selected-state="selectedState"
    :data-selected-action="selectedAction"
    :data-discount="appliedConfig.discount"
    :data-wind="appliedConfig.slipProbability"
    :aria-busy="phase === 'loading' || awaitingSweep"
  >
    <header class="grid-lab__header">
      <div>
        <p class="grid-lab__eyebrow">{{ copy.eyebrow }}</p>
        <h2 :id="`optimality-lab-title-${locale}`">{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </div>
      <span class="engine-chip" :data-phase="phase">
        <span aria-hidden="true" class="engine-chip__dot" />
        {{ engineVersion ? interpolate(copy.version, { version: engineVersion }) : copy.engine }}
      </span>
    </header>

    <p class="bellman-lab__deterministic">{{ copy.deterministic }}</p>

    <section class="optimality-controls" :aria-label="copy.controls">
      <div class="optimality-preset-control">
        <label>
          <span>{{ copy.preset }}</span>
          <select v-model="selectedPreset">
            <option value="baseline">{{ copy.presetBaseline }}</option>
            <option value="wind20">{{ copy.presetWind }}</option>
            <option value="short">{{ copy.presetShort }}</option>
            <option value="long">{{ copy.presetLong }}</option>
          </select>
        </label>
        <button class="lab-button" type="button" :disabled="!canRestart" :aria-disabled="!canRestart" @click="loadPreset">
          {{ copy.loadPreset }}
        </button>
      </div>

      <label>
        <span>{{ copy.discount }}</span>
        <input
          v-model.number="config.discount"
          type="number"
          min="0"
          max="0.99"
          step="any"
          :aria-invalid="isFieldInvalid('discount')"
          :aria-describedby="validationId('discount')"
        />
      </label>
      <label>
        <span>{{ copy.wind }}</span>
        <input
          v-model.number="config.slipProbability"
          type="number"
          min="0"
          max="1"
          step="0.05"
          :aria-invalid="isFieldInvalid('slipProbability')"
          :aria-describedby="validationId('slipProbability')"
        />
      </label>
      <label>
        <span>{{ copy.defaultReward }}</span>
        <input
          v-model.number="config.rewards.default"
          type="number"
          min="-1000000"
          max="1000000"
          step="any"
          :aria-invalid="isFieldInvalid('defaultReward')"
          :aria-describedby="validationId('defaultReward')"
        />
      </label>
      <label>
        <span>{{ copy.boundaryReward }}</span>
        <input
          v-model.number="config.rewards.boundary"
          type="number"
          min="-1000000"
          max="1000000"
          step="any"
          :aria-invalid="isFieldInvalid('boundaryReward')"
          :aria-describedby="validationId('boundaryReward')"
        />
      </label>
      <label>
        <span>{{ copy.hazardReward }}</span>
        <input
          v-model.number="config.rewards.hazard"
          type="number"
          min="-1000000"
          max="1000000"
          step="any"
          :aria-invalid="isFieldInvalid('hazardReward')"
          :aria-describedby="validationId('hazardReward')"
        />
      </label>
      <label>
        <span>{{ copy.goalReward }}</span>
        <input
          v-model.number="config.rewards.goal"
          type="number"
          min="-1000000"
          max="1000000"
          step="any"
          :aria-invalid="isFieldInvalid('goalReward')"
          :aria-describedby="validationId('goalReward')"
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
          :aria-invalid="isFieldInvalid('tolerance')"
          :aria-describedby="validationId('tolerance')"
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
          :aria-invalid="isFieldInvalid('maxSweeps')"
          :aria-describedby="validationId('maxSweeps')"
        />
      </label>
      <label>
        <span>{{ interpolate(copy.speed, { milliseconds: speedMs }) }}</span>
        <input v-model.number="speedMs" type="range" min="80" max="1200" step="10" />
      </label>

      <div class="optimality-controls__buttons">
        <button class="lab-button" type="button" :disabled="!canRestart" :aria-disabled="!canRestart" @click="restart">
          {{ copy.apply }}
        </button>
        <button class="lab-button" type="button" :disabled="!canSweep || running" :aria-disabled="!canSweep || running" @click="requestSweep">
          {{ copy.step }}
        </button>
        <button class="lab-button lab-button--primary" type="button" :disabled="!canSweep || running" :aria-disabled="!canSweep || running" @click="runToTolerance">
          {{ copy.run }}
        </button>
        <button class="lab-button" type="button" :disabled="!canPause" :aria-disabled="!canPause" @click="pauseRun">
          {{ copy.pause }}
        </button>
        <button class="lab-button" type="button" :disabled="!canReset" :aria-disabled="!canReset" @click="resetValues">
          {{ copy.reset }}
        </button>
      </div>
    </section>

    <p :id="`optimality-validation-${locale}`" class="sr-only">
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

    <div class="optimality-workspace">
      <section class="optimality-map-panel" :aria-labelledby="`optimality-map-title-${locale}`">
        <h3 :id="`optimality-map-title-${locale}`">{{ copy.mapTitle }}</h3>
        <p>{{ copy.mapBody }}</p>
        <div class="optimality-grid">
          <button
            v-for="state in stateIndexes"
            :key="state"
            class="optimality-state"
            :class="{
              'optimality-state--selected': selectedState === state,
              'optimality-state--hazard': state === 6 || state === 9,
              'optimality-state--goal': state === 15,
            }"
            :style="valueStyle(snapshot.values[state] ?? 0)"
            :data-state="state"
            :data-value="snapshot.values[state] ?? 0"
            :data-greedy-mask="snapshot.greedyMasks[state] ?? 0"
            type="button"
            :aria-pressed="selectedState === state"
            :aria-label="interpolate(copy.stateAria, {
              state,
              kind: stateKind(state),
              value: formatNumber(snapshot.values[state] ?? 0),
              reference: formatNumber(reference.values[state] ?? 0),
              actions: actionList(snapshot.greedyMasks[state] ?? 0),
            })"
            @click="selectedState = state"
          >
            <span class="optimality-state__label">s{{ state }} · {{ stateKind(state) }}</span>
            <strong>{{ formatNumber(snapshot.values[state] ?? 0) }}</strong>
            <span class="optimality-state__arrows" aria-hidden="true">
              <template v-for="action in actionCodes" :key="action">
                <b v-if="maskIncludes(snapshot.greedyMasks[state] ?? 0, action)">{{ actionGlyphs[action] }}</b>
              </template>
              <b v-if="(snapshot.greedyMasks[state] ?? 0) === 0">—</b>
            </span>
            <small>{{ copy.greedy }}: {{ actionList(snapshot.greedyMasks[state] ?? 0) }}</small>
          </button>
        </div>
        <h4 class="optimality-numeric-title">{{ copy.numericTable }}</h4>
        <div class="optimality-map-fallback mini-table-wrap">
          <table class="mini-table">
            <thead>
              <tr><th scope="col">s</th><th scope="col">{{ copy.currentValue }}</th><th scope="col">{{ copy.referenceValue }}</th><th scope="col">{{ copy.greedy }}</th><th scope="col">{{ copy.referenceGreedy }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="state in stateIndexes" :key="state" :data-numeric-state="state">
                <th scope="row">s{{ state }}</th>
                <td :data-selected-value="selectedState === state || undefined">{{ formatNumber(snapshot.values[state] ?? 0) }}</td>
                <td>{{ formatNumber(reference.values[state] ?? 0) }}</td>
                <td>{{ actionList(snapshot.greedyMasks[state] ?? 0) }}</td>
                <td>{{ actionList(reference.greedyMasks[state] ?? 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="mode === 'backups'" class="optimality-view-panel optimality-backups-panel">
        <h3>{{ interpolate(copy.backupsTitle, { state: selectedState }) }}</h3>
        <p>{{ copy.backupsBody }}</p>
        <p v-if="selectedUpdate" class="lab-panel__hint">
          {{ interpolate(copy.lastUpdate, {
            state: selectedState,
            oldValue: formatNumber(selectedUpdate.oldValue),
            newValue: formatNumber(selectedUpdate.newValue),
            delta: formatNumber(Math.abs(selectedUpdate.delta)),
          }) }}
        </p>
        <p class="optimality-vector-basis">{{ copy.currentImage }}</p>

        <p v-if="selectedState === 15" class="lab-panel__hint">{{ copy.terminalNoActions }}</p>
        <template v-else>
          <div class="mini-table-wrap">
            <table class="mini-table optimality-action-table">
              <thead>
                <tr><th scope="col">{{ copy.requestedAction }}</th><th scope="col">{{ copy.actionValue }}</th><th scope="col">{{ copy.greedyStatus }}</th></tr>
              </thead>
              <tbody>
                <tr
                  v-for="action in actionCodes"
                  :key="action"
                  :data-action="action"
                  :data-greedy="maskIncludes(selectedGreedyMask, action)"
                >
                  <th scope="row">
                    <button
                      class="optimality-action-select"
                      type="button"
                      :aria-pressed="selectedAction === action"
                      :aria-label="interpolate(copy.selectAction, { action: actionName(action) })"
                      @click="selectedAction = action"
                    >
                      <span aria-hidden="true">{{ actionGlyphs[action] }}</span>
                      {{ actionName(action) }}
                    </button>
                  </th>
                  <td :data-q-value="selectedActionValues[action] ?? 0">{{ formatNumber(selectedActionValues[action] ?? 0) }}</td>
                  <td>{{ maskIncludes(selectedGreedyMask, action) ? copy.yes : copy.no }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><th scope="row">{{ copy.operatorTotal }}</th><td colspan="2" :data-operator-total="operatorTotal">{{ formatNumber(operatorTotal) }}</td></tr>
              </tfoot>
            </table>
          </div>

          <h4>{{ interpolate(copy.ledgerTitle, { action: actionName(selectedAction) }) }}</h4>
          <p>{{ copy.ledgerBody }}</p>
          <div class="mini-table-wrap">
            <table class="mini-table optimality-ledger-table">
              <thead>
                <tr>
                  <th scope="col">{{ copy.actualAction }}</th>
                  <th scope="col">{{ copy.nextState }}</th>
                  <th scope="col">{{ copy.probability }}</th>
                  <th scope="col">{{ copy.reward }}</th>
                  <th scope="col">{{ copy.nextValue }}</th>
                  <th scope="col">{{ copy.discountedNext }}</th>
                  <th scope="col">{{ copy.contribution }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in ledgerRows" :key="`${row.actualAction}-${row.nextState}-${index}`">
                  <td>{{ actionName(row.actualAction) }}</td>
                  <td>s{{ row.nextState }}<small v-if="row.boundaryCollision"> · {{ copy.boundary }}</small></td>
                  <td :data-probability="row.probability">{{ formatNumber(row.probability) }}</td>
                  <td>{{ formatNumber(row.reward) }}</td>
                  <td>{{ formatNumber(row.nextValue) }}</td>
                  <td>{{ formatNumber(row.discountedNextValue) }}</td>
                  <td :data-contribution="row.contribution">{{ formatNumber(row.contribution) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><th colspan="6" scope="row">{{ copy.ledgerTotal }}</th><td :data-ledger-total="ledgerTotal">{{ formatNumber(ledgerTotal) }}</td></tr>
              </tfoot>
            </table>
          </div>
        </template>
      </section>

      <section v-else-if="mode === 'propagation'" class="optimality-view-panel">
        <h3>{{ copy.propagationTitle }}</h3>
        <p>{{ copy.propagationBody }}</p>
        <svg
          class="optimality-residual-chart"
          viewBox="0 0 440 142"
          role="img"
          :data-visible-points="chartSample.length"
          :aria-labelledby="`optimality-history-title-${locale} optimality-history-desc-${locale}`"
        >
          <title :id="`optimality-history-title-${locale}`">{{ copy.historyAria }}</title>
          <desc :id="`optimality-history-desc-${locale}`">{{ copy.historyDescription }}</desc>
          <line x1="14" y1="128" x2="426" y2="128" />
          <line x1="14" y1="14" x2="14" y2="128" />
          <polyline v-if="chartPoints" :points="chartPoints" />
        </svg>
        <div class="optimality-history-table mini-table-wrap">
          <table class="mini-table">
            <thead><tr><th scope="col">{{ copy.sweep }}</th><th scope="col">{{ copy.residual }}</th></tr></thead>
            <tbody>
              <tr v-for="(value, index) in residualHistory" :key="index">
                <th scope="row">{{ index === 0 ? copy.initial : index }}</th>
                <td :data-residual-index="index">{{ formatNumber(value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="formula-card optimality-equation-card">
          <span>{{ copy.lastMaxUpdate }}</span>
          <strong :data-last-max-update="lastMaxUpdate">{{ lastMaxUpdate === undefined ? '—' : formatNumber(lastMaxUpdate) }}</strong>
        </div>
      </section>

      <section v-else-if="mode === 'contraction'" class="optimality-view-panel optimality-contraction-panel">
        <h3>{{ copy.contractionTitle }}</h3>
        <p>{{ copy.contractionBody }}</p>
        <p v-if="lastMaxUpdate === undefined" class="lab-panel__hint">{{ copy.noCommittedSweep }}</p>
        <template v-else>
          <div class="optimality-witness" :data-pass="contractionPass">
            <div><span>{{ copy.witnessLeft }}</span><strong :data-witness-residual="snapshot.residual">{{ formatNumber(snapshot.residual) }}</strong></div>
            <b aria-hidden="true">≤</b>
            <div><span>{{ copy.witnessRight }}</span><strong :data-witness-bound="witnessBound ?? 0">{{ formatNumber(witnessBound ?? 0) }}</strong></div>
          </div>
          <p class="lab-panel__hint">
            {{ interpolate(contractionPass ? copy.witnessPass : copy.witnessFail, {
              residual: formatNumber(snapshot.residual),
              bound: formatNumber(witnessBound ?? 0),
            }) }}
          </p>
          <div class="formula-card optimality-equation-card"><strong>{{ copy.witnessEquation }}</strong></div>
        </template>
      </section>

      <section v-else-if="mode === 'factors'" class="optimality-view-panel">
        <h3>{{ copy.factorsTitle }}</h3>
        <p>{{ copy.factorsBody }}</p>
        <dl class="optimality-factor-list">
          <div><dt>{{ copy.factorDiscount }}</dt><dd>γ = {{ formatNumber(appliedConfig.discount) }}</dd></div>
          <div><dt>{{ copy.factorWind }}</dt><dd>w = {{ formatNumber(appliedConfig.slipProbability) }}</dd></div>
          <div>
            <dt>{{ copy.factorRewards }}</dt>
            <dd>({{ formatNumber(appliedConfig.rewards.default) }}, {{ formatNumber(appliedConfig.rewards.boundary) }}, {{ formatNumber(appliedConfig.rewards.hazard) }}, {{ formatNumber(appliedConfig.rewards.goal) }})</dd>
          </div>
        </dl>
        <p class="lab-panel__hint">{{ interpolate(copy.factorStatesChanged, { count: changedGreedyCount }) }}</p>
        <div class="mini-table-wrap">
          <table class="mini-table optimality-reference-table">
            <thead><tr><th scope="col">s</th><th scope="col">{{ copy.currentValue }}</th><th scope="col">{{ copy.referenceValue }}</th><th scope="col">{{ copy.referenceGreedy }}</th></tr></thead>
            <tbody>
              <tr v-for="state in stateIndexes" :key="state">
                <th scope="row">s{{ state }}</th>
                <td>{{ formatNumber(snapshot.values[state] ?? 0) }}</td>
                <td>{{ formatNumber(reference.values[state] ?? 0) }}</td>
                <td>{{ actionList(reference.greedyMasks[state] ?? 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="optimality-view-panel">
        <h3>{{ copy.auditTitle }}</h3>
        <p>{{ copy.auditBody }}</p>
        <ul class="audit-list optimality-audit-list">
          <li v-for="item in auditItems" :key="item.label" :data-pass="item.pass">
            <span>{{ item.pass ? '✓' : '!' }}</span>
            <span>{{ item.label }}</span>
            <strong>{{ item.pass ? copy.pass : copy.fail }}</strong>
          </li>
        </ul>
      </section>
    </div>

    <div class="metric-strip" :aria-label="copy.metrics">
      <div><span>{{ copy.sweeps }}</span><strong data-metric-sweeps>{{ snapshot.sweepCount }}</strong></div>
      <div><span>{{ copy.residual }}</span><strong data-metric-residual>{{ formatNumber(snapshot.residual) }}</strong></div>
      <div><span>{{ copy.lastMaxUpdate }}</span><strong>{{ lastMaxUpdate === undefined ? '—' : formatNumber(lastMaxUpdate) }}</strong></div>
      <div><span>{{ copy.referenceResidual }}</span><strong>{{ formatNumber(reference.residual) }}</strong></div>
      <div><span>{{ copy.status }}</span><strong>{{ statusLabel }}</strong></div>
    </div>

    <p class="grid-lab__status" :data-phase="phase">{{ visualStatus }}</p>
    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
  </section>
</template>
