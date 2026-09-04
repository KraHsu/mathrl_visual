<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  PLANNING_MODES,
  PLANNING_PROTOCOL_VERSION,
  acceptsPlanningResponse,
  planningConfigValidationError,
  type PlanningConfig,
  type PlanningConfigField,
  type PlanningMode,
  type PlanningOutcome,
  type PlanningReference,
  type PlanningRunState,
  type PlanningSnapshot,
  type PlanningTransition,
  type PlanningWorkerRequest,
  type PlanningWorkerResponse,
} from '../planningProtocol'
import { planningMessagesFor } from '../i18n/planningMessages'
import { interpolate, type Locale } from '../i18n/messages'
import { ACTION, type ActionCode } from '../protocol'

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'en',
})

const storageVersion = 1
const storageKey = `mathrl:exp-ch04-planning:v${storageVersion}`
const stateCount = 16
const actionCodes: ActionCode[] = [ACTION.up, ACTION.right, ACTION.down, ACTION.left, ACTION.stay]
const stateIndexes = Array.from({ length: stateCount }, (_, index) => index)
const actionGlyphs: Record<ActionCode, string> = {
  [ACTION.up]: '↑',
  [ACTION.right]: '→',
  [ACTION.down]: '↓',
  [ACTION.left]: '←',
  [ACTION.stay]: '•',
}
type ModeOption = {
  value: PlanningMode
  key:
    | 'modeValueIteration'
    | 'modePolicyIteration'
    | 'modeTruncatedPolicyIteration'
}
const modeOptions: ModeOption[] = [
  { value: 'value_iteration', key: 'modeValueIteration' },
  { value: 'policy_iteration', key: 'modePolicyIteration' },
  { value: 'truncated_policy_iteration', key: 'modeTruncatedPolicyIteration' },
]
const copy = computed(() => planningMessagesFor(props.locale))

const baselineConfig: PlanningConfig = {
  discount: 0.9,
  slipProbability: 0,
  tolerance: 1e-10,
  maxOuterIterations: 100,
  evaluationSweeps: 1,
  maxEvaluationSweeps: 1_000,
  rewards: {
    default: -0.04,
    boundary: -1,
    hazard: -1,
    goal: 1,
  },
}
const presets: Record<'baseline' | 'wind20' | 'short' | 'long', PlanningConfig> = {
  baseline: cloneConfig(baselineConfig),
  wind20: { ...baselineConfig, slipProbability: 0.2, rewards: { ...baselineConfig.rewards } },
  short: { ...baselineConfig, discount: 0.3, rewards: { ...baselineConfig.rewards } },
  long: { ...baselineConfig, discount: 0.95, rewards: { ...baselineConfig.rewards } },
}

const config = reactive<PlanningConfig>(cloneConfig(baselineConfig))
const appliedConfig = ref<PlanningConfig>(cloneConfig(baselineConfig))
const reference = ref<PlanningReference>(emptyReference())
const model = ref<PlanningTransition[]>([])
const runs = reactive<Record<PlanningMode, PlanningRunState>>(emptyRuns())
const selectedMode = ref<PlanningMode>('value_iteration')
const selectedState = ref(0)
const selectedAction = ref<ActionCode>(ACTION.right)
const selectedPreset = ref<'baseline' | 'wind20' | 'short' | 'long'>('baseline')
const speedMs = ref(300)
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const announcement = ref('')
const visualStatus = ref('')
const prefersReducedMotion = ref(false)
const engineVersion = ref('')
const currentRunId = ref('')
const lastSequence = ref(-1)
const awaitingMode = ref<PlanningMode | undefined>()
const runningMode = ref<PlanningMode | undefined>()
const pauseRequested = ref(false)
const animatedIterations = ref(0)
const queuedModes = ref<PlanningMode[]>([])
const costViolation = ref(false)
let worker: Worker | undefined
let pendingConfig: PlanningConfig | undefined
let runTimer: ReturnType<typeof setTimeout> | undefined
let motionPreference: MediaQueryList | undefined
let focusAfterResponse: HTMLElement | undefined

const selectedRun = computed(() => runs[selectedMode.value])
const configValidation = computed(() => planningConfigValidationError(config))
const validationDescription = computed(() =>
  configValidation.value
    ? `${copy.value.errorPrefix} ${localizedError(configValidation.value.code)}`
    : '',
)
const canRestart = computed(() => phase.value !== 'loading' && !awaitingMode.value)
const canReset = computed(() => phase.value === 'ready' && !awaitingMode.value)
const canStep = computed(
  () =>
    phase.value === 'ready' &&
    !awaitingMode.value &&
    !selectedRun.value.snapshot.converged &&
    !selectedRun.value.snapshot.truncated,
)
const canPause = computed(() => runningMode.value !== undefined)
const selectedActionValues = computed(
  () => selectedRun.value.snapshot.actionValues[selectedState.value] ?? [0, 0, 0, 0, 0],
)
const selectedGreedyMask = computed(
  () => selectedRun.value.snapshot.greedyMasks[selectedState.value] ?? 0,
)
const selectedPolicyMask = computed(
  () => selectedRun.value.snapshot.policyMasks[selectedState.value] ?? 0,
)
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
      : (selectedRun.value.snapshot.values[transition.nextState] ?? 0)
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
  if (selectedRun.value.snapshot.converged) return copy.value.statusConverged
  if (selectedRun.value.snapshot.truncated) return copy.value.statusTruncated
  return copy.value.statusReady
})
const latestPhases = computed(() => selectedRun.value.phases.slice(-8))
const chartSeries = computed(() => {
  const allValues = PLANNING_MODES.flatMap((mode) => runs[mode].residualHistory)
    .filter((value) => Number.isFinite(value) && value > 0)
  const maximum = Math.max(...allValues, 1)
  const minimum = Math.min(...allValues, 1e-14)
  const maxLog = Math.log10(maximum)
  const minLog = Math.log10(Math.max(minimum, 1e-14))
  const range = Math.max(maxLog - minLog, 1)
  const width = 560
  const height = 180
  const padX = 22
  const padY = 18
  return Object.fromEntries(
    PLANNING_MODES.map((mode) => {
      const history = sampledHistory(mode, 1_000)
      const denominator = Math.max(runs[mode].residualHistory.length - 1, 1)
      const points = history.map(({ value: raw, index }) => {
        const value = Math.log10(Math.max(raw, 1e-14))
        const x = padX + (index / denominator) * (width - padX * 2)
        const y = padY + ((maxLog - value) / range) * (height - padY * 2)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      }).join(' ')
      return [mode, points]
    }),
  ) as Record<PlanningMode, string>
})
const chartSampleCount = computed(() =>
  Math.max(...PLANNING_MODES.map((mode) => Math.min(runs[mode].residualHistory.length, 1_000)), 0),
)
const auditItems = computed(() => [
  { label: copy.value.auditRows, pass: auditTransitionRows() },
  {
    label: copy.value.auditTerminal,
    pass: PLANNING_MODES.every((mode) => {
      const snapshot = runs[mode].snapshot
      return snapshot.values[15] === 0 && snapshot.policyMasks[15] === 0 && snapshot.policy[15] === -1
    }),
  },
  { label: copy.value.auditFinite, pass: auditFinite() },
  { label: copy.value.auditPolicies, pass: auditPolicies() },
  { label: copy.value.auditCosts, pass: !costViolation.value },
  { label: copy.value.auditReference, pass: auditReference() },
  { label: copy.value.auditModes, pass: auditModes() },
])

