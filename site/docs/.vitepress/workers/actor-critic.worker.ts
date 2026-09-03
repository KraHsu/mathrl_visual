/// <reference lib="webworker" />

import init, * as wasmModule from '../generated/wasm/mathrl_wasm.js'
import {
  ACTOR_CRITIC_PROTOCOL_VERSION,
  actorCriticConfigValidationError,
  canonicalActorCriticMode,
  type ActorCriticConfig,
  type ActorCriticSnapshot,
  type ActorCriticStep,
  type ActorCriticWorkerRequest,
  type ActorCriticWorkerResponse,
} from '../actorCriticProtocol'

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
type AnyRecord = Record<string, unknown>
type Evaluator = AnyRecord & {
  free?: () => void
  snapshot?: () => unknown
  step?: () => unknown
  episode?: () => unknown
  advance?: (episodes: number) => unknown
  runToCompletion?: () => unknown
  run_to_completion?: () => unknown
  reset?: (seed: string | null) => unknown
}
const moduleRecord = wasmModule as unknown as AnyRecord
let initialization: Promise<void> | undefined
let evaluator: Evaluator | undefined
let config: ActorCriticConfig | undefined
let activeRunId = ''
let sequence = 0

function post(message: ActorCriticWorkerResponse): void {
  scope.postMessage(message)
}

async function ensureEngine(): Promise<void> {
  initialization ??= init().then(() => undefined).catch((error: unknown) => {
    initialization = undefined
    throw error
  })
  await initialization
}

function record(value: unknown): AnyRecord {
  return value && typeof value === 'object' ? (value as AnyRecord) : {}
}

function valueAt(source: AnyRecord, ...keys: string[]): unknown {
  for (const key of keys) if (key in source) return source[key]
  return undefined
}

function finite(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function integer(value: unknown, fallback = 0): number {
  const number = finite(value, fallback)
  return Number.isInteger(number) ? number : Math.trunc(number)
}

function bool(value: unknown): boolean {
  return value === true
}

function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map((item) => finite(item)) : []
}

function matrix(value: unknown): number[][] {
  return Array.isArray(value) ? value.map((row) => numbers(row)) : []
}

function normalizeStep(value: unknown, fallbackEpisode: number): ActorCriticStep {
  const source = record(value)
  return {
    episode: integer(valueAt(source, 'episode', 'index'), fallbackEpisode),
    time: integer(valueAt(source, 'time', 't')),
    state: integer(valueAt(source, 'state')),
    action: integer(valueAt(source, 'action')),
    nextState: integer(valueAt(source, 'nextState', 'next_state')),
    reward: finite(valueAt(source, 'reward')),
    done: bool(valueAt(source, 'done', 'terminated')),
    truncated: bool(valueAt(source, 'truncated')),
    targetProbability: finite(valueAt(source, 'targetProbability', 'target_probability')),
    behaviorProbability: finite(valueAt(source, 'behaviorProbability', 'behavior_probability')),
    importanceRatio: finite(valueAt(source, 'importanceRatio', 'importance_ratio'), 1),
    actorProbability: numbers(valueAt(source, 'actorProbability', 'actor_probability', 'probabilities')),
    scoreGradient: numbers(valueAt(source, 'scoreGradient', 'score_gradient', 'gradient')),
    qValue: finite(valueAt(source, 'qValue', 'q_value')),
    criticValue: finite(valueAt(source, 'criticValue', 'critic_value')),
    bootstrap: finite(valueAt(source, 'bootstrap')),
    tdTarget: finite(valueAt(source, 'tdTarget', 'td_target')),
    tdError: finite(valueAt(source, 'tdError', 'td_error')),
    advantage: finite(valueAt(source, 'advantage')),
    actorUpdate: numbers(valueAt(source, 'actorUpdate', 'actor_update')),
    criticUpdate: finite(valueAt(source, 'criticUpdate', 'critic_update')),
    actorLogits: numbers(valueAt(source, 'actorLogits', 'actor_logits')),
    criticValues: numbers(valueAt(source, 'criticValues', 'critic_values')),
    qValues: matrix(valueAt(source, 'qValues', 'q_values')),
  }
}

