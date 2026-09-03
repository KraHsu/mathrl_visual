import { describe, expect, it } from 'vitest'

import {
  BELLMAN_PROTOCOL_VERSION,
  acceptsBellmanResponse,
  bellmanConfigValidationError,
  type BellmanWorkerResponse,
} from '../docs/.vitepress/bellmanProtocol'
import {
  PROTOCOL_VERSION,
  acceptsResponse,
  type WorkerResponse,
} from '../docs/.vitepress/protocol'
import {
  OPTIMALITY_PROTOCOL_VERSION,
  acceptsOptimalityResponse,
  optimalityConfigValidationError,
  type OptimalityWorkerResponse,
} from '../docs/.vitepress/optimalityProtocol'
import {
  PLANNING_PROTOCOL_VERSION,
  acceptsPlanningResponse,
  canonicalPlanningMode,
  planningConfigValidationError,
  type PlanningWorkerResponse,
} from '../docs/.vitepress/planningProtocol'
import {
  MONTE_CARLO_PROTOCOL_VERSION,
  acceptsMonteCarloResponse,
  canonicalMonteCarloMode,
  monteCarloConfigValidationError,
  type MonteCarloWorkerResponse,
} from '../docs/.vitepress/monteCarloProtocol'
import {
  STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
  acceptsStochasticApproximationResponse,
  canonicalStochasticApproximationMode,
  canonicalStochasticApproximationSchedule,
  stochasticApproximationConfigValidationError,
  type StochasticApproximationWorkerResponse,
} from '../docs/.vitepress/stochasticApproximationProtocol'
import {
  TEMPORAL_DIFFERENCE_PROTOCOL_VERSION,
  acceptsTemporalDifferenceResponse,
  canonicalTemporalDifferenceMode,
  temporalDifferenceConfigValidationError,
  type TemporalDifferenceWorkerResponse,
} from '../docs/.vitepress/temporalDifferenceProtocol'
import {
  VALUE_FUNCTION_PROTOCOL_VERSION,
  acceptsValueFunctionResponse,
  canonicalValueFunctionFeatureMap,
  canonicalValueFunctionMode,
  valueFunctionConfigValidationError,
  type ValueFunctionWorkerResponse,
} from '../docs/.vitepress/valueFunctionProtocol'
import {
  POLICY_GRADIENT_PROTOCOL_VERSION,
  acceptsPolicyGradientResponse,
  canonicalPolicyGradientMode,
  policyGradientConfigValidationError,
  type PolicyGradientWorkerResponse,
} from '../docs/.vitepress/policyGradientProtocol'
import {
  ACTOR_CRITIC_PROTOCOL_VERSION,
  acceptsActorCriticResponse,
  canonicalActorCriticMode,
  actorCriticConfigValidationError,
  type ActorCriticWorkerResponse,
} from '../docs/.vitepress/actorCriticProtocol'