function cloneConfig(source: PlanningConfig): PlanningConfig {
  return { ...source, rewards: { ...source.rewards } }
}

function emptyReference(): PlanningReference {
  return {
    values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, () => Array(5).fill(0)),
    greedyMasks: Array(stateCount).fill(0),
    residual: Number.POSITIVE_INFINITY,
  }
}

function emptySnapshot(mode: PlanningMode): PlanningSnapshot {
  return {
    mode,
    values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, () => Array(5).fill(0)),
    greedyMasks: Array(stateCount).fill(0),
    policyMasks: Array(stateCount).fill(0),
    policy: Array(stateCount).fill(-1),
    outerIteration: 0,
    evaluationSweep: 0,
    residual: 0,
    valueResidual: 0,
    evaluationResidual: 0,
    policyStable: false,
    converged: false,
    truncated: false,
    cost: { backups: 0, actionEvaluations: 0, policyEvaluations: 0, improvementSteps: 0 },
  }
}

function emptyRun(mode: PlanningMode): PlanningRunState {
  const snapshot = emptySnapshot(mode)
  return { snapshot, reference: emptyReference(), residualHistory: [0], updates: [], phases: [] }
}

function emptyRuns(): Record<PlanningMode, PlanningRunState> {
  return Object.fromEntries(PLANNING_MODES.map((mode) => [mode, emptyRun(mode)])) as Record<PlanningMode, PlanningRunState>
}

function sampledHistory(mode: PlanningMode, limit = 500): Array<{ index: number; value: number }> {
  const history = runs[mode].residualHistory
  if (history.length <= limit) {
    return history.map((value, index) => ({ index, value }))
  }
  const last = history.length - 1
  return Array.from({ length: limit }, (_, sample) => {
    const index = Math.round((sample / (limit - 1)) * last)
    return { index, value: history[index] ?? 0 }
  })
}

