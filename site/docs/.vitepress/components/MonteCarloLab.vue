<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  MONTE_CARLO_MODES,
  MONTE_CARLO_OBJECTIVES,
  MONTE_CARLO_PROTOCOL_VERSION,
  MONTE_CARLO_VISIT_STRATEGIES,
  acceptsMonteCarloResponse,
  canonicalMonteCarloMode,
  canonicalMonteCarloVisitStrategy,
  monteCarloConfigValidationError,
  type MonteCarloAudit,
  type MonteCarloConfig,
  type MonteCarloMode,
  type MonteCarloObjective,
  type MonteCarloEpisode,
  type MonteCarloOutcome,
  type MonteCarloSnapshot,
  type MonteCarloVisitStrategy,
  type MonteCarloWorkerRequest,
  type MonteCarloWorkerResponse,
} from '../monteCarloProtocol'
import { monteCarloMessagesFor } from '../i18n/monteCarloMessages'
import { interpolate, type Locale } from '../i18n/messages'
import { ACTION, type ActionCode } from '../protocol'

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' })
const copy = computed(() => monteCarloMessagesFor(props.locale))

const stateCount = 16
const actionCount = 5
const terminalState = 15
const storageVersion = 1
const storageKey = `mathrl:exp-ch05-monte-carlo:v${storageVersion}`
const actionCodes: ActionCode[] = [ACTION.up, ACTION.right, ACTION.down, ACTION.left, ACTION.stay]
const actionGlyphs: Record<ActionCode, string> = {
  [ACTION.up]: '↑',
  [ACTION.right]: '→',
  [ACTION.down]: '↓',
  [ACTION.left]: '←',
  [ACTION.stay]: '•',
}

const baselineConfig: MonteCarloConfig = {
  discount: 0.9,
  slipProbability: 0,
  epsilon: 0.2,
  episodesPerStep: 1,
  maxEpisodes: 100,
  maxSteps: 40,
  // Keep the UI default identical to the reproducible chapter lab recipe.
  seedHex: '5eed',
  mode: 'mc_basic',
  visitStrategy: 'initial',
  objective: 'control',
  exploringStarts: false,
  rewards: {
    default: -0.04,
    boundary: -1,
    hazard: -1,
    goal: 1,
  },
}

const presets: Record<'baseline' | 'wind20' | 'short' | 'exploration', MonteCarloConfig> = {
  baseline: cloneConfig(baselineConfig),
  wind20: { ...cloneConfig(baselineConfig), slipProbability: 0.2 },
  short: { ...cloneConfig(baselineConfig), maxSteps: 12 },
  exploration: { ...cloneConfig(baselineConfig), mode: 'epsilon_greedy', epsilon: 0.8 },
}

const config = reactive<MonteCarloConfig>(cloneConfig(baselineConfig))
const appliedConfig = ref<MonteCarloConfig>(cloneConfig(baselineConfig))
const snapshot = ref<MonteCarloSnapshot>(emptySnapshot(baselineConfig))
const latestEpisode = ref<MonteCarloEpisode | undefined>()
const episodeHistory = ref<MonteCarloEpisode[]>([])
const audit = ref<MonteCarloAudit>(emptyAudit())
const selectedState = ref(0)
const selectedAction = ref<ActionCode>(ACTION.right)
const selectedPreset = ref<'baseline' | 'wind20' | 'short' | 'exploration'>('baseline')
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const engineVersion = ref('')
const announcement = ref('')
const visualStatus = ref('')
const currentRunId = ref('')
const lastSequence = ref(-1)
const awaiting = ref(false)
const running = ref(false)
const prefersReducedMotion = ref(false)
const restoreCount = ref(0)
let worker: Worker | undefined
let pendingConfig: MonteCarloConfig | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let motionPreference: MediaQueryList | undefined

