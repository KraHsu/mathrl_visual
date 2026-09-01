<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import { interpolate, messagesFor, type Locale } from '../i18n/messages'
import {
  ACTION,
  GOAL_MODE,
  PROTOCOL_VERSION,
  acceptsResponse,
  type ActionCode,
  type GridWorldConfig,
  type GoalModeCode,
  type ModelOutcome,
  type Snapshot,
  type StepOutcome,
  type WorkerRequest,
  type WorkerResponse,
} from '../protocol'

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'en',
})

const guidedWindProbability = 0.2
const storageVersion = 5
const storageKey = `mathrl:exp-ch01-gridworld-basics:v${storageVersion}`
const copy = computed(() => messagesFor(props.locale).lab)
type LabMode =
  | 'world'
  | 'transition'
  | 'policy'
  | 'reward'
  | 'return'
  | 'episode'
  | 'markov'
  | 'audit'

type ExperimentCommand =
  | { kind: 'step'; action: ActionCode }
  | { kind: 'stepPolicy'; probabilities: number[] }

const modeOptions: Array<{
  value: LabMode
  key:
    | 'modeWorld'
    | 'modeTransition'
    | 'modePolicy'
    | 'modeReward'
    | 'modeReturn'
    | 'modeEpisode'
    | 'modeMarkov'
    | 'modeAudit'
}> = [
  { value: 'world', key: 'modeWorld' },
  { value: 'transition', key: 'modeTransition' },
  { value: 'policy', key: 'modePolicy' },
  { value: 'reward', key: 'modeReward' },
  { value: 'return', key: 'modeReturn' },
  { value: 'episode', key: 'modeEpisode' },
  { value: 'markov', key: 'modeMarkov' },
  { value: 'audit', key: 'modeAudit' },
]

const config = reactive<GridWorldConfig>({
  width: 4,
  height: 4,
  start: 0,
  goal: 15,
  goalMode: GOAL_MODE.terminate,
  hazards: [6, 9],
  slipProbability: 0,
  discount: 0.9,
  seedHex: '5eed',
  rewards: {
    default: -0.04,
    boundary: -1,
    hazard: -1,
    goal: 1,
  },
})
const appliedConfig = ref<GridWorldConfig>(cloneConfig(config))
const snapshot = ref<Snapshot>({
  state: config.start,
  stepCount: 0,
  cumulativeReturn: 0,
  discountedReturn: 0,
  done: false,
  truncated: false,
})
const history = ref<StepOutcome[]>([])
const commandHistory = ref<ExperimentCommand[]>([])
const model = ref<ModelOutcome[]>([])
const mode = ref<LabMode>('world')
const inspectedAction = ref<ActionCode>(ACTION.right)
const policyProbabilities = ref<number[]>([0.1, 0.4, 0.2, 0.2, 0.1])
const phase = ref<'loading' | 'ready' | 'error'>('loading')
const engineVersion = ref('')
const announcement = ref('')
const currentRunId = ref('')
const lastSequence = ref(-1)
const replaying = ref(false)
const awaitingStep = ref(false)
let worker: Worker | undefined
let pendingConfig: GridWorldConfig | undefined
let replayQueue: ExperimentCommand[] = []

