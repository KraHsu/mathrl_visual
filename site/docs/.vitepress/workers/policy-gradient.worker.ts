/// <reference lib="webworker" />

import init, * as wasmModule from '../generated/wasm/mathrl_wasm.js'
import {
  POLICY_GRADIENT_PROTOCOL_VERSION,
  canonicalPolicyGradientMode,
  policyGradientConfigValidationError,
  type PolicyGradientConfig,
  type PolicyGradientSnapshot,
  type PolicyGradientStep,
  type PolicyGradientWorkerRequest,
  type PolicyGradientWorkerResponse,
} from '../policyGradientProtocol'

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
type AnyRecord = Record<string, unknown>
type Evaluator = AnyRecord & {
  free?: () => void
  snapshot?: () => unknown
  step?: () => unknown
  iteration?: () => unknown
  advance?: (episodes: number) => unknown
  runToCompletion?: () => unknown
  run_to_completion?: () => unknown
  reset?: (seed: string | null) => unknown
}
const moduleRecord = wasmModule as unknown as AnyRecord
let initialization: Promise<void> | undefined
let evaluator: Evaluator | undefined
let config: PolicyGradientConfig | undefined
let activeRunId = ''
let sequence = 0

function post(message: PolicyGradientWorkerResponse): void {
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

function finite(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function integer(value: unknown, fallback = 0): number {
  const number = finite(value, fallback)
  return Number.isInteger(number) ? number : Math.trunc(number)
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function valueAt(source: AnyRecord, ...keys: string[]): unknown {
  for (const key of keys) if (key in source) return source[key]
  return undefined
}

function normalizeStep(value: unknown, fallbackEpisode = 0): PolicyGradientStep {
  const source = record(value)
  const probabilities = array(valueAt(source, 'probabilities', 'policy'))
    .map((item) => finite(item))
  const scoreGradient = array(valueAt(source, 'scoreGradient', 'score_gradient', 'gradient'))
    .map((item) => finite(item))
  const parameterUpdate = array(valueAt(source, 'parameterUpdate', 'parameter_update', 'update'))
    .map((item) => finite(item))
  const logits = array(valueAt(source, 'logits', 'theta'))
    .map((item) => finite(item))
  return {
    episode: integer(valueAt(source, 'episode', 'index'), fallbackEpisode),
    state: integer(valueAt(source, 'state'), 0),
    action: integer(valueAt(source, 'action'), 0),
    rewardMean: finite(valueAt(source, 'rewardMean', 'reward_mean')),
    noise: finite(valueAt(source, 'noise')),
    reward: finite(valueAt(source, 'reward')),
    returnValue: finite(valueAt(source, 'returnValue', 'return_value', 'return')),
    baseline: finite(valueAt(source, 'baseline')),
    advantage: finite(valueAt(source, 'advantage')),
    probabilities,
    scoreGradient,
    parameterUpdate,
    logits,
    objective: finite(valueAt(source, 'objective')),
    entropy: finite(valueAt(source, 'entropy')),
    gradientNorm: finite(valueAt(source, 'gradientNorm', 'gradient_norm')),
  }
}

function normalizeSnapshot(value: unknown, fallback: PolicyGradientConfig): PolicyGradientSnapshot {
  const source = record(value)
  const history = array(valueAt(source, 'history', 'trajectory'))
    .map((item, index) => normalizeStep(item, index + 1))
  const rawLast = valueAt(source, 'lastStep', 'last_step')
  return {
    mode: canonicalPolicyGradientMode(valueAt(source, 'mode')) ?? fallback.mode,
    alpha: finite(valueAt(source, 'alpha'), fallback.alpha),
    discount: finite(valueAt(source, 'discount'), fallback.discount),
    noiseStd: finite(valueAt(source, 'noiseStd', 'noise_std'), fallback.noiseStd),
    maxEpisodes: integer(valueAt(source, 'maxEpisodes', 'max_episodes'), fallback.maxEpisodes),
    seedHex: String(valueAt(source, 'seedHex', 'seed_hex') ?? fallback.seedHex),
    episodeCount: integer(valueAt(source, 'episodeCount', 'episode_count'), history.length),
    logits: array(valueAt(source, 'logits', 'theta')).map((row) => array(row).map((item) => finite(item))),
    probabilities: array(valueAt(source, 'probabilities', 'policy')).map((row) => array(row).map((item) => finite(item))),
    baselineValues: array(valueAt(source, 'baselineValues', 'baseline_values')).map((item) => finite(item)),
    baselineCounts: array(valueAt(source, 'baselineCounts', 'baseline_counts')).map((item) => integer(item)),
    objective: finite(valueAt(source, 'objective')),
    entropy: finite(valueAt(source, 'entropy')),
    gradientNorm: finite(valueAt(source, 'gradientNorm', 'gradient_norm')),
    returnMean: finite(valueAt(source, 'returnMean', 'return_mean')),
    returnVariance: finite(valueAt(source, 'returnVariance', 'return_variance')),
    advantageVariance: finite(valueAt(source, 'advantageVariance', 'advantage_variance')),
    converged: Boolean(valueAt(source, 'converged')),
    truncated: Boolean(valueAt(source, 'truncated')),
    exhausted: Boolean(valueAt(source, 'exhausted')),
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
  const candidate = moduleRecord.PolicyGradientEvaluator
  if (typeof candidate !== 'function') throw new Error('PolicyGradientEvaluator export is unavailable')
  return candidate as new (...args: unknown[]) => Evaluator
}

function create(configValue: PolicyGradientConfig): Evaluator {
  const mode = canonicalPolicyGradientMode(configValue.mode) ?? configValue.mode
  const Class = constructor()
  return new Class(
    mode,
    configValue.alpha,
    configValue.discount,
    configValue.noiseStd,
    configValue.maxEpisodes,
    configValue.seedHex,
  )
}

function isCurrent(request: PolicyGradientWorkerRequest): boolean {
  return request.runId === activeRunId && request.sequence >= sequence
}

async function handle(request: PolicyGradientWorkerRequest): Promise<void> {
  if (request.v !== POLICY_GRADIENT_PROTOCOL_VERSION) return
  if (request.kind === 'start') {
    const validation = policyGradientConfigValidationError(request.config)
    if (validation) {
      post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'error', runId: request.runId, sequence: request.sequence, ...validation })
      return
    }
    activeRunId = request.runId
    sequence = request.sequence
    const nextConfig: PolicyGradientConfig = { ...request.config, mode: canonicalPolicyGradientMode(request.config.mode)! }
    config = nextConfig
    await ensureEngine()
    evaluator?.free?.()
    evaluator = create(nextConfig)
    const snapshot = normalizeSnapshot(evaluator.snapshot?.(), nextConfig)
    post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'ready', runId: activeRunId, sequence, snapshot })
    return
  }
  if (!isCurrent(request) || !evaluator || !config) return
  const activeConfig = config
  sequence = request.sequence
  try {
    if (request.kind === 'step') {
      const raw = evaluator.step?.() ?? evaluator.iteration?.()
      const outcome = record(raw)
      const snapshot = normalizeSnapshot(valueAt(outcome, 'snapshot'), activeConfig)
      const step = normalizeStep(valueAt(outcome, 'step', 'iteration'), snapshot.episodeCount)
      post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'step', runId: activeRunId, sequence, outcome: { snapshot, step } })
    } else if (request.kind === 'advance') {
      const count = Math.max(1, Math.min(2_000, Math.trunc(request.episodes)))
      const raw = evaluator.advance?.(count)
      const outcome = record(raw)
      const snapshot = normalizeSnapshot(valueAt(outcome, 'snapshot'), activeConfig)
      const steps = array(valueAt(outcome, 'steps', 'iterations')).map((item, index) => normalizeStep(item, snapshot.episodeCount - (array(valueAt(outcome, 'steps', 'iterations')).length - index - 1)))
      post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'advance', runId: activeRunId, sequence, outcome: { snapshot, steps } })
    } else if (request.kind === 'run') {
      const raw = evaluator.runToCompletion?.() ?? evaluator.run_to_completion?.()
      const outcome = record(raw)
      const snapshot = normalizeSnapshot(valueAt(outcome, 'snapshot'), activeConfig)
      const steps = array(valueAt(outcome, 'steps', 'iterations')).map((item, index) => normalizeStep(item, index + 1))
      post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'advance', runId: activeRunId, sequence, outcome: { snapshot, steps } })
    } else if (request.kind === 'reset') {
      const raw = evaluator.reset?.(request.seedHex ?? null)
      const snapshot = normalizeSnapshot(raw, activeConfig)
      post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'reset', runId: activeRunId, sequence, snapshot })
    }
  } catch (error) {
    const normalized = normalizeError(error)
    post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'error', runId: activeRunId, sequence, ...normalized })
  }
}

scope.addEventListener('message', (event: MessageEvent<PolicyGradientWorkerRequest>) => {
  void handle(event.data).catch((error) => {
    const normalized = normalizeError(error)
    post({ v: POLICY_GRADIENT_PROTOCOL_VERSION, kind: 'error', runId: activeRunId, sequence, ...normalized })
  })
})