const configValidation = computed(() => monteCarloConfigValidationError(config))
const selectedValues = computed(() => snapshot.value.actionValues[selectedState.value] ?? zeroRow())
const selectedVisits = computed(() => snapshot.value.visitCounts[selectedState.value] ?? zeroRow())
const selectedReturns = computed(() => snapshot.value.returnSums[selectedState.value] ?? zeroRow())
const selectedVariances = computed(() => snapshot.value.variances[selectedState.value] ?? zeroRow())
const selectedProbabilities = computed(
  () => snapshot.value.policyProbabilities[selectedState.value] ?? zeroRow(),
)
const selectedPolicy = computed(() => snapshot.value.policy[selectedState.value] ?? -1)
const selectedKind = computed(() => {
  if (selectedState.value === terminalState) return copy.value.goalState
  if (selectedState.value === 0) return copy.value.startState
  if ([6, 9].includes(selectedState.value)) return copy.value.hazardState
  return copy.value.ordinaryState
})
const canCommand = computed(() => phase.value === 'ready' && !awaiting.value)
const canSample = computed(() => canCommand.value && !snapshot.value.exhausted)
const statusLabel = computed(() => {
  if (phase.value === 'loading') return copy.value.statusLoading
  if (phase.value === 'error') return copy.value.statusError
  if (running.value) return copy.value.statusRunning
  if (snapshot.value.exhausted) return copy.value.statusExhausted
  return copy.value.statusReady
})
const latestRows = computed(() => latestEpisode.value?.steps ?? [])
const returnRows = computed(() => latestEpisode.value?.returns ?? [])
const returnHistory = computed(() => {
  const values = episodeHistory.value.map((episode) => episode.totalReturn).filter(Number.isFinite)
  return values.length > 0 ? values : [0]
})
const returnChart = computed(() => {
  const values = returnHistory.value.slice(-200)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = Math.max(max - min, 1e-9)
  const width = 560
  const height = 150
  const pad = 18
  const points = values
    .map((value, index) => {
      const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2)
      const y = pad + ((max - value) / span) * (height - pad * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  return { points, min, max, count: values.length }
})
const auditItems = computed(() => [
  { key: 'model', label: copy.value.auditModelFree, pass: audit.value.modelFree },
  { key: 'rows', label: copy.value.auditNoModel, pass: audit.value.modelRows === 0 },
  { key: 'finite', label: copy.value.auditFinite, pass: audit.value.finite },
  { key: 'counts', label: copy.value.auditRows, pass: auditCountsValid() },
  { key: 'policy', label: copy.value.auditPolicy, pass: auditPolicyValid() },
  { key: 'trace', label: copy.value.auditTrace, pass: auditTraceValid() },
])

function cloneConfig(source: MonteCarloConfig): MonteCarloConfig {
  return { ...source, rewards: { ...source.rewards } }
}

function zeroRow(): number[] {
  return Array(actionCount).fill(0)
}

function emptySnapshot(source: MonteCarloConfig): MonteCarloSnapshot {
  return {
    mode: source.mode,
    visitStrategy: source.visitStrategy,
    epsilon: source.epsilon,
    episodeCount: 0,
    totalSteps: 0,
    values: Array(stateCount).fill(0),
    actionValues: Array.from({ length: stateCount }, zeroRow),
    visitCounts: Array.from({ length: stateCount }, zeroRow),
    returnSums: Array.from({ length: stateCount }, zeroRow),
    variances: Array.from({ length: stateCount }, zeroRow),
    policyProbabilities: Array.from({ length: stateCount }, zeroRow),
    policy: Array(stateCount).fill(-1),
    seedHex: source.seedHex,
    windProbability: source.slipProbability,
    truncated: false,
    episodeReturnMean: 0,
    episodeReturnVariance: 0,
    policyChanges: 0,
    coveredPairs: 0,
    exhausted: false,
  }
}

function emptyAudit(): MonteCarloAudit {
  return {
    modelFree: true,
    modelRows: 0,
    observedSteps: 0,
    creditedReturns: 0,
    unvisitedPairs: (stateCount - 1) * actionCount,
    finite: true,
  }
}

function newRunId(): string {
  return `ch05-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function updateMotionPreference(event?: MediaQueryListEvent): void {
  prefersReducedMotion.value = event?.matches ?? motionPreference?.matches ?? false
}

function createWorker(): boolean {
  try {
    const next = new Worker(new URL('../workers/monte-carlo.worker.ts', import.meta.url), {
      type: 'module',
    })
    next.addEventListener('message', handleResponse)
    next.addEventListener('error', () => {
      if (worker !== next) return
      stopRun()
      phase.value = 'error'
      awaiting.value = false
      setStatus(copy.value.failed)
      next.terminate()
      worker = undefined
    })
    worker = next
    return true
  } catch {
    phase.value = 'error'
    setStatus(copy.value.failed)
    return false
  }
}

function post(request: MonteCarloWorkerRequest): void {
  worker?.postMessage(request)
}

function start(restoredEpisodes = 0): void {
  stopRun()
  const nextConfig = cloneConfig(config)
  nextConfig.exploringStarts = nextConfig.mode === 'exploring_starts'
  const validation = monteCarloConfigValidationError(nextConfig)
  if (validation) {
    phase.value = 'error'
    setStatus(`${copy.value.errorPrefix} ${localizedError(validation.code)}`)
    return
  }
  if (!worker && !createWorker()) return
  pendingConfig = nextConfig
  currentRunId.value = newRunId()
  lastSequence.value = -1
  awaiting.value = false
  restoreCount.value = Math.max(0, Math.min(restoredEpisodes, nextConfig.maxEpisodes))
  latestEpisode.value = undefined
  episodeHistory.value = []
  snapshot.value = emptySnapshot(nextConfig)
  audit.value = emptyAudit()
  phase.value = 'loading'
  setStatus(copy.value.loading)
  post({
    v: MONTE_CARLO_PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'start',
    config: nextConfig,
    restoreEpisodes: restoreCount.value,
  })
}

function dispatch(kind: 'episode' | 'advance' | 'reset', episodes = 1): void {
  if (!worker || !canCommand.value) return
  awaiting.value = true
  if (kind === 'advance') {
    post({ v: MONTE_CARLO_PROTOCOL_VERSION, runId: currentRunId.value, kind, episodes })
  } else {
    post({ v: MONTE_CARLO_PROTOCOL_VERSION, runId: currentRunId.value, kind })
  }
}

function sampleEpisode(): void {
  if (!canSample.value) return
  dispatch('episode')
}

function runBatch(): void {
  if (!canSample.value) return
  dispatch(
    'advance',
    Math.min(
      appliedConfig.value.episodesPerStep,
      appliedConfig.value.maxEpisodes - snapshot.value.episodeCount,
    ),
  )
}

function runToBudget(): void {
  if (!canSample.value || running.value) return
  running.value = true
  setStatus(copy.value.working)
  scheduleNextBatch()
}

function scheduleNextBatch(): void {
  if (!running.value || awaiting.value || snapshot.value.exhausted) return
  const remaining = appliedConfig.value.maxEpisodes - snapshot.value.episodeCount
  if (remaining <= 0) {
    stopRun()
    return
  }
  const amount = Math.min(
    prefersReducedMotion.value ? Math.max(appliedConfig.value.episodesPerStep, 10) : appliedConfig.value.episodesPerStep,
    remaining,
  )
  dispatch('advance', amount)
}

function pauseRun(): void {
  if (!running.value) return
  stopRun()
  setStatus(interpolate(copy.value.paused, { episode: snapshot.value.episodeCount }))
}

function stopRun(): void {
  running.value = false
  if (timer) clearTimeout(timer)
  timer = undefined
}

function resetLedger(): void {
  stopRun()
  if (!canCommand.value) return
  dispatch('reset')
}

function applyAndRestart(): void {
  start()
}

function loadPreset(): void {
  if (phase.value === 'loading') return
  Object.assign(config, cloneConfig(presets[selectedPreset.value]))
  start()
}

function changeMode(): void {
  config.exploringStarts = config.mode === 'exploring_starts'
  start()
}

function changeVisitStrategy(): void {
  start()
}

function handleResponse(event: MessageEvent<MonteCarloWorkerResponse>): void {
  const response = event.data
  if (!acceptsMonteCarloResponse(response, currentRunId.value, lastSequence.value)) return
  lastSequence.value = response.sequence
  if (response.kind === 'error') {
    awaiting.value = false
    if (response.recoverable) {
      phase.value = 'ready'
      setStatus(`${copy.value.commandRejected} ${localizedError(response.code)}`)
    } else {
      stopRun()
      phase.value = 'error'
      setStatus(`${copy.value.failed} ${localizedError(response.code)}`)
    }
    return
  }
  awaiting.value = false
  if (response.kind === 'reset') {
    latestEpisode.value = undefined
    episodeHistory.value = []
  }
  if (response.kind === 'started') {
    if (pendingConfig) appliedConfig.value = cloneConfig(pendingConfig)
    pendingConfig = undefined
    snapshot.value = response.snapshot
    latestEpisode.value = response.episode
    if (response.episode) episodeHistory.value = [response.episode]
    audit.value = response.audit
    engineVersion.value = response.engineVersion
    phase.value = 'ready'
    setStatus(copy.value.ready)
    saveState()
    if (running.value) scheduleNextBatch()
    return
  }
  applyOutcome(response.outcome)
  if (response.kind === 'reset') {
    stopRun()
    setStatus(copy.value.resetDone)
  } else if (response.outcome.episode) {
    setStatus(
      interpolate(copy.value.episodeDone, {
        episode: response.outcome.snapshot.episodeCount,
        returnValue: formatNumber(response.outcome.episode.totalReturn),
      }),
      false,
    )
  }
  saveState()
  if (running.value) {
    timer = setTimeout(scheduleNextBatch, prefersReducedMotion.value ? 0 : 220)
  }
}

function applyOutcome(outcome: MonteCarloOutcome): void {
  snapshot.value = outcome.snapshot
  const episodes = outcome.episodes?.filter((episode) => episode.length > 0) ?? []
  const visibleEpisodes = episodes.length > 0
    ? episodes
    : outcome.episode.length > 0
      ? [outcome.episode]
      : []
  latestEpisode.value = visibleEpisodes.at(-1) ?? latestEpisode.value
  if (visibleEpisodes.length > 0) {
    episodeHistory.value = [...episodeHistory.value, ...visibleEpisodes].slice(-500)
  }
  audit.value = outcome.audit
  phase.value = 'ready'
}

function localizedError(code: string): string {
  return (
    (copy.value.errors as Record<string, string>)[code] ??
    interpolate(copy.value.unknownError, { code })
  )
}

function setStatus(message: string, announce = true): void {
  visualStatus.value = message
  if (announce) announcement.value = message
}

function actionName(action: number): string {
  const names: Partial<Record<ActionCode, keyof typeof copy.value>> = {
    [ACTION.up]: 'up',
    [ACTION.right]: 'right',
    [ACTION.down]: 'down',
    [ACTION.left]: 'left',
    [ACTION.stay]: 'stay',
  }
  const key = names[action as ActionCode]
  const label = key ? copy.value[key] : undefined
  return typeof label === 'string' ? label : copy.value.none
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(4)
}

function stateLabel(state: number): string {
  return `s${state}`
}

function stateAria(state: number): string {
  const visits = snapshot.value.visitCounts[state]?.reduce((sum, count) => sum + count, 0) ?? 0
  return interpolate(copy.value.stateAria, {
    state,
    kind:
      state === terminalState
        ? copy.value.goalState
        : state === 0
          ? copy.value.startState
          : [6, 9].includes(state)
            ? copy.value.hazardState
            : copy.value.ordinaryState,
    value: formatNumber(snapshot.value.values[state] ?? 0),
    policy: state === terminalState ? copy.value.none : actionName(snapshot.value.policy[state] ?? -1),
    visits,
  })
}

function auditCountsValid(): boolean {
  const rows = returnRows.value
  return rows.every((row) => !row.included || row.count >= 1)
}

function auditPolicyValid(): boolean {
  return snapshot.value.policyProbabilities.slice(0, terminalState).every((row) => {
    const sum = row.reduce((total, value) => total + value, 0)
    return row.every(Number.isFinite) && (sum === 0 || Math.abs(sum - 1) < 1e-8)
  })
}

function auditTraceValid(): boolean {
  if (!latestEpisode.value) return true
  return latestRows.value.every(
    (step, index) =>
      step.state >= 0 &&
      step.state < stateCount &&
      step.nextState >= 0 &&
      step.nextState < stateCount &&
      step.discountWeight >= 0 &&
      Number.isFinite(step.reward) &&
      (index === latestRows.value.length - 1 || !step.done),
  )
}

function saveState(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        config: appliedConfig.value,
        episodeCount: snapshot.value.episodeCount,
        selectedState: selectedState.value,
        selectedAction: selectedAction.value,
      }),
    )
  } catch {
    // Storage is an optional enhancement; an unavailable quota must not break
    // an otherwise static lab.
  }
}

function restoreState(): { config: MonteCarloConfig; episodeCount: number } | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as {
      config?: Partial<MonteCarloConfig>
      episodeCount?: number
      selectedState?: number
      selectedAction?: number
    }
    if (parsed.selectedState !== undefined && Number.isInteger(parsed.selectedState)) {
      selectedState.value = Math.max(0, Math.min(terminalState, parsed.selectedState))
    }
    if (parsed.selectedAction !== undefined && actionCodes.includes(parsed.selectedAction as ActionCode)) {
      selectedAction.value = parsed.selectedAction as ActionCode
    }
    const candidate = parsed.config
    if (!candidate) return undefined
    const restored = cloneConfig({
      ...baselineConfig,
      ...candidate,
      mode: canonicalMonteCarloMode(candidate.mode) ?? baselineConfig.mode,
      visitStrategy: canonicalMonteCarloVisitStrategy(candidate.visitStrategy) ?? baselineConfig.visitStrategy,
      objective: candidate.objective === 'prediction' ? 'prediction' : 'control',
      rewards: { ...baselineConfig.rewards, ...(candidate.rewards ?? {}) },
    })
    if (monteCarloConfigValidationError(restored)) return undefined
    return {
      config: restored,
      episodeCount:
        typeof parsed.episodeCount === 'number' && Number.isInteger(parsed.episodeCount)
          ? Math.max(0, parsed.episodeCount)
          : 0,
    }
  } catch {
    return undefined
  }
}

function cellClass(state: number): string[] {
  return [
    'monte-carlo-state',
    state === selectedState.value ? 'is-selected' : '',
    state === terminalState ? 'is-goal' : '',
    state === 0 ? 'is-start' : '',
    [6, 9].includes(state) ? 'is-hazard' : '',
  ].filter(Boolean)
}

onMounted(() => {
  const restored = restoreState()
  if (restored) {
    Object.assign(config, restored.config)
    start(restored.episodeCount)
  } else {
    start()
  }
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    updateMotionPreference()
    motionPreference.addEventListener?.('change', updateMotionPreference)
  }
})

onBeforeUnmount(() => {
  stopRun()
  motionPreference?.removeEventListener?.('change', updateMotionPreference)
  worker?.terminate()
  worker = undefined
})

  watch(
  () => props.locale,
  () => {
    // Locale changes should not reset numerical state.  The parent route may
    // remount this component; localStorage restoration above replays the same
    // seeded prefix for numerical estimates (the UI keeps only the latest
    // restored trace to keep startup payloads bounded).
    setStatus(visualStatus.value, false)
  },
)
</script>

<template>
  <section
    class="monte-carlo-lab"
    data-testid="monte-carlo-lab"
    :data-phase="phase"
    :data-mode="appliedConfig.mode"
    :data-visit-strategy="appliedConfig.visitStrategy"
    :data-objective="appliedConfig.objective"
    :data-episode-count="snapshot.episodeCount"
    :data-wind="appliedConfig.slipProbability"
    :data-epsilon="appliedConfig.epsilon"
    :data-seed="appliedConfig.seedHex"
    :data-selected-state="selectedState"
  >
    <header class="monte-carlo-hero">
      <p class="lab-eyebrow">{{ copy.eyebrow }}</p>
      <h2>{{ copy.title }}</h2>
      <p>{{ copy.description }}</p>
      <div class="lab-badges">
        <span class="engine-chip" :data-phase="phase">{{ copy.engine }}<span v-if="engineVersion"> · {{ engineVersion }}</span></span>
        <span class="model-free-badge" data-model-free-audit>{{ copy.modelFreeBadge }}</span>
      </div>
    </header>

    <div class="monte-carlo-status" role="status" aria-live="polite">
      <span class="status-dot" :data-phase="phase" />
      <span>{{ visualStatus || statusLabel }}</span>
      <span class="sr-only" aria-live="polite">{{ announcement }}</span>
    </div>

    <section class="monte-carlo-controls" :aria-label="copy.controls">
      <div class="control-row control-row--presets">
        <label>
          {{ copy.preset }}
          <select v-model="selectedPreset" aria-label="Preset" data-preset>
            <option value="baseline">{{ copy.presetBaseline }}</option>
            <option value="wind20">{{ copy.presetWind }}</option>
            <option value="short">{{ copy.presetShort }}</option>
            <option value="exploration">{{ copy.presetExploration }}</option>
          </select>
        </label>
        <button type="button" class="action-button" :disabled="phase === 'loading'" @click="loadPreset">{{ copy.loadPreset }}</button>
      </div>

      <div class="control-grid">
        <label>
          {{ copy.modeLabel }}
          <select v-model="config.mode" aria-label="Monte Carlo schedule" data-mode-selector @change="changeMode">
            <option v-for="mode in MONTE_CARLO_MODES" :key="mode" :value="mode">
              {{ mode === 'mc_basic' ? copy.modeBasic : mode === 'exploring_starts' ? copy.modeExploringStarts : copy.modeEpsilonGreedy }}
            </option>
          </select>
        </label>
        <label>
          {{ copy.visitLabel }}
          <select v-model="config.visitStrategy" aria-label="Visit strategy" data-visit-strategy @change="changeVisitStrategy">
            <option v-for="strategy in MONTE_CARLO_VISIT_STRATEGIES" :key="strategy" :value="strategy">
              {{ strategy === 'initial' ? copy.visitInitial : strategy === 'first' ? copy.visitFirst : copy.visitEvery }}
            </option>
          </select>
        </label>
        <label>
          {{ copy.objectiveLabel }}
          <select v-model="config.objective" aria-label="Objective" data-objective>
            <option v-for="objective in MONTE_CARLO_OBJECTIVES" :key="objective" :value="objective">
              {{ objective === 'prediction' ? copy.prediction : copy.control }}
            </option>
          </select>
        </label>
        <label>
          {{ copy.epsilon }}
          <input v-model.number="config.epsilon" type="range" min="0" max="1" step="0.05" aria-label="Exploration ε" data-epsilon-input :aria-invalid="configValidation?.field === 'epsilon'" />
          <output>{{ config.epsilon.toFixed(2) }}</output>
        </label>
        <label>
          {{ copy.wind }}
          <input v-model.number="config.slipProbability" type="range" min="0" max="1" step="0.05" aria-label="Wind probability w" data-wind-input :aria-invalid="configValidation?.field === 'slipProbability'" />
          <output>{{ Math.round(config.slipProbability * 100) }}%</output>
        </label>
        <label>
          {{ copy.discount }}
          <input v-model.number="config.discount" type="number" min="0" max="1" step="0.05" aria-label="Discount factor γ" :aria-invalid="configValidation?.field === 'discount'" />
        </label>
        <label>
          {{ copy.episodesPerStep }}
          <input v-model.number="config.episodesPerStep" type="number" min="1" max="2000" step="1" aria-label="Episodes per batch" :aria-invalid="configValidation?.field === 'episodesPerStep'" />
        </label>
        <label>
          {{ copy.maxEpisodes }}
          <input v-model.number="config.maxEpisodes" type="number" min="1" max="100000" step="1" aria-label="Maximum episodes" :aria-invalid="configValidation?.field === 'maxEpisodes'" />
        </label>
        <label>
          {{ copy.maxSteps }}
          <input v-model.number="config.maxSteps" type="number" min="1" max="100" step="1" aria-label="Episode step cap" :aria-invalid="configValidation?.field === 'maxSteps'" />
        </label>
        <label>
          {{ copy.seed }}
          <input v-model="config.seedHex" type="text" inputmode="text" spellcheck="false" aria-label="Seed (hex)" :aria-invalid="configValidation?.field === 'seedHex'" />
        </label>
      </div>
      <p v-if="configValidation" class="validation-message" role="alert">{{ copy.errorPrefix }} {{ localizedError(configValidation.code) }}</p>
      <div class="control-actions">
        <button type="button" class="action-button action-button--primary" :disabled="phase === 'loading'" @click="applyAndRestart">{{ copy.apply }}</button>
        <button type="button" class="action-button" :disabled="!canSample" @click="sampleEpisode">{{ copy.episode }}</button>
        <button type="button" class="action-button" :disabled="!canSample" @click="runBatch">{{ copy.step }}</button>
        <button type="button" class="action-button" :disabled="!canSample || running" @click="runToBudget">{{ copy.run }}</button>
        <button type="button" class="action-button" :disabled="!running" @click="pauseRun">{{ copy.pause }}</button>
        <button type="button" class="action-button" :disabled="!canCommand" @click="resetLedger">{{ copy.reset }}</button>
      </div>
    </section>

    <section class="metric-strip" :aria-label="copy.metrics">
      <div><span>{{ copy.episodeCount }}</span><strong data-metric-episodes>{{ snapshot.episodeCount }}</strong></div>
      <div><span>{{ copy.totalSteps }}</span><strong data-metric-steps>{{ snapshot.totalSteps }}</strong></div>
      <div><span>{{ copy.meanReturn }}</span><strong data-metric-mean>{{ formatNumber(snapshot.episodeReturnMean) }}</strong></div>
      <div><span>{{ copy.returnVariance }}</span><strong data-metric-variance>{{ formatNumber(snapshot.episodeReturnVariance) }}</strong></div>
      <div><span>{{ copy.coveredPairs }}</span><strong data-metric-covered>{{ snapshot.coveredPairs }}</strong></div>
      <div><span>{{ copy.policyChanges }}</span><strong data-metric-policy-changes>{{ snapshot.policyChanges }}</strong></div>
    </section>

    <section class="monte-carlo-map-panel">
      <div class="section-heading">
        <div><p class="lab-eyebrow">{{ copy.mapTitle }}</p><p>{{ copy.mapBody }}</p></div>
        <span class="run-meta">{{ interpolate(copy.modeMeta, { mode: config.mode, visit: config.visitStrategy }) }} · {{ interpolate(copy.seedMeta, { seed: appliedConfig.seedHex }) }} · {{ interpolate(copy.windMeta, { wind: `${Math.round(appliedConfig.slipProbability * 100)}%` }) }}</span>
      </div>
      <div class="monte-carlo-map-layout">
        <div class="monte-carlo-grid" role="group" :aria-label="copy.mapTitle">
          <button
            v-for="state in stateCount"
            :key="state - 1"
            type="button"
            :class="cellClass(state - 1)"
            :data-state="state - 1"
            :data-value="snapshot.values[state - 1] ?? 0"
            :data-visits="(snapshot.visitCounts[state - 1] ?? []).reduce((sum, count) => sum + count, 0)"
            :aria-label="stateAria(state - 1)"
            @click="selectedState = state - 1"
          >
            <span class="state-id">{{ stateLabel(state - 1) }}</span>
            <span class="state-value">{{ formatNumber(snapshot.values[state - 1] ?? 0) }}</span>
            <span v-if="state - 1 !== terminalState" class="state-policy">{{ actionGlyphs[(snapshot.policy[state - 1] ?? 4) as ActionCode] }}</span>
            <span class="state-visits">{{ (snapshot.visitCounts[state - 1] ?? []).reduce((sum, count) => sum + count, 0) || '·' }}</span>
          </button>
        </div>
        <div class="selected-state-panel" :data-state="selectedState">
          <h3>{{ stateLabel(selectedState) }} · {{ selectedKind }}</h3>
          <p>{{ copy.currentValue }} = <strong>{{ formatNumber(snapshot.values[selectedState] ?? 0) }}</strong> · {{ copy.visits }} = <strong>{{ selectedVisits.reduce((sum, value) => sum + value, 0) }}</strong></p>
          <p class="value-note">{{ copy.stateValueNote }}</p>
          <table class="monte-carlo-action-table" data-action-values>
            <caption>{{ copy.policyProbabilitiesTitle }}</caption>
            <thead><tr><th>{{ copy.action }}</th><th>{{ copy.currentValue }}</th><th>{{ copy.visits }}</th><th>{{ copy.probability }}</th></tr></thead>
            <tbody>
              <tr v-for="action in actionCodes" :key="action" :data-action="action" :data-greedy="selectedPolicy === action">
                <td><button type="button" class="link-button" @click="selectedAction = action">{{ actionGlyphs[action] }} {{ actionName(action) }}</button></td>
                <td :data-q-value="selectedValues[action]">{{ selectedVisits[action] ? formatNumber(selectedValues[action]) : copy.unvisited }}</td>
                <td :data-visit-count="selectedVisits[action]">{{ selectedVisits[action] }}</td>
                <td :data-policy-probability="selectedProbabilities[action]">{{ (selectedProbabilities[action] * 100).toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="monte-carlo-columns">
      <section class="data-panel" data-episode-trace>
        <div class="section-heading"><div><h3>{{ copy.traceTitle }}</h3><p>{{ copy.traceBody }}</p></div><span v-if="latestEpisode" class="panel-meta">{{ copy.episodeNumber }} {{ latestEpisode.number }}</span></div>
        <p v-if="!latestEpisode" class="empty-state">{{ copy.episodeEmpty }}</p>
        <template v-else>
          <div class="episode-summary">
            <span>{{ copy.episodeLength }} <strong>{{ latestEpisode.length }}</strong></span>
            <span>{{ copy.episodeReturn }} <strong>{{ formatNumber(latestEpisode.totalReturn) }}</strong></span>
            <span>{{ latestEpisode.done ? copy.episodeTerminal : latestEpisode.truncated ? copy.episodeTruncated : copy.episodeActive }}</span>
          </div>
          <div class="table-scroll">
            <table class="monte-carlo-trace-table">
              <thead><tr><th>{{ copy.traceTime }}</th><th>{{ copy.traceState }}</th><th>{{ copy.traceAction }}</th><th>{{ copy.traceActualAction }}</th><th>{{ copy.traceNext }}</th><th>{{ copy.traceReward }}</th><th>{{ copy.traceWeight }}</th><th>{{ copy.traceContribution }}</th></tr></thead>
              <tbody>
                <tr v-for="(step, index) in latestRows" :key="`${step.state}-${index}`" :data-time="index" :data-state="step.state" :data-action="step.action" :data-actual-action="step.actualAction ?? step.action">
                  <td>{{ index }}</td><td>{{ stateLabel(step.state) }}</td><td>{{ actionGlyphs[step.action] }} {{ actionName(step.action) }}</td><td>{{ actionGlyphs[step.actualAction ?? step.action] }} {{ actionName(step.actualAction ?? step.action) }}</td><td>{{ stateLabel(step.nextState) }}</td><td>{{ formatNumber(step.reward) }}</td><td>{{ step.discountWeight.toFixed(4) }}</td><td>{{ formatNumber(step.discountedReward) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>

      <section class="data-panel" data-return-ledger>
        <div class="section-heading"><div><h3>{{ copy.returnTitle }}</h3><p>{{ copy.returnBody }}</p></div></div>
        <p v-if="returnRows.length === 0" class="empty-state">{{ copy.episodeEmpty }}</p>
        <div v-else class="table-scroll">
          <table class="monte-carlo-return-table">
            <thead><tr><th>{{ copy.returnTime }}</th><th>{{ copy.returnPair }}</th><th>{{ copy.returnValue }}</th><th>{{ copy.returnIncluded }}</th><th>{{ copy.returnCount }}</th><th>{{ copy.returnEstimate }}</th></tr></thead>
            <tbody>
              <tr v-for="row in returnRows" :key="`${row.time}-${row.state}-${row.action}`" :data-time="row.time" :data-included="row.included">
                <td>{{ row.time }}</td><td>{{ stateLabel(row.state) }}, {{ actionGlyphs[row.action] }}</td><td data-return-value>{{ formatNumber(row.return) }}</td><td>{{ row.included ? copy.yes : copy.no }}</td><td :data-visit-count="row.count">{{ row.count || copy.unvisited }}</td><td>{{ row.count ? formatNumber(row.estimate) : copy.unvisited }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="data-panel visit-panel" data-visit-counts>
      <div class="section-heading"><div><h3>{{ copy.visitCountsTitle }}</h3><p>{{ copy.visitCountsBody }}</p></div><span class="panel-meta">{{ stateLabel(selectedState) }}</span></div>
      <div class="table-scroll">
        <table class="monte-carlo-visit-table">
          <thead><tr><th>{{ copy.action }}</th><th>{{ copy.count }}</th><th>{{ copy.mean }}</th><th>{{ copy.variance }}</th><th>{{ copy.probability }}</th></tr></thead>
          <tbody>
            <tr v-for="action in actionCodes" :key="action" :data-state="selectedState" :data-action="action">
              <td>{{ actionGlyphs[action] }} {{ actionName(action) }}</td><td :data-count="selectedVisits[action]">{{ selectedVisits[action] }}</td><td>{{ selectedVisits[action] ? formatNumber(selectedValues[action]) : copy.unvisited }}</td><td>{{ selectedVisits[action] ? formatNumber(selectedVariances[action]) : copy.unvisited }}</td><td>{{ (selectedProbabilities[action] * 100).toFixed(1) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="data-panel return-chart-panel" data-return-distribution>
      <div class="section-heading"><div><h3>{{ copy.meanReturn }} · {{ copy.returnVariance }}</h3><p>{{ copy.visitCountsBody }}</p></div><span class="panel-meta">n = {{ returnChart.count }}</span></div>
      <svg class="monte-carlo-return-chart" viewBox="0 0 560 150" role="img" :aria-label="copy.meanReturn">
        <title>{{ copy.meanReturn }}</title><desc>{{ copy.returnVariance }} · {{ returnChart.min.toFixed(3) }} … {{ returnChart.max.toFixed(3) }}</desc>
        <line x1="18" y1="132" x2="542" y2="132" /><polyline :points="returnChart.points" fill="none" />
      </svg>
      <table class="history-table"><thead><tr><th>{{ copy.episodeNumber }}</th><th>{{ copy.episodeReturn }}</th></tr></thead><tbody><tr v-for="(episode, index) in episodeHistory.slice(-20)" :key="`${episode.number}-${index}`"><td>{{ episode.number }}</td><td>{{ formatNumber(episode.totalReturn) }}</td></tr></tbody></table>
    </section>

    <section class="data-panel audit-panel" data-model-free-audit>
      <div class="section-heading"><div><h3>{{ copy.auditTitle }}</h3><p>{{ copy.auditBody }}</p></div><span class="panel-meta">{{ audit.creditedReturns }} {{ copy.returnIncluded }}</span></div>
      <ul class="monte-carlo-audit-list">
        <li v-for="item in auditItems" :key="item.key" :data-pass="item.pass" :data-audit="item.key"><span class="audit-mark">{{ item.pass ? '✓' : '!' }}</span>{{ item.label }}<span>{{ item.pass ? copy.pass : copy.fail }}</span></li>
      </ul>
      <p class="audit-note">{{ copy.referenceBody }}</p>
    </section>
    <p class="static-fallback">{{ copy.staticFallback }}</p>
  </section>
</template>

<style scoped>
.monte-carlo-lab { --mc-border: color-mix(in srgb, var(--vp-c-divider) 78%, transparent); --mc-muted: var(--vp-c-text-2); margin: 2rem 0; color: var(--vp-c-text-1); }
.monte-carlo-hero { padding: 1.35rem; border: 1px solid var(--mc-border); border-radius: 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--vp-c-brand-soft) 70%, transparent), transparent); }
.monte-carlo-hero h2 { margin: .3rem 0 .45rem; }
.monte-carlo-hero p { margin: .35rem 0; }
.lab-eyebrow { margin: 0; color: var(--vp-c-brand-1); font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.lab-badges { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .8rem; }
.engine-chip, .model-free-badge, .run-meta, .panel-meta { display: inline-flex; align-items: center; gap: .3rem; border: 1px solid var(--mc-border); border-radius: 999px; padding: .24rem .6rem; color: var(--mc-muted); font-size: .78rem; }
.model-free-badge { color: var(--vp-c-brand-1); border-color: color-mix(in srgb, var(--vp-c-brand-1) 42%, var(--mc-border)); }
.monte-carlo-status { display: flex; align-items: center; gap: .5rem; min-height: 2.3rem; color: var(--mc-muted); font-size: .9rem; }
.status-dot { width: .55rem; height: .55rem; border-radius: 50%; background: var(--vp-c-yellow-1); }
.status-dot[data-phase='ready'] { background: var(--vp-c-green-1); }.status-dot[data-phase='error'] { background: var(--vp-c-red-1); }
.monte-carlo-controls, .data-panel, .monte-carlo-map-panel { margin-top: 1rem; padding: 1rem; border: 1px solid var(--mc-border); border-radius: 12px; background: var(--vp-c-bg-soft); }
.control-row, .control-actions, .section-heading, .episode-summary { display: flex; flex-wrap: wrap; align-items: center; gap: .65rem; }
.control-row--presets { margin-bottom: .8rem; }.control-row--presets label { display: flex; align-items: center; gap: .5rem; }
.control-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: .7rem; }
label { display: grid; gap: .3rem; color: var(--mc-muted); font-size: .8rem; } label input, label select { width: 100%; }
label input[type='range'] { accent-color: var(--vp-c-brand-1); } label output { color: var(--vp-c-text-1); font-variant-numeric: tabular-nums; }
button, input, select { font: inherit; } button.action-button { border: 1px solid var(--mc-border); border-radius: 8px; padding: .45rem .7rem; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; } button.action-button:hover:not(:disabled) { border-color: var(--vp-c-brand-1); } button.action-button:disabled { cursor: not-allowed; opacity: .5; } .action-button--primary { background: var(--vp-c-brand-1); color: white; border-color: var(--vp-c-brand-1); }
.validation-message { margin: .7rem 0 0; color: var(--vp-c-danger-1); font-size: .84rem; }.control-actions { margin-top: .9rem; }
.metric-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: .5rem; margin-top: 1rem; }.metric-strip div { padding: .6rem .7rem; border: 1px solid var(--mc-border); border-radius: 9px; background: var(--vp-c-bg-soft); }.metric-strip span, .metric-strip strong { display: block; }.metric-strip span { color: var(--mc-muted); font-size: .72rem; }.metric-strip strong { margin-top: .2rem; font-variant-numeric: tabular-nums; }
.section-heading { justify-content: space-between; align-items: flex-start; }.section-heading h3, .section-heading p { margin: 0; }.section-heading p { margin-top: .2rem; color: var(--mc-muted); font-size: .84rem; }
.monte-carlo-map-layout { display: grid; grid-template-columns: minmax(250px, 390px) 1fr; gap: 1rem; margin-top: 1rem; }.monte-carlo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .35rem; aspect-ratio: 1; max-width: 390px; }.monte-carlo-state { position: relative; display: grid; min-width: 0; min-height: 4.2rem; place-content: center; gap: .1rem; border: 1px solid var(--mc-border); border-radius: 8px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; }.monte-carlo-state:hover, .monte-carlo-state.is-selected { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 22%, transparent); }.monte-carlo-state.is-hazard { background: color-mix(in srgb, var(--vp-c-red-soft) 55%, var(--vp-c-bg)); }.monte-carlo-state.is-goal { background: color-mix(in srgb, var(--vp-c-green-soft) 60%, var(--vp-c-bg)); }.state-id, .state-visits { color: var(--mc-muted); font-size: .67rem; }.state-value { font-variant-numeric: tabular-nums; font-size: .85rem; }.state-policy { font-size: 1.1rem; }.state-visits { position: absolute; right: .25rem; bottom: .18rem; }
.selected-state-panel { min-width: 0; }.selected-state-panel h3 { margin: 0 0 .35rem; }.selected-state-panel p { color: var(--mc-muted); font-size: .84rem; }.monte-carlo-action-table, .monte-carlo-trace-table, .monte-carlo-return-table, .monte-carlo-visit-table, .history-table { width: 100%; border-collapse: collapse; font-size: .78rem; }.monte-carlo-action-table caption { margin-bottom: .35rem; text-align: left; color: var(--mc-muted); }.monte-carlo-action-table th, .monte-carlo-action-table td, .monte-carlo-trace-table th, .monte-carlo-trace-table td, .monte-carlo-return-table th, .monte-carlo-return-table td, .monte-carlo-visit-table th, .monte-carlo-visit-table td, .history-table th, .history-table td { padding: .35rem .4rem; border-bottom: 1px solid var(--mc-border); text-align: left; }.monte-carlo-action-table tr[data-greedy='true'] { background: color-mix(in srgb, var(--vp-c-brand-soft) 55%, transparent); }.link-button { border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer; }
.monte-carlo-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.episode-summary { margin: .7rem 0; color: var(--mc-muted); font-size: .8rem; }.table-scroll { overflow-x: auto; max-height: 22rem; }.empty-state { color: var(--mc-muted); }.visit-panel, .return-chart-panel, .audit-panel { margin-top: 1rem; }.monte-carlo-return-chart { width: 100%; max-height: 180px; margin: .7rem 0; overflow: visible; }.monte-carlo-return-chart line { stroke: var(--mc-border); }.monte-carlo-return-chart polyline { stroke: var(--vp-c-brand-1); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }.history-table { max-height: 9rem; display: block; overflow: auto; }.history-table thead, .history-table tbody, .history-table tr { display: table; width: 100%; table-layout: fixed; }.monte-carlo-audit-list { display: grid; gap: .45rem; margin: .8rem 0 0; padding: 0; list-style: none; }.monte-carlo-audit-list li { display: grid; grid-template-columns: 1.4rem 1fr auto; gap: .35rem; align-items: center; padding: .45rem .55rem; border: 1px solid var(--mc-border); border-radius: 7px; font-size: .82rem; }.monte-carlo-audit-list li[data-pass='true'] .audit-mark { color: var(--vp-c-green-1); }.monte-carlo-audit-list li[data-pass='false'] .audit-mark { color: var(--vp-c-red-1); }.monte-carlo-audit-list li > span:last-child { color: var(--mc-muted); font-size: .75rem; }.audit-note, .static-fallback { color: var(--mc-muted); font-size: .82rem; }.static-fallback { margin-top: .8rem; }
@media (max-width: 760px) { .monte-carlo-map-layout, .monte-carlo-columns { grid-template-columns: 1fr; }.monte-carlo-grid { max-width: none; }.control-actions button { flex: 1 1 8rem; } }
@media (max-width: 420px) { .monte-carlo-hero, .monte-carlo-controls, .data-panel, .monte-carlo-map-panel { padding: .75rem; }.monte-carlo-grid { gap: .2rem; }.monte-carlo-state { min-height: 3.8rem; }.state-value { font-size: .72rem; } }
</style>