function response(runId: string, sequence: number): WorkerResponse {
  return {
    v: PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function bellmanResponse(runId: string, sequence: number): BellmanWorkerResponse {
  return {
    v: BELLMAN_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function optimalityResponse(runId: string, sequence: number): OptimalityWorkerResponse {
  return {
    v: OPTIMALITY_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function planningResponse(runId: string, sequence: number): PlanningWorkerResponse {
  return {
    v: PLANNING_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function monteCarloResponse(runId: string, sequence: number): MonteCarloWorkerResponse {
  return {
    v: MONTE_CARLO_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function stochasticApproximationResponse(
  runId: string,
  sequence: number,
): StochasticApproximationWorkerResponse {
  return {
    v: STOCHASTIC_APPROXIMATION_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function temporalDifferenceResponse(runId: string, sequence: number): TemporalDifferenceWorkerResponse {
  return {
    v: TEMPORAL_DIFFERENCE_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function valueFunctionResponse(runId: string, sequence: number): ValueFunctionWorkerResponse {
  return {
    v: VALUE_FUNCTION_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
    recoverable: true,
  }
}

function policyGradientResponse(runId: string, sequence: number): PolicyGradientWorkerResponse {
  return {
    v: POLICY_GRADIENT_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
  }
}

function actorCriticResponse(runId: string, sequence: number): ActorCriticWorkerResponse {
  return {
    v: ACTOR_CRITIC_PROTOCOL_VERSION,
    runId,
    sequence,
    kind: 'error',
    code: 'test',
    message: 'test',
  }
}

describe('acceptsResponse', () => {
  it('accepts only newer messages for the current run', () => {
    expect(acceptsResponse(response('active', 4), 'active', 3)).toBe(true)
    expect(acceptsResponse(response('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsResponse(response('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the same stale-message guard to Bellman runs', () => {
    expect(acceptsBellmanResponse(bellmanResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsBellmanResponse(bellmanResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsBellmanResponse(bellmanResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the stale-message guard to optimality runs', () => {
    expect(acceptsOptimalityResponse(optimalityResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsOptimalityResponse(optimalityResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsOptimalityResponse(optimalityResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the stale-message guard to planning comparisons', () => {
    expect(acceptsPlanningResponse(planningResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsPlanningResponse(planningResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsPlanningResponse(planningResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the stale-message guard to Monte Carlo episode runs', () => {
    expect(acceptsMonteCarloResponse(monteCarloResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsMonteCarloResponse(monteCarloResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsMonteCarloResponse(monteCarloResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the stale-message guard to stochastic-approximation updates', () => {
    expect(
      acceptsStochasticApproximationResponse(
        stochasticApproximationResponse('active', 4),
        'active',
        3,
      ),
    ).toBe(true)
    expect(
      acceptsStochasticApproximationResponse(
        stochasticApproximationResponse('stale', 5),
        'active',
        3,
      ),
    ).toBe(false)
    expect(
      acceptsStochasticApproximationResponse(
        stochasticApproximationResponse('active', 3),
        'active',
        3,
      ),
    ).toBe(false)
  })

  it('applies the stale-message guard to temporal-difference updates', () => {
    expect(acceptsTemporalDifferenceResponse(temporalDifferenceResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsTemporalDifferenceResponse(temporalDifferenceResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsTemporalDifferenceResponse(temporalDifferenceResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('applies the stale-message guard to value-function updates', () => {
    expect(acceptsValueFunctionResponse(valueFunctionResponse('active', 4), 'active', 3)).toBe(true)
    expect(acceptsValueFunctionResponse(valueFunctionResponse('stale', 5), 'active', 3)).toBe(false)
    expect(acceptsValueFunctionResponse(valueFunctionResponse('active', 3), 'active', 3)).toBe(false)
  })

  it('validates the lightweight policy-gradient response envelope', () => {
    expect(acceptsPolicyGradientResponse(policyGradientResponse('active', 4))).toBe(true)
    expect(
      acceptsPolicyGradientResponse({ ...policyGradientResponse('active', 4), v: 2 }),
    ).toBe(false)
    expect(
      acceptsPolicyGradientResponse({ ...policyGradientResponse('active', 4), sequence: '4' }),
    ).toBe(false)
    expect(
      acceptsPolicyGradientResponse({ ...policyGradientResponse('active', 4), sequence: Number.NaN }),
    ).toBe(false)
    expect(
      acceptsPolicyGradientResponse({ ...policyGradientResponse('active', 4), kind: 'unknown' }),
    ).toBe(false)
  })

  it('validates the lightweight actor-critic response envelope', () => {
    expect(acceptsActorCriticResponse(actorCriticResponse('active', 4))).toBe(true)
    expect(
      acceptsActorCriticResponse({ ...actorCriticResponse('active', 4), v: 2 }),
    ).toBe(false)
    expect(
      acceptsActorCriticResponse({ ...actorCriticResponse('active', 4), runId: 7 }),
    ).toBe(false)
    expect(
      acceptsActorCriticResponse({ ...actorCriticResponse('active', 4), sequence: Number.POSITIVE_INFINITY }),
    ).toBe(false)
    expect(
      acceptsActorCriticResponse({ ...actorCriticResponse('active', 4), kind: 'unknown' }),
    ).toBe(false)
  })

  it('rejects Bellman values that the Wasm ABI would otherwise coerce', () => {
    expect(
      bellmanConfigValidationError({ discount: '', tolerance: 0.001, maxSweeps: 200 })?.code,
    ).toBe('evaluation_discount_range')
    expect(
      bellmanConfigValidationError({ discount: 0.9, tolerance: 0, maxSweeps: 200 })?.code,
    ).toBe('evaluation_tolerance_range')
    expect(
      bellmanConfigValidationError({ discount: 0.9, tolerance: 0.001, maxSweeps: 1.5 })?.code,
    ).toBe('evaluation_max_sweeps_range')
    expect(
      bellmanConfigValidationError({ discount: 0.9, tolerance: 0.001, maxSweeps: 200 }),
    ).toBeUndefined()
  })

  it('rejects invalid optimality configuration before Wasm coercion', () => {
    const valid = {
      discount: 0.9,
      slipProbability: 0,
      tolerance: 1e-12,
      maxSweeps: 1000,
      rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
    }
    expect(optimalityConfigValidationError({ ...valid, discount: 1 })?.code).toBe(
      'optimality_discount_range',
    )
    expect(optimalityConfigValidationError({ ...valid, slipProbability: -0.1 })?.code).toBe(
      'optimality_slip_range',
    )
    expect(optimalityConfigValidationError({ ...valid, maxSweeps: 2.5 })?.code).toBe(
      'optimality_max_sweeps_range',
    )
    expect(
      optimalityConfigValidationError({
        ...valid,
        rewards: { ...valid.rewards, hazard: Number.POSITIVE_INFINITY },
      })?.code,
    ).toBe('optimality_reward_range')
    expect(optimalityConfigValidationError(valid)).toBeUndefined()
  })

  it('rejects planning configuration before Wasm coercion', () => {
    const valid = {
      discount: 0.9,
      slipProbability: 0,
      tolerance: 1e-10,
      maxOuterIterations: 100,
      evaluationSweeps: 4,
      maxEvaluationSweeps: 1000,
      rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
    }
    expect(planningConfigValidationError({ ...valid, discount: 1 })?.code).toBe(
      'planning_discount_range',
    )
    expect(planningConfigValidationError({ ...valid, maxOuterIterations: 1.5 })?.code).toBe(
      'planning_max_outer_iterations_range',
    )
    expect(planningConfigValidationError({ ...valid, evaluationSweeps: 2000 })?.code).toBe(
      'planning_evaluation_budget',
    )
    expect(planningConfigValidationError(valid)).toBeUndefined()
  })

  it('canonicalizes the public and legacy planning mode names', () => {
    expect(canonicalPlanningMode('valueIteration')).toBe('value_iteration')
    expect(canonicalPlanningMode('modified-policy-iteration')).toBe(
      'truncated_policy_iteration',
    )
    expect(canonicalPlanningMode('unknown')).toBeUndefined()
  })

  it('validates and canonicalizes Monte Carlo configuration', () => {
    const valid = {
      discount: 0.9,
      slipProbability: 0,
      epsilon: 0.2,
      episodesPerStep: 1,
      maxEpisodes: 100,
      maxSteps: 64,
      seedHex: '7e9',
      mode: 'mc_basic',
      visitStrategy: 'initial',
      objective: 'control',
      exploringStarts: false,
      rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
    }
    expect(monteCarloConfigValidationError(valid)).toBeUndefined()
    expect(monteCarloConfigValidationError({ ...valid, epsilon: 1.1 })?.code).toBe(
      'monte_carlo_epsilon_range',
    )
    expect(monteCarloConfigValidationError({ ...valid, maxSteps: 1.5 })?.code).toBe(
      'monte_carlo_max_steps_range',
    )
    expect(canonicalMonteCarloMode('epsilon-greedy')).toBe('epsilon_greedy')
  })

  it('validates and canonicalizes stochastic-approximation configuration', () => {
    const valid = {
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
    expect(stochasticApproximationConfigValidationError(valid)).toBeUndefined()
    expect(
      stochasticApproximationConfigValidationError({ ...valid, alpha: 0 })?.code,
    ).toBe('stochastic_approximation_alpha_range')
    expect(
      stochasticApproximationConfigValidationError({ ...valid, batchSize: 1.5 })?.code,
    ).toBe('stochastic_approximation_batch_size_range')
    expect(canonicalStochasticApproximationMode('mbgd')).toBe('mini_batch')
    expect(canonicalStochasticApproximationSchedule('1/k')).toBe('harmonic')
  })

  it('validates and canonicalizes temporal-difference configuration', () => {
    const valid = {
      mode: 'td_zero',
      discount: 0.9,
      slipProbability: 0,
      epsilon: 0.1,
      alpha: 0.5,
      nStep: 1,
      maxEpisodes: 100,
      maxSteps: 64,
      seedHex: '5eed',
      rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
    }
    expect(temporalDifferenceConfigValidationError(valid)).toBeUndefined()
    expect(temporalDifferenceConfigValidationError({ ...valid, alpha: 0 })?.code).toBe(
      'temporal_difference_alpha_range',
    )
    expect(temporalDifferenceConfigValidationError({ ...valid, nStep: 0 })?.code).toBe(
      'temporal_difference_n_step_range',
    )
    expect(canonicalTemporalDifferenceMode('q-learning')).toBe('q_learning')
  })

  it('validates and canonicalizes value-function configuration', () => {
    const valid = {
      mode: 'td_linear',
      featureMap: 'coordinates',
      discount: 0.9,
      slipProbability: 0,
      epsilon: 0.1,
      alpha: 0.1,
      replayCapacity: 128,
      batchSize: 16,
      targetUpdateInterval: 10,
      maxEpisodes: 100,
      maxSteps: 64,
      seedHex: '5eed',
      rewards: { default: -0.04, boundary: -1, hazard: -1, goal: 1 },
    }
    expect(valueFunctionConfigValidationError(valid)).toBeUndefined()
    expect(valueFunctionConfigValidationError({ ...valid, batchSize: 256 })?.code).toBe(
      'value_function_batch_larger_than_replay',
    )
    expect(canonicalValueFunctionMode('dqn')).toBe('deep_q')
    expect(canonicalValueFunctionFeatureMap('one-hot')).toBe('one_hot')
  })

  it('validates and canonicalizes policy-gradient configuration', () => {
    const valid = {
      mode: 'reinforce',
      alpha: 0.1,
      discount: 0.9,
      noiseStd: 0.1,
      maxEpisodes: 100,
      seedHex: '5eed',
    }
    expect(policyGradientConfigValidationError(valid)).toBeUndefined()
    expect(policyGradientConfigValidationError({ ...valid, alpha: 0 })?.code).toBe(
      'policy_gradient_alpha_range',
    )
    expect(canonicalPolicyGradientMode('state-baseline')).toBe('baseline')
  })

  it('validates and canonicalizes actor-critic configuration', () => {
    const valid = {
      mode: 'a2c',
      actorAlpha: 0.1,
      criticAlpha: 0.2,
      discount: 0.9,
      epsilon: 0.1,
      maxEpisodes: 100,
      maxSteps: 10,
      seedHex: '5eed',
    }
    expect(actorCriticConfigValidationError(valid)).toBeUndefined()
    expect(actorCriticConfigValidationError({ ...valid, criticAlpha: 0 })?.code).toBe(
      'actor_critic_critic_alpha_range',
    )
    expect(canonicalActorCriticMode('dpg')).toBe('deterministic')
  })
})