function normalizeSnapshot(value: unknown, fallback: ActorCriticConfig): ActorCriticSnapshot {
  const source = record(value)
  const history = Array.isArray(valueAt(source, 'history', 'trajectory'))
    ? (valueAt(source, 'history', 'trajectory') as unknown[]).map((item, index) => normalizeStep(item, index + 1))
    : []
  const rawLast = valueAt(source, 'lastStep', 'last_step')
  return {
    mode: canonicalActorCriticMode(valueAt(source, 'mode')) ?? fallback.mode,
    actorAlpha: finite(valueAt(source, 'actorAlpha', 'actor_alpha'), fallback.actorAlpha),
    criticAlpha: finite(valueAt(source, 'criticAlpha', 'critic_alpha'), fallback.criticAlpha),
    discount: finite(valueAt(source, 'discount'), fallback.discount),
    epsilon: finite(valueAt(source, 'epsilon'), fallback.epsilon),
    maxEpisodes: integer(valueAt(source, 'maxEpisodes', 'max_episodes'), fallback.maxEpisodes),
    maxSteps: integer(valueAt(source, 'maxSteps', 'max_steps'), fallback.maxSteps),
    seedHex: String(valueAt(source, 'seedHex', 'seed_hex') ?? fallback.seedHex),
    episodeCount: integer(valueAt(source, 'episodeCount', 'episode_count'), 0),
    totalSteps: integer(valueAt(source, 'totalSteps', 'total_steps'), history.length),
    actorLogits: matrix(valueAt(source, 'actorLogits', 'actor_logits')),
    actorProbabilities: matrix(valueAt(source, 'actorProbabilities', 'actor_probabilities', 'probabilities')),
    criticValues: numbers(valueAt(source, 'criticValues', 'critic_values')),
    qValues: matrix(valueAt(source, 'qValues', 'q_values')),
    averageReturn: finite(valueAt(source, 'averageReturn', 'average_return')),
    returnVariance: finite(valueAt(source, 'returnVariance', 'return_variance')),
    averageTdError: finite(valueAt(source, 'averageTdError', 'average_td_error')),
    averageAdvantage: finite(valueAt(source, 'averageAdvantage', 'average_advantage')),
    averageImportanceRatio: finite(valueAt(source, 'averageImportanceRatio', 'average_importance_ratio'), 1),
    entropy: finite(valueAt(source, 'entropy')),
    converged: bool(valueAt(source, 'converged')),
    truncated: bool(valueAt(source, 'truncated')),
    exhausted: bool(valueAt(source, 'exhausted')),
    lastEpisodeReturn: finite(valueAt(source, 'lastEpisodeReturn', 'last_episode_return')),
    lastStep: rawLast == null ? undefined : normalizeStep(rawLast, history.length || 1),
    history,
  }
}

function normalizeError(error: unknown): { code: string; message: string } {
  const source = record(error)
  if (typeof source.code === 'string' && typeof source.message === 'string') {
    return { code: source.code, message: source.message }
  }
  if (error instanceof Error) return { code: 'worker_error', message: error.message }
  return { code: 'worker_error', message: String(error) }
}

function constructor(): new (...args: unknown[]) => Evaluator {
  const candidate = moduleRecord.ActorCriticEvaluator
  if (typeof candidate !== 'function') throw new Error('ActorCriticEvaluator export is unavailable')
  return candidate as new (...args: unknown[]) => Evaluator
}

function create(value: ActorCriticConfig): Evaluator {
  const Class = constructor()
  return new Class(
    canonicalActorCriticMode(value.mode) ?? value.mode,
    value.actorAlpha,
    value.criticAlpha,
    value.discount,
    value.epsilon,
    value.maxEpisodes,
    value.maxSteps,
    value.seedHex,
  )
}

function current(request: ActorCriticWorkerRequest): boolean {
  return request.runId === activeRunId && request.sequence >= sequence
}

