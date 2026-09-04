//! Language-neutral reinforcement-learning primitives used by the native tests and Wasm adapter.

pub mod actor_critic;
pub mod grid_policy_evaluation;
pub mod gridworld;
pub mod monte_carlo;
pub mod optimality;
pub mod planning;
pub mod policy_evaluation;
pub mod policy_gradient;
pub mod stochastic_approximation;
pub mod temporal_difference;
pub mod value_function;

pub use actor_critic::{
    ACTOR_CRITIC_ACTION_COUNT, ACTOR_CRITIC_NONTERMINAL_STATES, ACTOR_CRITIC_STATE_COUNT,
    ActorCriticAdvanceOutcome, ActorCriticConfig, ActorCriticConfigError, ActorCriticError,
    ActorCriticEvaluator, ActorCriticMode, ActorCriticModeError, ActorCriticOutcome,
    ActorCriticSnapshot, ActorCriticStep, MAX_ACTOR_CRITIC_ALPHA, MAX_ACTOR_CRITIC_EPISODES,
    MAX_ACTOR_CRITIC_EPISODES_PER_ADVANCE, MAX_ACTOR_CRITIC_HISTORY, MAX_ACTOR_CRITIC_MAGNITUDE,
    MAX_ACTOR_CRITIC_STEPS, transition as actor_critic_transition,
};
pub use grid_policy_evaluation::{
    GRID_POLICY_ACTION_COUNT, GRID_POLICY_STATE_COUNT, GridPolicyAdvanceOutcome,
    GridPolicyEvaluationConfig, GridPolicyEvaluationConfigError, GridPolicyEvaluationError,
    GridPolicyEvaluationEvaluator, GridPolicyEvaluationReference, GridPolicyEvaluationSnapshot,
    GridPolicyKind, GridPolicyKindError, GridPolicySweepOutcome, GridPolicyTerm,
    GridPolicyTransition, GridPolicyUpdate, MAX_GRID_POLICY_REWARD_MAGNITUDE,
    MAX_GRID_POLICY_SWEEPS,
};
pub use gridworld::{
    Action, ConfigError, GoalMode, GridWorldConfig, GridWorldSession, Policy, PolicyError, Rewards,
    SessionError, Snapshot, StepOutcome, TransitionOutcome,
};
pub use monte_carlo::{
    MAX_MONTE_CARLO_EPISODES, MAX_MONTE_CARLO_EPISODES_PER_ADVANCE, MAX_MONTE_CARLO_HISTORY,
    MAX_MONTE_CARLO_REWARD_MAGNITUDE, MAX_MONTE_CARLO_STEPS, MONTE_CARLO_ACTION_COUNT,
    MONTE_CARLO_STATE_COUNT, MeanEstimationConfig, MeanEstimationConfigError,
    MeanEstimationOutcome, MeanEstimationSnapshot, MeanEstimator, MonteCarloAdvanceOutcome,
    MonteCarloConfig, MonteCarloConfigError, MonteCarloEpisode, MonteCarloEpisodeOutcome,
    MonteCarloError, MonteCarloEvaluator, MonteCarloMode, MonteCarloModeError, MonteCarloObjective,
    MonteCarloObjectiveError, MonteCarloSnapshot, MonteCarloStep, MonteCarloVisitStrategy,
    MonteCarloVisitStrategyError, MonteCarloVisitUpdate,
};
pub use optimality::{
    MAX_OPTIMALITY_REWARD_MAGNITUDE, MAX_OPTIMALITY_SWEEPS, OPTIMALITY_ACTION_COUNT,
    OPTIMALITY_STATE_COUNT, OptimalityAdvanceOutcome, OptimalityConfig, OptimalityConfigError,
    OptimalityEvaluator, OptimalityReference, OptimalitySnapshot, OptimalitySweepOutcome,
    OptimalityTransition, OptimalityUpdate,
};
pub use planning::{
    MAX_PLANNING_OUTER_ITERATIONS, MAX_PLANNING_REWARD_MAGNITUDE, MAX_POLICY_EVALUATION_SWEEPS,
    MAX_TRUNCATED_POLICY_EVALUATION_SWEEPS, PLANNING_ACTION_COUNT, PLANNING_STATE_COUNT,
    PlanningAdvanceOutcome, PlanningConfig, PlanningConfigError, PlanningCost, PlanningEvaluator,
    PlanningMode, PlanningModeError, PlanningPhase, PlanningPhaseKind, PlanningReference,
    PlanningSnapshot, PlanningStepOutcome, PlanningTransition, PlanningUpdate,
};
pub use policy_evaluation::{
    AdvanceOutcome, BellmanEvaluator, BellmanTerm, BellmanUpdate, EvaluationConfig,
    EvaluationConfigError, EvaluationError, EvaluationSnapshot, MAX_EVALUATION_SWEEPS,
    SweepOutcome, Transition,
};
pub use policy_gradient::{
    MAX_POLICY_GRADIENT_ALPHA, MAX_POLICY_GRADIENT_EPISODES,
    MAX_POLICY_GRADIENT_EPISODES_PER_ADVANCE, MAX_POLICY_GRADIENT_HISTORY,
    MAX_POLICY_GRADIENT_MAGNITUDE, MAX_POLICY_GRADIENT_NOISE_STD, POLICY_GRADIENT_ACTION_COUNT,
    POLICY_GRADIENT_STATE_COUNT, PolicyGradientAdvanceOutcome, PolicyGradientConfig,
    PolicyGradientConfigError, PolicyGradientError, PolicyGradientEvaluator, PolicyGradientMode,
    PolicyGradientModeError, PolicyGradientOutcome, PolicyGradientSnapshot, PolicyGradientStep,
};
pub use stochastic_approximation::{
    MAX_STOCHASTIC_APPROXIMATION_ADVANCE, MAX_STOCHASTIC_APPROXIMATION_ALPHA,
    MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE, MAX_STOCHASTIC_APPROXIMATION_HISTORY,
    MAX_STOCHASTIC_APPROXIMATION_ITERATIONS, MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE,
    MAX_STOCHASTIC_APPROXIMATION_NOISE_STD, StochasticApproximationAdvanceOutcome,
    StochasticApproximationConfig, StochasticApproximationConfigError,
    StochasticApproximationError, StochasticApproximationEvaluator,
    StochasticApproximationIteration, StochasticApproximationMode,
    StochasticApproximationModeError, StochasticApproximationOutcome,
    StochasticApproximationRootFunction, StochasticApproximationRootFunctionError,
    StochasticApproximationSchedule, StochasticApproximationScheduleError,
    StochasticApproximationSnapshot,
};
pub use temporal_difference::{
    MAX_TEMPORAL_DIFFERENCE_ADVANCE, MAX_TEMPORAL_DIFFERENCE_ALPHA,
    MAX_TEMPORAL_DIFFERENCE_EPISODES, MAX_TEMPORAL_DIFFERENCE_EPSILON,
    MAX_TEMPORAL_DIFFERENCE_N_STEP, MAX_TEMPORAL_DIFFERENCE_REWARD_MAGNITUDE,
    MAX_TEMPORAL_DIFFERENCE_STEPS, MAX_TEMPORAL_DIFFERENCE_VALUE_MAGNITUDE,
    TEMPORAL_DIFFERENCE_ACTION_COUNT, TEMPORAL_DIFFERENCE_STATE_COUNT,
    TemporalDifferenceAdvanceOutcome, TemporalDifferenceConfig, TemporalDifferenceConfigError,
    TemporalDifferenceEpisode, TemporalDifferenceError, TemporalDifferenceEvaluator,
    TemporalDifferenceMode, TemporalDifferenceModeError, TemporalDifferenceOutcome,
    TemporalDifferenceSnapshot, TemporalDifferenceTransition, TemporalDifferenceUpdate,
};
pub use value_function::{
    FeatureMap, FeatureMapError, MAX_VALUE_FUNCTION_ADVANCE, MAX_VALUE_FUNCTION_ALPHA,
    MAX_VALUE_FUNCTION_BATCH_SIZE, MAX_VALUE_FUNCTION_EPISODES, MAX_VALUE_FUNCTION_EPSILON,
    MAX_VALUE_FUNCTION_MAGNITUDE, MAX_VALUE_FUNCTION_REPLAY_CAPACITY, MAX_VALUE_FUNCTION_STEPS,
    MAX_VALUE_FUNCTION_TARGET_INTERVAL, VALUE_FUNCTION_ACTION_COUNT, VALUE_FUNCTION_MAX_FEATURES,
    VALUE_FUNCTION_STATE_COUNT, ValueFunctionAdvanceOutcome, ValueFunctionConfig,
    ValueFunctionConfigError, ValueFunctionEpisode, ValueFunctionError, ValueFunctionEvaluator,
    ValueFunctionMode, ValueFunctionModeError, ValueFunctionOutcome, ValueFunctionSnapshot,
    ValueFunctionTransition, ValueFunctionUpdate,
};