const gridRows = computed(() =>
  Array.from({ length: appliedConfig.value.height }, (_, row) =>
    Array.from(
      { length: appliedConfig.value.width },
      (_, column) => row * appliedConfig.value.width + column,
    ),
  ),
)
const canStep = computed(
  () =>
    phase.value === 'ready' &&
    !snapshot.value.done &&
    !snapshot.value.truncated &&
    !replaying.value &&
    !awaitingStep.value,
)
const policySum = computed(() =>
  policyProbabilities.value.reduce((sum, probability) => sum + Number(probability), 0),
)
const policyValid = computed(
  () =>
    policyProbabilities.value.length === 5 &&
    policyProbabilities.value.every(
      (probability) => Number.isFinite(probability) && probability >= 0,
    ) &&
    Math.abs(policySum.value - 1) <= 1e-9,
)
const canRunPolicy = computed(() => canStep.value && policyValid.value)
const canRestart = computed(() => phase.value !== 'loading')
const selectedOutcomes = computed(() =>
  model.value.filter((outcome) => outcome.requestedAction === inspectedAction.value),
)
const rightSuccessProbability = computed(
  () =>
    model.value.find(
      (outcome) =>
        outcome.requestedAction === ACTION.right && outcome.actualAction === ACTION.right,
    )?.probability ?? 1,
)
const transitionRowsValid = computed(() =>
  snapshot.value.done || Object.values(ACTION).every((action) => {
    const sum = model.value
      .filter((outcome) => outcome.requestedAction === action)
      .reduce((total, outcome) => total + outcome.probability, 0)
    return Math.abs(sum - 1) <= 1e-9
  }),
)
const specialStatesValid = computed(() => {
  const live = appliedConfig.value
  const unique = new Set([live.start, live.goal, ...live.hazards])
  return unique.size === live.hazards.length + 2
})
const rewardsValid = computed(() =>
  Object.values(appliedConfig.value.rewards).every(Number.isFinite),
)
const auditItems = computed(() => [
  { label: copy.value.auditTransition, pass: transitionRowsValid.value },
  { label: copy.value.auditPolicy, pass: policyValid.value },
  {
    label: copy.value.auditDiscount,
    pass:
      Number.isFinite(appliedConfig.value.discount) &&
      appliedConfig.value.discount >= 0 &&
      appliedConfig.value.discount <= 1,
  },
  { label: copy.value.auditRewards, pass: rewardsValid.value },
  { label: copy.value.auditSpecialStates, pass: specialStatesValid.value },
])
const episodeStatus = computed(() => {
  if (snapshot.value.done) return copy.value.episodeTerminal
  if (
    snapshot.value.state === appliedConfig.value.goal &&
    appliedConfig.value.goalMode === GOAL_MODE.absorb
  ) {
    return copy.value.episodeAbsorbing
  }
  if (appliedConfig.value.goalMode === GOAL_MODE.continue) return copy.value.episodeContinuing
  return copy.value.episodeActive
})

const actionButtons: Array<{ code: ActionCode; icon: string; key: keyof typeof copy.value }> = [
  { code: ACTION.up, icon: '↑', key: 'up' },
  { code: ACTION.left, icon: '←', key: 'left' },
  { code: ACTION.stay, icon: '•', key: 'stay' },
  { code: ACTION.right, icon: '→', key: 'right' },
  { code: ACTION.down, icon: '↓', key: 'down' },
]