async function handle(request: ActorCriticWorkerRequest): Promise<void> {
  if (request.v !== ACTOR_CRITIC_PROTOCOL_VERSION) return
  if (request.kind === 'start') {
    const validation = actorCriticConfigValidationError(request.config)
    if (validation) {
      post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'error', runId: request.runId, sequence: request.sequence, code: validation.code, message: validation.message })
      return
    }
    activeRunId = request.runId
    sequence = request.sequence
    const nextConfig: ActorCriticConfig = { ...request.config, mode: canonicalActorCriticMode(request.config.mode)! }
    config = nextConfig
    await ensureEngine()
    evaluator?.free?.()
    evaluator = create(nextConfig)
    post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'ready', runId: activeRunId, sequence, snapshot: normalizeSnapshot(evaluator.snapshot?.(), nextConfig) })
    return
  }
  if (!current(request) || !evaluator || !config) return
  sequence = request.sequence
  const activeConfig = config
  try {
    if (request.kind === 'step') {
      const raw = evaluator.step?.() ?? evaluator.episode?.()
      const result = record(raw)
      const snapshot = normalizeSnapshot(valueAt(result, 'snapshot'), activeConfig)
      const steps = Array.isArray(valueAt(result, 'steps')) ? valueAt(result, 'steps') as unknown[] : []
      post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'step', runId: activeRunId, sequence, outcome: { snapshot, steps: steps.map((item, index) => normalizeStep(item, snapshot.episodeCount)) } })
    } else if (request.kind === 'advance') {
      const count = Math.max(1, Math.min(500, Math.trunc(request.episodes)))
      const result = record(evaluator.advance?.(count))
      const snapshot = normalizeSnapshot(valueAt(result, 'snapshot'), activeConfig)
      const episodes = Array.isArray(valueAt(result, 'episodes')) ? valueAt(result, 'episodes') as unknown[] : []
      post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'advance', runId: activeRunId, sequence, outcome: { snapshot, episodes: episodes.map((item) => {
        const episode = record(item)
        const episodeSnapshot = normalizeSnapshot(valueAt(episode, 'snapshot'), activeConfig)
        const steps = Array.isArray(valueAt(episode, 'steps')) ? valueAt(episode, 'steps') as unknown[] : []
        return { snapshot: episodeSnapshot, steps: steps.map((step, index) => normalizeStep(step, episodeSnapshot.episodeCount)) }
      }) } })
    } else if (request.kind === 'run') {
      const result = record(evaluator.runToCompletion?.() ?? evaluator.run_to_completion?.())
      const snapshot = normalizeSnapshot(valueAt(result, 'snapshot'), activeConfig)
      const episodes = Array.isArray(valueAt(result, 'episodes')) ? valueAt(result, 'episodes') as unknown[] : []
      post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'advance', runId: activeRunId, sequence, outcome: { snapshot, episodes: episodes.map((item) => {
        const episode = record(item)
        const episodeSnapshot = normalizeSnapshot(valueAt(episode, 'snapshot'), activeConfig)
        const steps = Array.isArray(valueAt(episode, 'steps')) ? valueAt(episode, 'steps') as unknown[] : []
        return { snapshot: episodeSnapshot, steps: steps.map((step, index) => normalizeStep(step, episodeSnapshot.episodeCount)) }
      }) } })
    } else if (request.kind === 'reset') {
      const snapshot = normalizeSnapshot(evaluator.reset?.(request.seedHex ?? null), activeConfig)
      post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'reset', runId: activeRunId, sequence, snapshot })
    }
  } catch (error) {
    const normalized = normalizeError(error)
    post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'error', runId: activeRunId, sequence, ...normalized })
  }
}

scope.addEventListener('message', (event: MessageEvent<ActorCriticWorkerRequest>) => {
  void handle(event.data).catch((error) => {
    const normalized = normalizeError(error)
    post({ v: ACTOR_CRITIC_PROTOCOL_VERSION, kind: 'error', runId: activeRunId, sequence, ...normalized })
  })
})
