//! Language-neutral reinforcement-learning primitives used by the native tests and Wasm adapter.

pub mod gridworld;
pub mod optimality;
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
pub use policy_evaluation::{
    AdvanceOutcome, BellmanEvaluator, BellmanTerm, BellmanUpdate, EvaluationConfig,
    EvaluationConfigError, EvaluationError, EvaluationSnapshot, MAX_EVALUATION_SWEEPS,
    SweepOutcome, Transition,
};