function newRunId(): string {
  return `ch01-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneConfig(source: GridWorldConfig): GridWorldConfig {
  return {
    ...source,
    hazards: [...source.hazards],
    rewards: { ...source.rewards },
  }
}

function cloneCommand(command: ExperimentCommand): ExperimentCommand {
  return command.kind === 'step'
    ? { kind: 'step', action: command.action }
    : { kind: 'stepPolicy', probabilities: [...command.probabilities] }
}

function post(request: WorkerRequest): void {
  worker?.postMessage(request)
}

function start(commandsToReplay: ExperimentCommand[] = []): void {
  if (!worker) return
  const nextConfig = cloneConfig(config)
  pendingConfig = nextConfig
  currentRunId.value = newRunId()
  lastSequence.value = -1
  history.value = []
  commandHistory.value = []
  model.value = []
  replayQueue = commandsToReplay.slice(0, 100).map(cloneCommand)
  replaying.value = replayQueue.length > 0
  awaitingStep.value = false
  phase.value = 'loading'
  announcement.value = copy.value.loading
  snapshot.value = {
    state: nextConfig.start,
    stepCount: 0,
    cumulativeReturn: 0,
    discountedReturn: 0,
    done: false,
    truncated: false,
  }
  post({
    v: PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'start',
    config: nextConfig,
  })
}

function step(action: ActionCode): void {
  if (!canStep.value) return
  executeCommand({ kind: 'step', action })
}

function stepPolicy(): void {
  if (!canRunPolicy.value) return
  executeCommand({
    kind: 'stepPolicy',
    probabilities: [...policyProbabilities.value],
  })
}

function enableGuidedWind(): void {
  Object.assign(config, cloneConfig(appliedConfig.value), {
    slipProbability: guidedWindProbability,
  })
  start()
}

function normalizePolicy(): void {
  const nonNegative = policyProbabilities.value.map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0,
  )
  const sum = nonNegative.reduce((total, value) => total + value, 0)
  policyProbabilities.value =
    sum > 0 ? nonNegative.map((value) => value / sum) : [0.2, 0.2, 0.2, 0.2, 0.2]
}

function executeCommand(command: ExperimentCommand): void {
  awaitingStep.value = true
  commandHistory.value.push(cloneCommand(command))
  saveExperiment()
  if (command.kind === 'step') {
    post({
      v: PROTOCOL_VERSION,
      runId: currentRunId.value,
      kind: 'step',
      action: command.action,
    })
    return
  }
  post({
    v: PROTOCOL_VERSION,
    runId: currentRunId.value,
    kind: 'stepPolicy',
    probabilities: [...command.probabilities],
  })
}

function replayNext(): void {
  const command = replayQueue.shift()
  if (command) {
    executeCommand(command)
  } else {
    replaying.value = false
    saveExperiment()
  }
}

function actionName(action: ActionCode): string {
  return copy.value.actionShort[String(action) as keyof typeof copy.value.actionShort]
}

function localizedError(code: string): string {
  return (
    (copy.value.errors as Record<string, string>)[code] ??
    interpolate(copy.value.unknownError, { code })
  )
}

function handleResponse(event: MessageEvent<WorkerResponse>): void {
  const response = event.data
  if (!acceptsResponse(response, currentRunId.value, lastSequence.value)) return
  lastSequence.value = response.sequence

  if (response.kind === 'error') {
    awaitingStep.value = false
    replaying.value = false
    replayQueue = []
    if (response.recoverable) {
      commandHistory.value.pop()
      saveExperiment()
      announcement.value = `${copy.value.commandRejected} ${localizedError(response.code)}`
      phase.value = 'ready'
      return
    }
    announcement.value = `${copy.value.failed} ${localizedError(response.code)}`
    phase.value = 'error'
    pendingConfig = undefined
    return
  }

  snapshot.value = response.snapshot
  model.value = response.model
  awaitingStep.value = false
  phase.value = 'ready'
  if (response.kind === 'started') {
    if (pendingConfig) appliedConfig.value = cloneConfig(pendingConfig)
    pendingConfig = undefined
    engineVersion.value = response.engineVersion
    announcement.value = copy.value.ready
    if (replayQueue.length > 0) {
      replayNext()
    } else {
      replaying.value = false
      saveExperiment()
    }
    return
  }

  history.value.push(response.outcome)
  saveExperiment()
  if (replayQueue.length > 0 && !response.outcome.done && !response.outcome.truncated) {
    replayNext()
    return
  }
  replaying.value = false
  replayQueue = []
  if (response.outcome.done) {
    announcement.value = copy.value.episodeComplete
  } else if (response.outcome.truncated) {
    announcement.value = copy.value.stepLimit
  } else if (response.outcome.slipped) {
    announcement.value = interpolate(copy.value.slipped, {
      requested: actionName(response.outcome.requestedAction),
      actual: actionName(response.outcome.actualAction),
    })
  } else if (response.outcome.boundaryCollision) {
    announcement.value = copy.value.boundary
  } else {
    announcement.value = interpolate(copy.value.moved, {
      from: response.outcome.previousState,
      to: response.outcome.nextState,
      reward: formatNumber(response.outcome.reward),
    })
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (
    event.target instanceof HTMLElement &&
    event.target.closest('button, input, select, textarea, a, summary')
  ) {
    return
  }
  const actionByKey: Record<string, ActionCode | undefined> = {
    ArrowUp: ACTION.up,
    ArrowRight: ACTION.right,
    ArrowDown: ACTION.down,
    ArrowLeft: ACTION.left,
    ' ': ACTION.stay,
  }
  const action = actionByKey[event.key]
  if (action === undefined) return
  event.preventDefault()
  step(action)
}

function cellKind(cell: number): 'start' | 'goal' | 'hazard' | 'empty' {
  const live = appliedConfig.value
  if (cell === live.goal) return 'goal'
  if (live.hazards.includes(cell)) return 'hazard'
  if (cell === live.start) return 'start'
  return 'empty'
}

function cellLabel(cell: number): string {
  const kind = cellKind(cell)
  const parts = [interpolate(copy.value.state, { state: cell }), copy.value[kind]]
  if (snapshot.value.state === cell) parts.push(copy.value.agent)
  return parts.join(', ')
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(props.locale, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(value)
}

function isActionCode(value: unknown): value is ActionCode {
  return typeof value === 'number' && Object.values(ACTION).includes(value as ActionCode)
}

function isGoalModeCode(value: unknown): value is GoalModeCode {
  return typeof value === 'number' && Object.values(GOAL_MODE).includes(value as GoalModeCode)
}

function isExperimentCommand(value: unknown): value is ExperimentCommand {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as {
    kind?: unknown
    action?: unknown
    probabilities?: unknown
  }
  if (candidate.kind === 'step') return isActionCode(candidate.action)
  if (candidate.kind !== 'stepPolicy' || !Array.isArray(candidate.probabilities)) return false
  if (
    candidate.probabilities.length !== 5 ||
    !candidate.probabilities.every(
      (probability) =>
        typeof probability === 'number' && Number.isFinite(probability) && probability >= 0,
    )
  ) {
    return false
  }
  const sum = candidate.probabilities.reduce((total, probability) => total + probability, 0)
  return Math.abs(sum - 1) <= 1e-9
}

function saveExperiment(): void {
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        v: storageVersion,
        config: cloneConfig(appliedConfig.value),
        commands: commandHistory.value.slice(0, 100).map(cloneCommand),
        mode: mode.value,
        inspectedAction: inspectedAction.value,
        policy: [...policyProbabilities.value],
      }),
    )
  } catch {
    // Storage is an enhancement; the experiment remains usable when it is unavailable.
  }
}

function restoreExperiment(): ExperimentCommand[] {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return []
    const saved = JSON.parse(raw) as {
      v?: unknown
      config?: Partial<GridWorldConfig>
      commands?: unknown[]
      mode?: unknown
      inspectedAction?: unknown
      policy?: unknown[]
    }
    if (saved.v !== storageVersion || !saved.config || !Array.isArray(saved.commands)) return []

    const restored = saved.config
    if (
      restored.width !== 4 ||
      restored.height !== 4 ||
      restored.start !== 0 ||
      restored.goal !== 15 ||
      !isGoalModeCode(restored.goalMode) ||
      !Array.isArray(restored.hazards) ||
      typeof restored.seedHex !== 'string' ||
      !/^(?:0x)?[0-9a-f]+$/i.test(restored.seedHex) ||
      typeof restored.slipProbability !== 'number' ||
      !Number.isFinite(restored.slipProbability) ||
      restored.slipProbability < 0 ||
      restored.slipProbability > 1 ||
      typeof restored.discount !== 'number' ||
      !Number.isFinite(restored.discount) ||
      restored.discount < 0 ||
      restored.discount > 1 ||
      !restored.rewards ||
      ![restored.rewards.default, restored.rewards.boundary, restored.rewards.hazard, restored.rewards.goal].every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      ) ||
      !restored.hazards.every(
        (value) => Number.isInteger(value) && value >= 0 && value < 16 && value !== 0 && value !== 15,
      ) ||
      new Set(restored.hazards).size !== restored.hazards.length ||
      saved.commands.length > 100 ||
      !saved.commands.every(isExperimentCommand)
    ) {
      return []
    }

    Object.assign(config, {
      ...restored,
      hazards: restored.hazards.filter((value): value is number => Number.isInteger(value)),
      rewards: { ...restored.rewards },
    })
    if (modeOptions.some((option) => option.value === saved.mode)) {
      mode.value = saved.mode as LabMode
    }
    if (isActionCode(saved.inspectedAction)) inspectedAction.value = saved.inspectedAction
    if (
      Array.isArray(saved.policy) &&
      saved.policy.length === 5 &&
      saved.policy.every((value) => typeof value === 'number' && Number.isFinite(value))
    ) {
      policyProbabilities.value = saved.policy.filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value),
      )
    }
    return saved.commands.filter(isExperimentCommand).map(cloneCommand)
  } catch {
    return []
  }
}

watch(
  [mode, inspectedAction, policyProbabilities],
  () => {
    if (phase.value === 'ready') saveExperiment()
  },
  { deep: true },
)

onMounted(() => {
  worker = new Worker(new URL('../workers/gridworld.worker.ts', import.meta.url), {
    type: 'module',
  })
  worker.addEventListener('message', handleResponse)
  worker.addEventListener('error', () => {
    phase.value = 'error'
    announcement.value = copy.value.failed
  })
  start(restoreExperiment())
})

onBeforeUnmount(() => {
  worker?.terminate()
  worker = undefined
})
</script>

<template>
  <section
    class="grid-lab"
    tabindex="0"
    :aria-labelledby="`grid-lab-title-${locale}`"
    @keydown="handleKeydown"
  >
    <header class="grid-lab__header">
      <div>
        <p class="grid-lab__eyebrow">{{ copy.eyebrow }}</p>
        <h2 :id="`grid-lab-title-${locale}`">{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </div>
      <span class="engine-chip" :data-phase="phase">
        <span aria-hidden="true" class="engine-chip__dot" />
        {{ engineVersion ? interpolate(copy.version, { version: engineVersion }) : copy.engine }}
      </span>
    </header>

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

    <div class="grid-lab__workspace">
      <div class="grid-lab__world-panel">
        <div
          class="grid-world"
          role="grid"
          :aria-label="copy.grid"
          :aria-rowcount="appliedConfig.height"
          :aria-colcount="appliedConfig.width"
          :style="{ '--grid-columns': appliedConfig.width }"
        >
          <div
            v-for="(row, rowIndex) in gridRows"
            :key="rowIndex"
            class="grid-row"
            role="row"
          >
            <div
              v-for="(cell, columnIndex) in row"
              :key="cell"
              class="grid-cell"
              :class="[
                `grid-cell--${cellKind(cell)}`,
                { 'grid-cell--active': snapshot.state === cell },
              ]"
              role="gridcell"
              :aria-rowindex="rowIndex + 1"
              :aria-colindex="columnIndex + 1"
              :aria-label="cellLabel(cell)"
            >
              <span class="grid-cell__state">s{{ cell }}</span>
              <span v-if="cellKind(cell) === 'goal'" aria-hidden="true" class="grid-cell__symbol">
                ◆
              </span>
              <span
                v-else-if="cellKind(cell) === 'hazard'"
                aria-hidden="true"
                class="grid-cell__symbol"
              >
                !
              </span>
              <span v-if="snapshot.state === cell" aria-hidden="true" class="grid-cell__agent">
                ●
              </span>
            </div>
          </div>
        </div>

        <p class="grid-lab__keyboard">{{ copy.keyboard }}</p>

        <div class="action-pad" :aria-label="copy.actions" role="group">
          <button
            v-for="action in actionButtons"
            :key="action.code"
            class="action-button"
            :class="`action-button--${action.code}`"
            type="button"
            :disabled="!canStep"
            :aria-label="copy[action.key] as string"
            @click="step(action.code)"
          >
            <span aria-hidden="true">{{ action.icon }}</span>
          </button>
        </div>
      </div>

      <aside class="grid-lab__controls">
        <section v-if="mode === 'world'" class="lab-panel">
          <h3>{{ copy.settings }}</h3>
          <label>
            <span>{{ copy.seed }}</span>
            <input
              v-model.trim="config.seedHex"
              type="text"
              inputmode="text"
              pattern="(?:0x)?[0-9a-fA-F]+"
            />
          </label>
          <label>
            <span>{{ copy.wind }} · {{ Math.round(config.slipProbability * 100) }}%</span>
            <input
              v-model.number="config.slipProbability"
              type="range"
              min="0"
              max="0.6"
              step="0.1"
            />
          </label>
          <label>
            <span>{{ copy.discount }}</span>
            <input v-model.number="config.discount" type="number" min="0" max="1" step="0.05" />
          </label>
          <button
            class="lab-button lab-button--primary"
            type="button"
            :disabled="!canRestart"
            @click="start()"
          >
            {{ copy.apply }}
          </button>
        </section>

        <section v-else-if="mode === 'transition'" class="lab-panel">
          <h3>{{ copy.transitionPanelTitle }}</h3>
          <p>{{ copy.transitionPanelBody }}</p>
          <label>
            <span>{{ copy.inspectAction }}</span>
            <select v-model.number="inspectedAction">
              <option v-for="action in actionButtons" :key="action.code" :value="action.code">
                {{ actionName(action.code) }}
              </option>
            </select>
          </label>
          <div class="mini-table-wrap">
            <table class="mini-table">
              <thead>
                <tr>
                  <th scope="col">{{ copy.actualAction }}</th>
                  <th scope="col">{{ copy.probability }}</th>
                  <th scope="col">{{ copy.nextState }}</th>
                  <th scope="col">{{ copy.reward }}</th>
                  <th scope="col">{{ copy.collision }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="outcome in selectedOutcomes" :key="outcome.actualAction">
                  <td>{{ actionName(outcome.actualAction) }}</td>
                  <td>{{ formatNumber(outcome.probability) }}</td>
                  <td>s{{ outcome.nextState }}</td>
                  <td>{{ formatNumber(outcome.reward) }}</td>
                  <td>{{ outcome.boundaryCollision ? copy.yes : copy.no }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="appliedConfig.slipProbability === 0" class="lab-panel__hint">
            {{ copy.transitionWindHint }}
          </p>
          <button
            v-if="appliedConfig.slipProbability === 0"
            class="lab-button lab-button--primary"
            type="button"
            :disabled="!canRestart"
            @click="enableGuidedWind"
          >
            {{
              interpolate(copy.enableWind, {
                probability: Math.round(guidedWindProbability * 100),
              })
            }}
          </button>
        </section>

        <section v-else-if="mode === 'policy'" class="lab-panel">
          <h3>{{ copy.policyPanelTitle }}</h3>
          <p>{{ copy.policyPanelBody }}</p>
          <label v-for="action in actionButtons" :key="action.code">
            <span>
              {{ interpolate(copy.policyProbability, { action: actionName(action.code) }) }}
            </span>
            <input
              v-model.number="policyProbabilities[action.code]"
              type="number"
              min="0"
              max="1"
              step="0.05"
            />
          </label>
          <p class="lab-panel__check" :data-pass="policyValid">
            {{ interpolate(copy.policySum, { sum: formatNumber(policySum) }) }} ·
            {{ policyValid ? copy.policyReady : copy.policyNeedsNormalization }}
          </p>
          <button class="lab-button" type="button" @click="normalizePolicy">
            {{ copy.normalizePolicy }}
          </button>
          <button
            class="lab-button lab-button--primary"
            type="button"
            :disabled="!canRunPolicy"
            @click="stepPolicy"
          >
            {{ copy.runPolicy }}
          </button>
        </section>

        <section v-else-if="mode === 'reward'" class="lab-panel">
          <h3>{{ copy.rewardPanelTitle }}</h3>
          <p>{{ copy.rewardPanelBody }}</p>
          <label>
            <span>{{ copy.defaultReward }}</span>
            <input v-model.number="config.rewards.default" type="number" step="0.05" />
          </label>
          <label>
            <span>{{ copy.boundaryReward }}</span>
            <input v-model.number="config.rewards.boundary" type="number" step="0.1" />
          </label>
          <label>
            <span>{{ copy.hazardReward }}</span>
            <input v-model.number="config.rewards.hazard" type="number" step="0.1" />
          </label>
          <label>
            <span>{{ copy.goalReward }}</span>
            <input v-model.number="config.rewards.goal" type="number" step="0.1" />
          </label>
          <p class="lab-panel__hint">{{ copy.rewardApplyHint }}</p>
          <button
            class="lab-button lab-button--primary"
            type="button"
            :disabled="!canRestart"
            @click="start()"
          >
            {{ copy.apply }}
          </button>
        </section>

        <section v-else-if="mode === 'return'" class="lab-panel">
          <h3>{{ copy.returnPanelTitle }}</h3>
          <p>{{ copy.returnPanelBody }}</p>
          <div class="formula-card" aria-label="Discounted return formula">
            G<sub>0</sub> = Σ<sub>t=0</sub><sup>T−1</sup> γ<sup>t</sup>r<sub>t+1</sub>
          </div>
          <dl class="compact-metrics">
            <div>
              <dt>{{ copy.discount }}</dt>
              <dd>{{ formatNumber(appliedConfig.discount) }}</dd>
            </div>
            <div><dt>{{ copy.return }}</dt><dd>{{ formatNumber(snapshot.cumulativeReturn) }}</dd></div>
            <div>
              <dt>{{ copy.discountedReturn }}</dt>
              <dd>{{ formatNumber(snapshot.discountedReturn) }}</dd>
            </div>
          </dl>
        </section>

        <section v-else-if="mode === 'episode'" class="lab-panel">
          <h3>{{ copy.episodePanelTitle }}</h3>
          <p>{{ copy.episodePanelBody }}</p>
          <label>
            <span>{{ copy.goalMode }}</span>
            <select v-model.number="config.goalMode">
              <option :value="GOAL_MODE.terminate">{{ copy.goalTerminate }}</option>
              <option :value="GOAL_MODE.absorb">{{ copy.goalAbsorb }}</option>
              <option :value="GOAL_MODE.continue">{{ copy.goalContinue }}</option>
            </select>
          </label>
          <div class="episode-status" :data-done="snapshot.done">
            <strong>{{ copy.episodeStatus }}</strong>
            <span>{{ episodeStatus }}</span>
          </div>
          <button
            class="lab-button lab-button--primary"
            type="button"
            :disabled="!canRestart"
            @click="start()"
          >
            {{ copy.apply }}
          </button>
        </section>

        <section v-else-if="mode === 'markov'" class="lab-panel">
          <h3>{{ copy.markovPanelTitle }}</h3>
          <p>{{ copy.markovPanelBody }}</p>
          <p><strong>{{ interpolate(copy.sameVisibleState, { state: snapshot.state }) }}</strong></p>
          <ul v-if="appliedConfig.slipProbability > 0" class="context-list">
            <li>{{ copy.calmContext }}</li>
            <li>
              {{
                interpolate(copy.windContext, {
                  probability: formatNumber(rightSuccessProbability),
                })
              }}
            </li>
          </ul>
          <p v-if="appliedConfig.slipProbability === 0" class="lab-panel__hint">
            {{ copy.increaseWind }}
          </p>
          <button
            v-if="appliedConfig.slipProbability === 0"
            class="lab-button lab-button--primary"
            type="button"
            :disabled="!canRestart"
            @click="enableGuidedWind"
          >
            {{
              interpolate(copy.enableWind, {
                probability: Math.round(guidedWindProbability * 100),
              })
            }}
          </button>
          <template v-else>
            <p class="concept-callout concept-callout--warning">{{ copy.markovFails }}</p>
            <p class="concept-callout">{{ copy.markovRestored }}</p>
          </template>
        </section>

        <section v-else class="lab-panel">
          <h3>{{ copy.auditPanelTitle }}</h3>
          <p>{{ copy.auditPanelBody }}</p>
          <ul class="audit-list">
            <li v-for="item in auditItems" :key="item.label" :data-pass="item.pass">
              <span aria-hidden="true">{{ item.pass ? '✓' : '!' }}</span>
              <span>{{ item.label }}</span>
              <strong>{{ item.pass ? copy.pass : copy.fail }}</strong>
            </li>
          </ul>
        </section>

        <button class="lab-button" type="button" :disabled="!canRestart" @click="start()">
          {{ copy.reset }}
        </button>
      </aside>
    </div>

    <div class="metric-strip" :aria-label="copy.metrics">
      <div><span>{{ copy.currentState }}</span><strong>s{{ snapshot.state }}</strong></div>
      <div><span>{{ copy.steps }}</span><strong>{{ snapshot.stepCount }}</strong></div>
      <div><span>{{ copy.return }}</span><strong>{{ formatNumber(snapshot.cumulativeReturn) }}</strong></div>
      <div><span>{{ copy.discountedReturn }}</span><strong>{{ formatNumber(snapshot.discountedReturn) }}</strong></div>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <p class="grid-lab__status" :data-phase="phase" aria-hidden="true">{{ announcement }}</p>

    <details class="trajectory-panel" :open="history.length > 0">
      <summary>{{ copy.trajectory }} <span>({{ history.length }})</span></summary>
      <p v-if="history.length === 0">{{ copy.noSteps }}</p>
      <div v-else class="trajectory-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{{ copy.step }}</th>
              <th scope="col">{{ copy.requested }}</th>
              <th scope="col">{{ copy.actual }}</th>
              <th scope="col">{{ copy.transition }}</th>
              <th scope="col">{{ copy.reward }}</th>
              <th scope="col">{{ copy.discountWeightShort }}</th>
              <th scope="col">{{ copy.contribution }}</th>
              <th scope="col">{{ copy.cumulative }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in history"
              :key="item.stepCount"
              :data-requested-action="item.requestedAction"
              :data-actual-action="item.actualAction"
            >
              <td>{{ item.stepCount }}</td>
              <td>{{ actionName(item.requestedAction) }}</td>
              <td>{{ actionName(item.actualAction) }}</td>
              <td>s{{ item.previousState }} → s{{ item.nextState }}</td>
              <td>{{ formatNumber(item.reward) }}</td>
              <td>{{ formatNumber(item.discountWeight) }}</td>
              <td>{{ formatNumber(item.discountedContribution) }}</td>
              <td>{{ formatNumber(item.cumulativeReturn) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>
