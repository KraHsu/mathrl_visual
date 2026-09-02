//! Language-neutral reinforcement-learning primitives used by the native tests and Wasm adapter.

pub mod gridworld;
pub mod monte_carlo;
pub mod optimality;
pub mod planning;
pub mod policy_evaluation;
pub mod stochastic_approximation;

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
