//! Language-neutral reinforcement-learning primitives used by the native tests and Wasm adapter.

pub mod gridworld;
pub mod policy_evaluation;

pub use gridworld::{
    Action, ConfigError, GoalMode, GridWorldConfig, GridWorldSession, Policy, PolicyError, Rewards,
    SessionError, Snapshot, StepOutcome, TransitionOutcome,
};
pub use policy_evaluation::{
    AdvanceOutcome, BellmanEvaluator, BellmanTerm, BellmanUpdate, EvaluationConfig,
    EvaluationConfigError, EvaluationError, EvaluationSnapshot, MAX_EVALUATION_SWEEPS,
    SweepOutcome, Transition,
};