function newRunId(): string {
  return `ch04-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function post(request: PlanningWorkerRequest): void {
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
    nextWorker = new Worker(new URL('../workers/planning.worker.ts', import.meta.url), {
      type: 'module',
    })
  } catch {
    awaitingMode.value = undefined
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
    awaitingMode.value = undefined
    pendingConfig = undefined
    phase.value = 'error'
    setStatus(copy.value.failed)
    nextWorker.terminate()
    worker = undefined
  })
  worker = nextWorker
  return true
}

function start(restore?: Partial<Record<PlanningMode, number>>): void {
  pause()
  pauseRequested.value = false
  animatedIterations.value = 0
  const nextConfig = cloneConfig(config)
  const validationError = planningConfigValidationError(nextConfig)
  if (validationError) {
    awaitingMode.value = undefined
    pendingConfig = undefined
    phase.value = 'error'
    setStatus(`${copy.value.errorPrefix} ${localizedError(validationError.code)}`)
    return
  }
  if (!worker && !createWorker()) return
  pendingConfig = nextConfig
  currentRunId.value = newRunId()
  lastSequence.value = -1
  awaitingMode.value = undefined
  queuedModes.value = []
  costViolation.value = false
  reference.value = emptyReference()
  model.value = []
  phase.value = 'loading'
  setStatus(copy.value.loading)
  post({
    v: PLANNING_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'start',
    config: nextConfig,
    restore: restore ?? { value_iteration: 0, policy_iteration: 0, truncated_policy_iteration: 0 },
  })
}

function restart(): void {
  if (!canRestart.value) return
  start()
}

function loadPreset(): void {
  if (!canRestart.value) return
  Object.assign(config, cloneConfig(presets[selectedPreset.value]))
  start()
}

function dispatch(kind: 'step' | 'advance' | 'run' | 'reset', mode: PlanningMode, outerSteps = 1): void {
  if (!worker || phase.value !== 'ready' || awaitingMode.value) return
  awaitingMode.value = mode
  if (kind === 'step' || kind === 'reset') {
    post({ v: PLANNING_PROTOCOL_VERSION, runId: currentRunId.value, kind, mode })
  } else if (kind === 'advance') {
    post({ v: PLANNING_PROTOCOL_VERSION, runId: currentRunId.value, kind, mode, outerSteps })
  } else {
    post({ v: PLANNING_PROTOCOL_VERSION, runId: currentRunId.value, kind, mode })
  }
}

function requestStep(): void {
  if (!canStep.value || runningMode.value) return
  if (document.activeElement instanceof HTMLElement) focusAfterResponse = document.activeElement
  dispatch('step', selectedMode.value)
}

/** Queue one synchronous outer iteration for each algorithm for fair comparison. */
function stepAll(): void {
  if (phase.value !== 'ready' || awaitingMode.value || runningMode.value) return
  queuedModes.value = [...PLANNING_MODES]
  dispatchNextQueued()
}

function dispatchNextQueued(): void {
  const next = queuedModes.value.shift()
  if (!next) {
    setStatus(copy.value.ready)
    return
  }
  if (runs[next].snapshot.converged || runs[next].snapshot.truncated) {
    dispatchNextQueued()
    return
  }
  dispatch('step', next)
}

function runSelected(): void {
  if (!canStep.value || runningMode.value) return
  pauseRequested.value = false
  animatedIterations.value = 0
  runningMode.value = selectedMode.value
  setStatus(copy.value.working)
  if (prefersReducedMotion.value) dispatch('advance', selectedMode.value, 25)
  else dispatch('step', selectedMode.value)
}

function pause(): void {
  runningMode.value = undefined
  if (runTimer) clearTimeout(runTimer)
  runTimer = undefined
}

function pauseRun(): void {
  if (!runningMode.value) return
  pauseRequested.value = true
  const mode = runningMode.value
  pause()
  if (!awaitingMode.value) {
    pauseRequested.value = false
    setStatus(interpolate(copy.value.paused, {
      algorithm: algorithmName(mode),
      iteration: runs[mode].snapshot.outerIteration,
      residual: formatNumber(runs[mode].snapshot.residual),
    }))
  }
}

function scheduleRun(mode: PlanningMode): void {
  if (pauseRequested.value || runningMode.value !== mode) return
  if (runs[mode].snapshot.converged || runs[mode].snapshot.truncated) return
  runTimer = setTimeout(() => {
    if (runningMode.value !== mode || pauseRequested.value) return
    if (prefersReducedMotion.value || animatedIterations.value >= 8) {
      dispatch('advance', mode, 25)
    } else {
      dispatch('step', mode)
    }
  }, prefersReducedMotion.value ? Math.min(speedMs.value, 80) : speedMs.value)
}

function resetSelected(): void {
  if (!canReset.value) return
  pause()
  pauseRequested.value = false
  dispatch('reset', selectedMode.value)
  setStatus(copy.value.working)
}

function restorePendingFocus(): void {
  const target = focusAfterResponse
  focusAfterResponse = undefined
  if (!target) return
  void nextTick(() => {
    if (target.isConnected && !target.hasAttribute('disabled')) target.focus()
  })
}

function handleResponse(event: MessageEvent<PlanningWorkerResponse>): void {
  const response = event.data
  if (!acceptsPlanningResponse(response, currentRunId.value, lastSequence.value)) return
  lastSequence.value = response.sequence

  if (response.kind === 'error') {
    awaitingMode.value = undefined
    queuedModes.value = []
    pause()
    setStatus(`${copy.value.errorPrefix} ${localizedError(response.code)}`)
    phase.value = response.recoverable ? 'ready' : 'error'
    if (!response.recoverable) pendingConfig = undefined
    return
  }

  phase.value = 'ready'
  if (response.kind === 'started') {
    awaitingMode.value = undefined
    if (pendingConfig) appliedConfig.value = cloneConfig(pendingConfig)
    pendingConfig = undefined
    engineVersion.value = response.engineVersion
    reference.value = response.reference
    model.value = response.model
    for (const mode of PLANNING_MODES) {
      const incoming = response.runs[mode]
      if (!incoming) continue
      runs[mode] = normalizeRun(incoming, mode)
      checkCostMonotonic(mode, runs[mode].snapshot.cost)
    }
    setStatus(copy.value.ready)
    saveExperiment()
    return
  }

  const mode = response.mode
  if (response.kind === 'reset') {
    awaitingMode.value = undefined
    const snapshot = normalizeSnapshot(response.snapshot, mode)
    runs[mode] = {
      snapshot,
      reference: reference.value,
      residualHistory: [snapshot.residual],
      updates: [],
      phases: [],
    }
    setStatus(copy.value.resetDone)
    saveExperiment()
    restorePendingFocus()
    return
  }

  awaitingMode.value = undefined
  applyOutcome(mode, response.outcome)
  if (queuedModes.value.length > 0 && !runningMode.value && !pauseRequested.value) {
    dispatchNextQueued()
    return
  }
  if (runningMode.value === mode && !pauseRequested.value) {
    if (runs[mode].snapshot.converged) {
      pause()
      setStatus(interpolate(copy.value.converged, {
        algorithm: algorithmName(mode),
        iteration: runs[mode].snapshot.outerIteration,
      }))
    } else if (runs[mode].snapshot.truncated) {
      pause()
      setStatus(interpolate(copy.value.limitReached, { algorithm: algorithmName(mode) }))
    } else {
      scheduleRun(mode)
    }
  } else if (pauseRequested.value) {
    pauseRequested.value = false
    setStatus(interpolate(copy.value.paused, {
      algorithm: algorithmName(mode),
      iteration: runs[mode].snapshot.outerIteration,
      residual: formatNumber(runs[mode].snapshot.residual),
    }))
  } else {
    setStatus(interpolate(copy.value.sweepDone, {
      algorithm: algorithmName(mode),
      iteration: runs[mode].snapshot.outerIteration,
    }))
  }
  saveExperiment()
  restorePendingFocus()
}

function normalizeRun(value: PlanningRunState, mode: PlanningMode): PlanningRunState {
  return {
    snapshot: normalizeSnapshot(value.snapshot, mode),
    reference: value.reference ?? reference.value,
    residualHistory: Array.isArray(value.residualHistory) && value.residualHistory.length > 0
      ? value.residualHistory.map((item) => finiteOr(item, 0))
      : [0],
    updates: Array.isArray(value.updates) ? value.updates : [],
    phases: Array.isArray(value.phases) ? value.phases : [],
  }
}

function normalizeSnapshot(value: PlanningSnapshot, mode: PlanningMode): PlanningSnapshot {
  const source = value ?? ({} as PlanningSnapshot)
  return {
    mode,
    values: arrayOfNumbers(source.values, stateCount),
    actionValues: Array.from({ length: stateCount }, (_, state) =>
      arrayOfNumbers(source.actionValues?.[state], 5),
    ),
    greedyMasks: arrayOfNumbers(source.greedyMasks, stateCount),
    policyMasks: arrayOfNumbers(source.policyMasks, stateCount),
    policy: arrayOfNumbers(source.policy, stateCount, -1),
    outerIteration: integerOr(source.outerIteration, 0),
    evaluationSweep: integerOr(source.evaluationSweep, 0),
    residual: finiteOr(source.residual, 0),
    valueResidual: finiteOr(source.valueResidual, source.residual ?? 0),
    evaluationResidual: finiteOr(source.evaluationResidual, 0),
    policyStable: Boolean(source.policyStable),
    converged: Boolean(source.converged),
    truncated: Boolean(source.truncated),
    evaluationTruncated: Boolean(source.evaluationTruncated),
    cost: {
      backups: integerOr(source.cost?.backups, 0),
      actionEvaluations: integerOr(source.cost?.actionEvaluations, 0),
      policyEvaluations: integerOr(source.cost?.policyEvaluations, 0),
      improvementSteps: integerOr(source.cost?.improvementSteps, 0),
    },
  }
}

function arrayOfNumbers(value: unknown, length: number, fill = 0): number[] {
  if (!Array.isArray(value)) return Array(length).fill(fill)
  return Array.from({ length }, (_, index) => finiteOr(value[index], fill))
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function integerOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback
}

function applyOutcome(mode: PlanningMode, outcome: PlanningOutcome): void {
  const previous = runs[mode]
  const snapshot = normalizeSnapshot(outcome.snapshot, mode)
  const history = Array.isArray(outcome.residualHistory) ? outcome.residualHistory : []
  const appended = history.length > 1 ? history.slice(1).map((value) => finiteOr(value, snapshot.residual)) : []
  runs[mode] = {
    snapshot,
    reference: previous.reference,
    residualHistory: [...previous.residualHistory, ...appended],
    updates: Array.isArray(outcome.updates) ? outcome.updates : [],
    phases: Array.isArray(outcome.phases) ? outcome.phases : previous.phases,
  }
  checkCostMonotonic(mode, snapshot.cost)
  if (runningMode.value === mode) animatedIterations.value += 1
}

function checkCostMonotonic(mode: PlanningMode, cost: PlanningSnapshot['cost']): void {
  const previous = runs[mode]?.snapshot.cost
  if (!previous) return
  if (
    cost.backups < previous.backups ||
    cost.actionEvaluations < previous.actionEvaluations ||
    cost.policyEvaluations < previous.policyEvaluations ||
    cost.improvementSteps < previous.improvementSteps
  ) costViolation.value = true
}

function modeLabel(mode: PlanningMode): string {
  const option = modeOptions.find((candidate) => candidate.value === mode)
  return option ? copy.value[option.key] : mode
}

function algorithmName(mode: PlanningMode): string {
  if (mode === 'value_iteration') return copy.value.algorithmValueIteration
  if (mode === 'policy_iteration') return copy.value.algorithmPolicyIteration
  return copy.value.algorithmTruncatedPolicyIteration
}

function localizedError(code: string): string {
  return (
    (copy.value.errors as Record<string, string>)[code] ??
    interpolate(copy.value.unknownError, { code })
  )
}

function isFieldInvalid(field: PlanningConfigField): boolean {
  return configValidation.value?.field === field
}

function validationId(field: PlanningConfigField): string | undefined {
  return isFieldInvalid(field) ? `planning-validation-${props.locale}` : undefined
}

function actionName(action: ActionCode | number): string {
  return copy.value.actionNames[String(action) as keyof typeof copy.value.actionNames] ?? copy.value.none
}

function maskIncludes(mask: number, action: ActionCode): boolean {
  return (mask & (1 << action)) !== 0
}

function actionList(mask: number): string {
  const names = actionCodes.filter((action) => maskIncludes(mask, action)).map(actionName)
  return names.length > 0 ? names.join(', ') : copy.value.none
}

function stateKind(state: number): string {
  if (state === 15) return copy.value.goalState
  if (state === 0) return copy.value.startState
  if (state === 6 || state === 9) return copy.value.hazardState
  return copy.value.ordinaryState
}

function policyLabel(run: PlanningRunState, state: number): string {
  if (state === 15) return copy.value.none
  const policy = run.snapshot.policy[state]
  if (policy >= 0 && policy <= 4) return actionName(policy)
  return actionList(run.snapshot.policyMasks[state] ?? 0)
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
  const scale = Math.max(...reference.value.values.map((item) => Math.abs(item)), 1)
  const normalized = Math.min(Math.abs(value) / scale, 1)
  const alpha = 0.08 + normalized * 0.5
  return {
    backgroundColor:
      value >= 0 ? `rgba(13, 118, 110, ${alpha})` : `rgba(190, 70, 60, ${alpha})`,
  }
}

function approximatelyEqual(left: number, right: number, tolerance = 1e-10): boolean {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right))
}

function auditTransitionRows(): boolean {
  if (model.value.length === 0) return false
  return stateIndexes.slice(0, 15).every((state) =>
    actionCodes.every((action) => {
      const rows = model.value.filter(
        (transition) => transition.state === state && transition.requestedAction === action,
      )
      return (
        rows.length > 0 &&
        rows.every(
          (row) =>
            Number.isFinite(row.probability) &&
            row.probability >= 0 &&
            row.probability <= 1,
        ) &&
        approximatelyEqual(rows.reduce((sum, row) => sum + row.probability, 0), 1)
      )
    }),
  )
}

function auditFinite(): boolean {
  return (
    Number.isFinite(reference.value.residual) &&
    reference.value.values.every(Number.isFinite) &&
    model.value.every((row) => Number.isFinite(row.probability) && Number.isFinite(row.reward)) &&
    PLANNING_MODES.every((mode) => {
      const snapshot = runs[mode].snapshot
      return (
        Number.isFinite(snapshot.residual) &&
        Number.isFinite(snapshot.valueResidual) &&
        Number.isFinite(snapshot.evaluationResidual) &&
        snapshot.values.every(Number.isFinite) &&
        snapshot.actionValues.flat().every(Number.isFinite) &&
        snapshot.greedyMasks.every(Number.isFinite) &&
        snapshot.policyMasks.every(Number.isFinite) &&
        snapshot.policy.every(Number.isFinite) &&
        Object.values(snapshot.cost).every(Number.isFinite)
      )
    })
  )
}

function auditPolicies(): boolean {
  return PLANNING_MODES.every((mode) =>
    stateIndexes.every((state) => {
      if (state === 15) return runs[mode].snapshot.policyMasks[state] === 0
      const mask = runs[mode].snapshot.policyMasks[state] ?? 0
      return mask > 0 && (mask & (mask - 1)) === 0
    }),
  )
}

function auditReference(): boolean {
  const scale = Math.max(1, ...reference.value.values.map((value) => Math.abs(value)))
  return reference.value.residual <= 1e-10 * scale
}

function auditModes(): boolean {
  if (model.value.length === 0) return false
  // The Worker sends one canonical ledger; all snapshots must carry the same
  // terminal convention and state cardinality before they are comparable.
  return PLANNING_MODES.every((mode) => {
    const snapshot = runs[mode].snapshot
    return snapshot.values.length === stateCount && snapshot.actionValues.length === stateCount
  })
}

function saveExperiment(): void {
  if (phase.value !== 'ready') return
  const restore = Object.fromEntries(
    PLANNING_MODES.map((mode) => [mode, runs[mode].snapshot.outerIteration]),
  )
  const payload = JSON.stringify({
    v: storageVersion,
    config: cloneConfig(appliedConfig.value),
    restore,
    selectedMode: selectedMode.value,
    selectedState: selectedState.value,
    selectedAction: selectedAction.value,
    selectedPreset: selectedPreset.value,
    speedMs: speedMs.value,
  })
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.setItem(storageKey, payload)
    } catch {
      // Persistence is optional; the live Worker remains usable.
    }
  }
}

function restoreExperiment(): Partial<Record<PlanningMode, number>> {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(storageKey)
      if (!raw) continue
      const saved = JSON.parse(raw) as {
        v?: unknown
        config?: unknown
        restore?: unknown
        selectedMode?: unknown
        selectedState?: unknown
        selectedAction?: unknown
        selectedPreset?: unknown
        speedMs?: unknown
      }
      if (saved.v !== storageVersion || planningConfigValidationError(saved.config)) continue
      const restoredConfig = saved.config as PlanningConfig
      const rawRestore = saved.restore && typeof saved.restore === 'object'
        ? saved.restore as Record<string, unknown>
        : {}
      const restore = Object.fromEntries(
        PLANNING_MODES.map((mode) => {
          const value = rawRestore[mode]
          return [
            mode,
            typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= restoredConfig.maxOuterIterations
              ? value
              : 0,
          ]
        }),
      ) as Partial<Record<PlanningMode, number>>
      Object.assign(config, cloneConfig(restoredConfig))
      if (PLANNING_MODES.includes(saved.selectedMode as PlanningMode)) {
        selectedMode.value = saved.selectedMode as PlanningMode
      }
      if (typeof saved.selectedState === 'number' && Number.isInteger(saved.selectedState) && saved.selectedState >= 0 && saved.selectedState < stateCount) {
        selectedState.value = saved.selectedState
      }
      if (typeof saved.selectedAction === 'number' && actionCodes.includes(saved.selectedAction as ActionCode)) {
        selectedAction.value = saved.selectedAction as ActionCode
      }
      if (saved.selectedPreset === 'baseline' || saved.selectedPreset === 'wind20' || saved.selectedPreset === 'short' || saved.selectedPreset === 'long') {
        selectedPreset.value = saved.selectedPreset
      }
      if (typeof saved.speedMs === 'number' && Number.isFinite(saved.speedMs) && saved.speedMs >= 80 && saved.speedMs <= 1200) {
        speedMs.value = saved.speedMs
      }
      return restore
    } catch {
      // Try the other storage area, then use the baseline.
    }
  }
  return { value_iteration: 0, policy_iteration: 0, truncated_policy_iteration: 0 }
}

watch([selectedMode, selectedState, selectedAction, selectedPreset, speedMs], saveExperiment)

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
    class="grid-lab planning-lab"
    :aria-labelledby="`planning-lab-title-${locale}`"
    :data-phase="phase"
    :data-selected-mode="selectedMode"
    :data-selected-state="selectedState"
    :data-wind="appliedConfig.slipProbability"
    :data-discount="appliedConfig.discount"
    :data-outer-iteration="selectedRun.snapshot.outerIteration"
    :data-converged="selectedRun.snapshot.converged"
    :data-truncated="selectedRun.snapshot.truncated"
    :data-evaluation-truncated="selectedRun.snapshot.evaluationTruncated"
    :aria-busy="phase === 'loading' || Boolean(awaitingMode)"
  >
    <header class="grid-lab__header">
      <div>
        <p class="grid-lab__eyebrow">{{ copy.eyebrow }}</p>
        <h2 :id="`planning-lab-title-${locale}`">{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </div>
      <span class="engine-chip" :data-phase="phase">
        <span aria-hidden="true" class="engine-chip__dot" />
        {{ engineVersion ? interpolate(copy.version, { version: engineVersion }) : copy.engine }}
      </span>
    </header>

    <p class="bellman-lab__deterministic">{{ copy.deterministic }}</p>

    <section class="planning-controls" :aria-label="copy.controls">
      <div class="planning-preset-control">
        <label>
          <span>{{ copy.preset }}</span>
          <select v-model="selectedPreset" :aria-label="copy.preset">
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
        <input v-model.number="config.discount" type="number" min="0" max="0.99" step="any" :aria-invalid="isFieldInvalid('discount')" :aria-describedby="validationId('discount')" />
      </label>
      <label>
        <span>{{ copy.wind }}</span>
        <input v-model.number="config.slipProbability" type="number" min="0" max="1" step="0.05" :aria-invalid="isFieldInvalid('slipProbability')" :aria-describedby="validationId('slipProbability')" />
      </label>
      <label>
        <span>{{ copy.tolerance }}</span>
        <input v-model.number="config.tolerance" type="number" min="5e-324" max="1" step="any" :aria-invalid="isFieldInvalid('tolerance')" :aria-describedby="validationId('tolerance')" />
      </label>
      <label>
        <span>{{ copy.maxOuterIterations }}</span>
        <input v-model.number="config.maxOuterIterations" type="number" min="1" max="10000" step="1" :aria-invalid="isFieldInvalid('maxOuterIterations')" :aria-describedby="validationId('maxOuterIterations')" />
      </label>
      <label>
        <span>{{ copy.evaluationSweeps }}</span>
        <input v-model.number="config.evaluationSweeps" type="number" min="1" max="10000" step="1" :aria-invalid="isFieldInvalid('evaluationSweeps')" :aria-describedby="validationId('evaluationSweeps')" />
      </label>
      <label>
        <span>{{ copy.maxEvaluationSweeps }}</span>
        <input v-model.number="config.maxEvaluationSweeps" type="number" min="1" max="10000" step="1" :aria-invalid="isFieldInvalid('maxEvaluationSweeps')" :aria-describedby="validationId('maxEvaluationSweeps')" />
      </label>
      <label>
        <span>{{ interpolate(copy.speed, { milliseconds: speedMs }) }}</span>
        <input v-model.number="speedMs" type="range" min="80" max="1200" step="10" />
      </label>
      <div class="planning-controls__buttons">
        <button class="lab-button" type="button" :disabled="!canRestart" :aria-disabled="!canRestart" @click="restart">{{ copy.apply }}</button>
        <button class="lab-button" type="button" :disabled="!canStep" :aria-disabled="!canStep" @click="requestStep">{{ copy.step }}</button>
        <button class="lab-button" type="button" :disabled="!canRestart || Boolean(runningMode)" :aria-disabled="!canRestart || Boolean(runningMode)" @click="stepAll">{{ copy.allAlgorithms }}</button>
        <button class="lab-button lab-button--primary" type="button" :disabled="!canStep || Boolean(runningMode)" :aria-disabled="!canStep || Boolean(runningMode)" @click="runSelected">{{ copy.run }}</button>
        <button class="lab-button" type="button" :disabled="!canPause" :aria-disabled="!canPause" @click="pauseRun">{{ copy.pause }}</button>
        <button class="lab-button" type="button" :disabled="!canReset" :aria-disabled="!canReset" @click="resetSelected">{{ copy.reset }}</button>
      </div>
    </section>

    <p :id="`planning-validation-${locale}`" class="sr-only">{{ validationDescription }}</p>

    <div class="lab-mode-tabs planning-mode-tabs" :aria-label="copy.modeLabel" role="group">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        class="lab-mode-tab"
        :class="{ 'lab-mode-tab--active': selectedMode === option.value }"
        type="button"
        :aria-pressed="selectedMode === option.value"
        @click="selectedMode = option.value"
      >
        {{ copy[option.key] }}
      </button>
    </div>

    <section class="planning-algorithm-grid" :aria-label="copy.algorithmTable">
      <article
        v-for="mode in PLANNING_MODES"
        :key="mode"
        class="planning-algorithm-card"
        :class="{ 'planning-algorithm-card--selected': selectedMode === mode }"
        :data-mode="mode"
        :data-outer-iteration="runs[mode].snapshot.outerIteration"
        :data-converged="runs[mode].snapshot.converged"
        :data-evaluation-truncated="runs[mode].snapshot.evaluationTruncated"
        @click="selectedMode = mode"
      >
        <header>
          <h3>{{ algorithmName(mode) }}</h3>
          <span v-if="selectedMode === mode" class="planning-selected-chip">{{ copy.selected }}</span>
        </header>
        <p class="planning-card-equation">
          <template v-if="mode === 'value_iteration'">{{ copy.valueIterationFormula }}</template>
          <template v-else-if="mode === 'policy_iteration'">{{ copy.policyIterationFormula }}</template>
          <template v-else>{{ copy.truncatedPolicyIterationFormula }}</template>
        </p>
        <div class="planning-grid" role="group" :aria-label="`${algorithmName(mode)} ${copy.mapTitle}`">
          <button
            v-for="state in stateIndexes"
            :key="state"
            class="planning-state"
            :class="{
              'planning-state--selected': selectedState === state && selectedMode === mode,
              'planning-state--hazard': state === 6 || state === 9,
              'planning-state--goal': state === 15,
            }"
            :style="valueStyle(runs[mode].snapshot.values[state] ?? 0)"
            :data-mode="mode"
            :data-state="state"
            :data-value="runs[mode].snapshot.values[state] ?? 0"
            :data-policy-mask="runs[mode].snapshot.policyMasks[state] ?? 0"
            :data-greedy-mask="runs[mode].snapshot.greedyMasks[state] ?? 0"
            type="button"
            :aria-pressed="selectedState === state && selectedMode === mode"
            :aria-label="interpolate(copy.stateAria, {
              algorithm: algorithmName(mode),
              state,
              kind: stateKind(state),
              value: formatNumber(runs[mode].snapshot.values[state] ?? 0),
              policy: policyLabel(runs[mode], state),
              greedy: actionList(runs[mode].snapshot.greedyMasks[state] ?? 0),
            })"
            @click.stop="selectedMode = mode; selectedState = state"
          >
            <span class="planning-state__label">s{{ state }} · {{ stateKind(state) }}</span>
            <strong>{{ formatNumber(runs[mode].snapshot.values[state] ?? 0) }}</strong>
            <span class="planning-state__arrows" aria-hidden="true">
              <template v-for="action in actionCodes" :key="action">
                <b v-if="maskIncludes(runs[mode].snapshot.policyMasks[state] ?? 0, action)">{{ actionGlyphs[action] }}</b>
              </template>
              <b v-if="(runs[mode].snapshot.policyMasks[state] ?? 0) === 0">—</b>
            </span>
            <small>{{ copy.policy }}: {{ policyLabel(runs[mode], state) }}</small>
          </button>
        </div>
        <dl class="planning-card-metrics">
          <div><dt>{{ copy.outerIteration }}</dt><dd data-card-outer>{{ runs[mode].snapshot.outerIteration }}</dd></div>
          <div><dt>{{ copy.evaluationSweep }}</dt><dd data-card-eval>{{ runs[mode].snapshot.evaluationSweep }}</dd></div>
          <div><dt>{{ copy.valueResidual }}</dt><dd data-card-residual>{{ formatNumber(runs[mode].snapshot.valueResidual) }}</dd></div>
          <div><dt>{{ copy.optimalityResidual }}</dt><dd data-card-optimality-residual>{{ formatNumber(runs[mode].snapshot.residual) }}</dd></div>
          <div><dt>{{ copy.policyStable }}</dt><dd>{{ runs[mode].snapshot.policyStable ? copy.yes : copy.no }}</dd></div>
        </dl>
      </article>
    </section>

    <div class="planning-comparison-table mini-table-wrap" tabindex="0" role="region" :aria-label="copy.algorithmTable">
      <table class="mini-table">
        <caption>{{ copy.algorithmTable }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ copy.algorithm }}</th>
            <th scope="col">{{ copy.outerIteration }}</th>
            <th scope="col">{{ copy.evaluationSweep }}</th>
            <th scope="col">{{ copy.valueResidual }}</th>
            <th scope="col">{{ copy.optimalityResidual }}</th>
            <th scope="col">{{ copy.evaluationResidual }}</th>
            <th scope="col">{{ copy.policyStable }}</th>
            <th scope="col">{{ copy.status }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mode in PLANNING_MODES" :key="mode" :data-comparison-mode="mode">
            <th scope="row">{{ algorithmName(mode) }}</th>
            <td :data-comparison-outer="runs[mode].snapshot.outerIteration">{{ runs[mode].snapshot.outerIteration }}</td>
            <td :data-comparison-eval="runs[mode].snapshot.evaluationSweep">{{ runs[mode].snapshot.evaluationSweep }}</td>
            <td :data-comparison-value-residual="runs[mode].snapshot.valueResidual">{{ formatNumber(runs[mode].snapshot.valueResidual) }}</td>
            <td :data-comparison-optimality-residual="runs[mode].snapshot.residual">{{ formatNumber(runs[mode].snapshot.residual) }}</td>
            <td :data-comparison-eval-residual="runs[mode].snapshot.evaluationResidual">{{ formatNumber(runs[mode].snapshot.evaluationResidual) }}</td>
            <td>{{ runs[mode].snapshot.policyStable ? copy.yes : copy.no }}</td>
            <td>{{ runs[mode].snapshot.converged ? copy.convergedState : runs[mode].snapshot.truncated ? copy.truncatedState : copy.runningState }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="planning-detail-grid">
      <section class="planning-detail-panel" :aria-labelledby="`planning-detail-title-${locale}`">
        <h3 :id="`planning-detail-title-${locale}`">{{ interpolate(copy.mapTitle, {}) }} · s{{ selectedState }}</h3>
        <p>{{ copy.mapBody }}</p>
        <p v-if="selectedState === 15" class="lab-panel__hint">{{ copy.terminalNoActions }}</p>
        <template v-else>
          <p class="lab-panel__hint">
            {{ algorithmName(selectedMode) }} · {{ copy.policy }}: {{ policyLabel(selectedRun, selectedState) }} · {{ copy.greedy }}: {{ actionList(selectedGreedyMask) }}
          </p>
          <div class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.mapTitle">
            <table class="mini-table planning-action-table">
              <thead><tr><th scope="col">{{ copy.requestedAction }}</th><th scope="col">{{ copy.qValue }}</th><th scope="col">{{ copy.greedy }}</th></tr></thead>
              <tbody>
                <tr v-for="action in actionCodes" :key="action" :data-action="action" :data-greedy="maskIncludes(selectedGreedyMask, action)">
                  <th scope="row">
                    <button class="planning-action-select" type="button" :aria-pressed="selectedAction === action" :aria-label="interpolate(copy.selectAction, { action: actionName(action) })" @click="selectedAction = action">
                      <span aria-hidden="true">{{ actionGlyphs[action] }}</span> {{ actionName(action) }}
                    </button>
                  </th>
                  <td :data-q-value="selectedActionValues[action] ?? 0">{{ formatNumber(selectedActionValues[action] ?? 0) }}</td>
                  <td>{{ maskIncludes(selectedGreedyMask, action) ? copy.yes : copy.no }}</td>
                </tr>
              </tbody>
              <tfoot><tr><th scope="row">{{ copy.maximum }}</th><td colspan="2" :data-operator-total="operatorTotal">{{ formatNumber(operatorTotal) }}</td></tr></tfoot>
            </table>
          </div>
          <h4>{{ copy.requestedAction }}: {{ actionName(selectedAction) }}</h4>
          <div class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.requestedAction">
            <table class="mini-table planning-ledger-table">
              <thead><tr><th scope="col">{{ copy.actualAction }}</th><th scope="col">{{ copy.nextState }}</th><th scope="col">{{ copy.probability }}</th><th scope="col">{{ copy.reward }}</th><th scope="col">{{ copy.contribution }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, index) in ledgerRows" :key="`${row.actualAction}-${row.nextState}-${index}`">
                  <td>{{ actionName(row.actualAction) }}</td><td>s{{ row.nextState }}</td><td :data-probability="row.probability">{{ formatNumber(row.probability) }}</td><td>{{ formatNumber(row.reward) }}</td><td :data-contribution="row.contribution">{{ formatNumber(row.contribution) }}</td>
                </tr>
              </tbody>
              <tfoot><tr><th colspan="4" scope="row">{{ copy.qValue }}</th><td :data-ledger-total="ledgerTotal">{{ formatNumber(ledgerTotal) }}</td></tr></tfoot>
            </table>
          </div>
        </template>
      </section>

      <section class="planning-phase-panel" :aria-labelledby="`planning-phase-title-${locale}`">
        <h3 :id="`planning-phase-title-${locale}`">{{ copy.phaseTitle }}</h3>
        <p>{{ copy.phaseBody }}</p>
        <p v-if="latestPhases.length === 0" class="lab-panel__hint">{{ copy.noPhase }}</p>
        <div v-else class="mini-table-wrap" tabindex="0" role="region" :aria-label="copy.phaseTitle">
          <table class="mini-table planning-phase-table">
            <thead><tr><th scope="col">{{ copy.phase }}</th><th scope="col">{{ copy.phaseSweeps }}</th><th scope="col">{{ copy.phaseChangedStates }}</th><th scope="col">{{ copy.residual }}</th></tr></thead>
            <tbody>
              <tr v-for="(item, index) in latestPhases" :key="`${item.kind}-${index}`">
                <th scope="row">{{ item.kind === 'backup' ? copy.phaseBackup : item.kind === 'evaluation' ? copy.phaseEvaluation : item.kind === 'improvement' ? copy.phaseImprovement : item.kind === 'stable' ? copy.phaseStable : copy.phaseTruncated }}</th>
                <td>{{ item.sweeps ?? '—' }}</td><td>{{ item.changedStates ?? '—' }}</td><td>{{ item.residual === undefined ? '—' : formatNumber(item.residual) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="planning-cost-panel" :aria-labelledby="`planning-cost-title-${locale}`">
      <h3 :id="`planning-cost-title-${locale}`">{{ copy.costTitle }}</h3>
      <p>{{ copy.costBody }}</p>
      <div class="planning-cost-grid">
        <article v-for="mode in PLANNING_MODES" :key="mode" :data-cost-mode="mode">
          <h4>{{ algorithmName(mode) }}</h4>
          <dl>
            <div><dt>{{ copy.costBackups }}</dt><dd data-cost-backups>{{ runs[mode].snapshot.cost.backups }}</dd></div>
            <div><dt>{{ copy.costEvaluations }}</dt><dd data-cost-evaluations>{{ runs[mode].snapshot.cost.policyEvaluations }}</dd></div>
            <div><dt>{{ copy.costActionEvaluations }}</dt><dd data-cost-action-evaluations>{{ runs[mode].snapshot.cost.actionEvaluations }}</dd></div>
            <div><dt>{{ copy.costImprovements }}</dt><dd data-cost-improvements>{{ runs[mode].snapshot.cost.improvementSteps }}</dd></div>
            <div><dt>{{ copy.costOuter }}</dt><dd>{{ runs[mode].snapshot.outerIteration }}</dd></div>
          </dl>
          <strong data-cost-total>{{ runs[mode].snapshot.cost.backups + runs[mode].snapshot.cost.actionEvaluations + runs[mode].snapshot.cost.policyEvaluations + runs[mode].snapshot.cost.improvementSteps }}</strong>
          <small>{{ copy.costTotal }}</small>
        </article>
      </div>
      <p class="formula-card"><strong>{{ copy.costFormula }}</strong></p>
    </section>

    <section class="planning-residual-panel" :aria-labelledby="`planning-residual-title-${locale}`">
      <h3 :id="`planning-residual-title-${locale}`">{{ copy.residualTitle }}</h3>
      <p>{{ copy.residualBody }}</p>
      <svg class="planning-residual-chart" viewBox="0 0 560 180" role="img" :data-visible-points="chartSampleCount" :aria-labelledby="`planning-history-title-${locale} planning-history-desc-${locale}`">
        <title :id="`planning-history-title-${locale}`">{{ copy.historyAria }}</title>
        <desc :id="`planning-history-desc-${locale}`">{{ copy.historyDescription }}</desc>
        <line x1="22" y1="162" x2="538" y2="162" /><line x1="22" y1="18" x2="22" y2="162" />
        <polyline v-for="mode in PLANNING_MODES" :key="mode" :class="`planning-series planning-series--${mode}`" :points="chartSeries[mode]" :data-mode="mode" />
      </svg>
      <div class="mini-table-wrap planning-history-table" tabindex="0" role="region" :aria-label="copy.residualTitle">
        <table class="mini-table">
          <thead><tr><th scope="col">{{ copy.algorithm }}</th><th scope="col">{{ copy.iteration }}</th><th scope="col">{{ copy.residual }}</th></tr></thead>
          <tbody>
            <template v-for="mode in PLANNING_MODES" :key="mode">
              <tr v-for="item in sampledHistory(mode)" :key="`${mode}-${item.index}`" :data-history-mode="mode" :data-history-index="item.index">
                <th scope="row">{{ algorithmName(mode) }}</th><td>{{ item.index === 0 ? copy.initial : item.index }}</td><td :data-history-residual="item.value">{{ formatNumber(item.value) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <section class="planning-reference-panel" :aria-labelledby="`planning-reference-title-${locale}`">
      <h3 :id="`planning-reference-title-${locale}`">{{ copy.referenceTitle }}</h3>
      <p>{{ copy.referenceBody }}</p>
      <div class="planning-reference-grid">
        <article v-for="mode in PLANNING_MODES" :key="mode">
          <h4>{{ algorithmName(mode) }}</h4>
          <dl>
            <div><dt>{{ copy.referenceValue }}</dt><dd data-reference-residual>{{ formatNumber(reference.residual) }}</dd></div>
            <div><dt>{{ copy.valueError }}</dt><dd>{{ formatNumber(Math.max(...runs[mode].snapshot.values.map((value, state) => Math.abs(value - (reference.values[state] ?? 0))))) }}</dd></div>
            <div><dt>{{ copy.greedyAgreement }}</dt><dd>{{ runs[mode].snapshot.greedyMasks.filter((mask, state) => mask !== (reference.greedyMasks[state] ?? 0)).length }}</dd></div>
          </dl>
        </article>
      </div>
    </section>

    <section class="planning-audit-panel" :aria-labelledby="`planning-audit-title-${locale}`">
      <h3 :id="`planning-audit-title-${locale}`">{{ copy.auditTitle }}</h3>
      <p>{{ copy.auditBody }}</p>
      <ul class="audit-list planning-audit-list">
        <li v-for="item in auditItems" :key="item.label" :data-pass="item.pass"><span>{{ item.pass ? '✓' : '!' }}</span><span>{{ item.label }}</span><strong>{{ item.pass ? copy.pass : copy.fail }}</strong></li>
      </ul>
    </section>

    <div class="metric-strip planning-metric-strip" :aria-label="copy.metrics">
      <div><span>{{ copy.selectedAlgorithm }}</span><strong>{{ algorithmName(selectedMode) }}</strong></div>
      <div><span>{{ copy.outerIteration }}</span><strong data-metric-outer>{{ selectedRun.snapshot.outerIteration }}</strong></div>
      <div><span>{{ copy.valueResidual }}</span><strong data-metric-residual>{{ formatNumber(selectedRun.snapshot.valueResidual) }}</strong></div>
      <div><span>{{ copy.optimalityResidual }}</span><strong data-metric-optimality-residual>{{ formatNumber(selectedRun.snapshot.residual) }}</strong></div>
      <div><span>{{ copy.referenceResidual }}</span><strong>{{ formatNumber(reference.residual) }}</strong></div>
      <div><span>{{ copy.status }}</span><strong>{{ statusLabel }}</strong></div>
    </div>

    <p v-if="selectedRun.snapshot.evaluationTruncated" class="concept-callout concept-callout--warning">
      {{ copy.evaluationTruncated }}
    </p>

    <p class="grid-lab__status" :data-phase="phase">{{ visualStatus }}</p>
    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
  </section>
</template>
