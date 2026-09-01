//! Language-neutral reinforcement-learning primitives used by the native tests and Wasm adapter.

pub mod gridworld;
pub mod optimality;
pub mod planning;
pub mod policy_evaluation;

pub use gridworld::{
    Action, ConfigError, GoalMode, GridWorldConfig, GridWorldSession, Policy, PolicyError, Rewards,
    SessionError, Snapshot, StepOutcome, TransitionOutcome,
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
