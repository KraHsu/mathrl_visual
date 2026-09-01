//! Model-based planning algorithms for Chapter 4.
//!
//! The three algorithms in this module intentionally share one transition
//! model and one Bellman backup implementation.  This makes the relationship
//! between value iteration (VI), policy iteration (PI), and truncated policy
//! iteration (TPI) observable rather than an accidental difference between
//! implementations.
//!
//! A `PlanningEvaluator` owns an independent state for each algorithm mode.
//! This is useful to the browser lab, where the three traces are shown side by
//! side.  The initial value vector is zero for every mode.  The initial policy
//! is the canonical (lowest action-code) greedy policy for that zero vector.
//! Consequently TPI with one policy-evaluation sweep has exactly the same
//! value sequence as VI (up to floating-point round-off).

use std::fmt;

use crate::{Action, ConfigError, GoalMode, GridWorldConfig, Rewards};

pub const PLANNING_STATE_COUNT: usize = 16;
pub const PLANNING_ACTION_COUNT: usize = 5;
pub const MAX_PLANNING_OUTER_ITERATIONS: u32 = 10_000;
/// Safety cap for one exact policy-evaluation phase.  Keep this aligned with
/// the browser protocol so a request accepted by the UI cannot trigger an
/// unexpectedly long Wasm task.
pub const MAX_POLICY_EVALUATION_SWEEPS: u32 = 10_000;
pub const MAX_TRUNCATED_POLICY_EVALUATION_SWEEPS: u32 = 10_000;
pub const MAX_PLANNING_REWARD_MAGNITUDE: f64 = 1_000_000.0;

const MAX_PLANNING_DISCOUNT: f64 = 0.99;
const NUMERIC_TIE_ULPS: f64 = 64.0;
const REFERENCE_MAX_SWEEPS: u32 = 200_000;
const SHARED_GRID_SEED: u64 = 0x5eed;
const TERMINAL_POLICY: u8 = u8::MAX;

/// Algorithm mode used by [`PlanningEvaluator`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PlanningMode {
    ValueIteration,
    PolicyIteration,
    TruncatedPolicyIteration,
}

impl PlanningMode {
    pub const ALL: [Self; 3] = [
        Self::ValueIteration,
        Self::PolicyIteration,
        Self::TruncatedPolicyIteration,
    ];

    pub const fn code(self) -> &'static str {
        match self {
            Self::ValueIteration => "value_iteration",
            Self::PolicyIteration => "policy_iteration",
            Self::TruncatedPolicyIteration => "truncated_policy_iteration",
        }
    }

    const fn index(self) -> usize {
        match self {
            Self::ValueIteration => 0,
            Self::PolicyIteration => 1,
            Self::TruncatedPolicyIteration => 2,
        }
    }
}

impl TryFrom<u8> for PlanningMode {
    type Error = PlanningModeError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::ValueIteration),
            1 => Ok(Self::PolicyIteration),
            2 => Ok(Self::TruncatedPolicyIteration),
            _ => Err(PlanningModeError::UnknownCode(value)),
        }
    }
}

impl TryFrom<&str> for PlanningMode {
    type Error = PlanningModeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "value_iteration" | "value-iteration" | "vi" => Ok(Self::ValueIteration),
            "policy_iteration" | "policy-iteration" | "pi" => Ok(Self::PolicyIteration),
            "truncated_policy_iteration"
            | "truncated-policy-iteration"
            | "tpi"
            | "modified_policy_iteration"
            | "modified-policy-iteration"
            | "mpi" => Ok(Self::TruncatedPolicyIteration),
            _ => Err(PlanningModeError::UnknownName(value.to_owned())),
        }
    }
}

impl fmt::Display for PlanningMode {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlanningModeError {
    UnknownCode(u8),
    UnknownName(String),
}

impl PlanningModeError {
    pub const fn code(&self) -> &'static str {
        "planning_unknown_mode"
    }
}

impl fmt::Display for PlanningModeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownCode(code) => write!(formatter, "unknown planning mode code {code}"),
            Self::UnknownName(name) => write!(formatter, "unknown planning mode {name}"),
        }
    }
}

impl std::error::Error for PlanningModeError {}

/// Configuration shared by all three planning algorithms.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlanningConfig {
    pub discount: f64,
    pub slip_probability: f64,
    pub tolerance: f64,
    pub max_outer_iterations: u32,
    /// Number of Bellman expectation sweeps in one TPI evaluation phase.
    /// A value of one makes TPI's value sequence equal VI's sequence.
    pub evaluation_sweeps: u32,
    /// Safety limit for one PI/TPI policy-evaluation phase.
    pub max_evaluation_sweeps: u32,
    pub rewards: Rewards,
}

impl Default for PlanningConfig {
    fn default() -> Self {
        Self {
            discount: 0.9,
            slip_probability: 0.0,
            tolerance: 1e-10,
            max_outer_iterations: 1_000,
            evaluation_sweeps: 4,
            max_evaluation_sweeps: 1_000,
            rewards: Rewards::default(),
        }
    }
}

impl PlanningConfig {
    pub fn validate(&self) -> Result<(), PlanningConfigError> {
        if !self.discount.is_finite() || !(0.0..=MAX_PLANNING_DISCOUNT).contains(&self.discount) {
            return Err(PlanningConfigError::Discount);
        }
        if !self.slip_probability.is_finite() || !(0.0..=1.0).contains(&self.slip_probability) {
            return Err(PlanningConfigError::SlipProbability);
        }
        if !self.tolerance.is_finite() || self.tolerance <= 0.0 || self.tolerance > 1.0 {
            return Err(PlanningConfigError::Tolerance);
        }
        if !(1..=MAX_PLANNING_OUTER_ITERATIONS).contains(&self.max_outer_iterations) {
            return Err(PlanningConfigError::MaxOuterIterations);
        }
        if !(1..=MAX_TRUNCATED_POLICY_EVALUATION_SWEEPS).contains(&self.evaluation_sweeps) {
            return Err(PlanningConfigError::EvaluationSweeps);
        }
        if !(1..=MAX_POLICY_EVALUATION_SWEEPS).contains(&self.max_evaluation_sweeps) {
            return Err(PlanningConfigError::MaxEvaluationSweeps);
        }
        if self.evaluation_sweeps > self.max_evaluation_sweeps {
            return Err(PlanningConfigError::EvaluationBudget);
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|reward| !reward.is_finite() || reward.abs() > MAX_PLANNING_REWARD_MAGNITUDE)
        {
            return Err(PlanningConfigError::Reward);
        }

        self.grid_world_config()
            .validate()
            .map_err(PlanningConfigError::World)
    }

    fn grid_world_config(&self) -> GridWorldConfig {
        GridWorldConfig {
            width: 4,
            height: 4,
            start: 0,
            goal: 15,
            goal_mode: GoalMode::Terminate,
            hazards: vec![6, 9],
            rewards: self.rewards,
            slip_probability: self.slip_probability,
            discount: self.discount,
            seed: SHARED_GRID_SEED,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlanningConfigError {
    Discount,
    SlipProbability,
    Tolerance,
    MaxOuterIterations,
    EvaluationSweeps,
    MaxEvaluationSweeps,
    EvaluationBudget,
    Reward,
    World(ConfigError),
}

impl PlanningConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Discount => "planning_discount_range",
            Self::SlipProbability => "planning_slip_range",
            Self::Tolerance => "planning_tolerance_range",
            Self::MaxOuterIterations => "planning_max_outer_iterations_range",
            Self::EvaluationSweeps => "planning_evaluation_sweeps_range",
            Self::MaxEvaluationSweeps => "planning_max_evaluation_sweeps_range",
            Self::EvaluationBudget => "planning_evaluation_budget",
            Self::Reward => "planning_reward_range",
            Self::World(error) => error.code(),
        }
    }
}

impl fmt::Display for PlanningConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discount => write!(
                formatter,
                "discount must be finite and between 0 and {MAX_PLANNING_DISCOUNT}"
            ),
            Self::SlipProbability => {
                write!(formatter, "slip_probability must be finite and in [0, 1]")
            }
            Self::Tolerance => write!(formatter, "tolerance must be finite and in (0, 1]"),
            Self::MaxOuterIterations => write!(
                formatter,
                "max_outer_iterations must be between 1 and {MAX_PLANNING_OUTER_ITERATIONS}"
            ),
            Self::EvaluationSweeps => write!(
                formatter,
                "evaluation_sweeps must be between 1 and {MAX_TRUNCATED_POLICY_EVALUATION_SWEEPS}"
            ),
            Self::MaxEvaluationSweeps => write!(
                formatter,
                "max_evaluation_sweeps must be between 1 and {MAX_POLICY_EVALUATION_SWEEPS}"
            ),
            Self::EvaluationBudget => {
                write!(
                    formatter,
                    "evaluation_sweeps cannot exceed max_evaluation_sweeps"
                )
            }
            Self::Reward => write!(
                formatter,
                "rewards must be finite with magnitude at most {MAX_PLANNING_REWARD_MAGNITUDE}"
            ),
            Self::World(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for PlanningConfigError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct PlanningCost {
    /// Number of state-value rows updated (one row per state per sweep).
    pub backups: u64,
    /// Number of counted `(state, action)` expectation slots. The fixed-size
    /// accounting includes the terminal state's no-op slots so algorithm
    /// columns remain comparable; it is a work ledger, not an instruction
    /// count for a particular loop implementation.
    pub action_evaluations: u64,
    pub policy_evaluation_sweeps: u64,
    pub policy_improvement_steps: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlanningPhaseKind {
    ValueBackup,
    PolicyEvaluation,
    PolicyImprovement,
}

impl PlanningPhaseKind {
    pub const fn code(self) -> &'static str {
        match self {
            Self::ValueBackup => "value_backup",
            Self::PolicyEvaluation => "policy_evaluation",
            Self::PolicyImprovement => "policy_improvement",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlanningPhase {
    pub kind: PlanningPhaseKind,
    pub outer_iteration: u32,
    pub sweeps: u32,
    /// Number of state coordinates (for a backup/evaluation phase) or policy
    /// choices (for an improvement phase) that changed during this phase.
    pub changed_states: u16,
    pub residual: f64,
    pub max_update: f64,
    pub policy_stable: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlanningSnapshot {
    pub mode: PlanningMode,
    pub values: [f64; PLANNING_STATE_COUNT],
    pub action_values: [[f64; PLANNING_ACTION_COUNT]; PLANNING_STATE_COUNT],
    /// All actions tied (within the numeric tie tolerance) for `T*V`.
    pub greedy_masks: [u8; PLANNING_STATE_COUNT],
    /// One-hot mask for the deterministic representative currently evaluated.
    pub policy_masks: [u8; PLANNING_STATE_COUNT],
    /// Representative action codes; `255` denotes the terminal state.
    pub policy: [u8; PLANNING_STATE_COUNT],
    pub outer_iteration: u32,
    /// Cumulative policy-evaluation sweeps for this mode.
    pub evaluation_sweeps: u32,
    /// Optimality residual `||T*V - V||∞`.
    pub residual: f64,
    /// Maximum absolute value change observed during the most recent outer
    /// step (including its evaluation and improvement phases).
    pub value_residual: f64,
    /// Current policy residual `||TπV - V||∞`.
    pub evaluation_residual: f64,
    pub policy_stable: bool,
    pub converged: bool,
    pub truncated: bool,
    pub evaluation_truncated: bool,
    pub cost: PlanningCost,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlanningReference {
    pub values: [f64; PLANNING_STATE_COUNT],
    pub action_values: [[f64; PLANNING_ACTION_COUNT]; PLANNING_STATE_COUNT],
    pub greedy_masks: [u8; PLANNING_STATE_COUNT],
    pub residual: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlanningUpdate {
    pub state: u16,
    /// Value before the outer-step backup/improvement calculation.
    pub old_value: f64,
    /// The greedy-backup candidate `T_* V` used during improvement. For PI
    /// and TPI this candidate is diagnostic: the snapshot keeps the evaluated
    /// policy value until the next evaluation phase.
    pub new_value: f64,
    /// `new_value - old_value`; for PI/TPI it is not necessarily an applied
    /// value-vector delta (see `new_value`).
    pub delta: f64,
    pub action_values: [f64; PLANNING_ACTION_COUNT],
    pub greedy_mask: u8,
    pub policy_before: u8,
    pub policy_after: u8,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlanningStepOutcome {
    pub snapshot: PlanningSnapshot,
    pub updates: Vec<PlanningUpdate>,
    /// Residual before this outer step followed by the residual after it.
    pub residual_history: Vec<f64>,
    pub phases: Vec<PlanningPhase>,
    pub max_update: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlanningAdvanceOutcome {
    pub snapshot: PlanningSnapshot,
    /// Residual before the call followed by one point after each outer step.
    pub residual_history: Vec<f64>,
    pub phases: Vec<PlanningPhase>,
}

#[derive(Debug, Clone)]
pub struct PlanningEvaluator {
    config: PlanningConfig,
    world: GridWorldConfig,
    states: [AlgorithmState; 3],
}

#[derive(Debug, Clone)]
struct AlgorithmState {
    values: [f64; PLANNING_STATE_COUNT],
    action_values: [[f64; PLANNING_ACTION_COUNT]; PLANNING_STATE_COUNT],
    greedy_masks: [u8; PLANNING_STATE_COUNT],
    policy_masks: [u8; PLANNING_STATE_COUNT],
    policy: [u8; PLANNING_STATE_COUNT],
    outer_iteration: u32,
    evaluation_sweeps: u32,
    residual: f64,
    value_residual: f64,
    evaluation_residual: f64,
    policy_stable: bool,
    converged: bool,
    truncated: bool,
    evaluation_truncated: bool,
    cost: PlanningCost,
}

#[derive(Debug, Clone, Copy)]
struct BellmanImage {
    values: [f64; PLANNING_STATE_COUNT],
    action_values: [[f64; PLANNING_ACTION_COUNT]; PLANNING_STATE_COUNT],
    greedy_masks: [u8; PLANNING_STATE_COUNT],
}

impl PlanningEvaluator {
    pub fn new(config: PlanningConfig) -> Result<Self, PlanningConfigError> {
        config.validate()?;
        let mut world = config.grid_world_config();
        world.hazards.sort_unstable();

        let empty_values = [0.0; PLANNING_STATE_COUNT];
        let image = bellman_image(&world, config.discount, &empty_values);
        let policy = canonical_policy(&image.greedy_masks, world.goal);
        let policy_masks = policy_masks(&policy, world.goal);
        let evaluation_residual = policy_residual(&world, config.discount, &empty_values, &policy);
        let initial_residual = residual_between(&image.values, &empty_values);
        // The initial policy is selected from the same zero-vector greedy
        // image that seeds the snapshot.  We can therefore certify a fixed
        // point immediately in degenerate configurations (for example zero
        // rewards with a loose tolerance), without pretending that a policy
        // comparison has already taken place.  `policy_stable` remains false
        // until the first explicit improvement phase compares two policies.
        let initial_policy_stable = false;
        let initial_converged =
            initial_residual <= config.tolerance && evaluation_residual <= config.tolerance;
        let make_state = || AlgorithmState {
            values: empty_values,
            action_values: image.action_values,
            greedy_masks: image.greedy_masks,
            policy_masks,
            policy,
            outer_iteration: 0,
            evaluation_sweeps: 0,
            residual: initial_residual,
            value_residual: 0.0,
            evaluation_residual,
            policy_stable: initial_policy_stable,
            converged: initial_converged,
            truncated: false,
            evaluation_truncated: false,
            cost: PlanningCost::default(),
        };

        Ok(Self {
            config,
            world,
            states: [make_state(), make_state(), make_state()],
        })
    }

    pub const fn config(&self) -> PlanningConfig {
        self.config
    }

    pub fn snapshot(&self, mode: PlanningMode) -> PlanningSnapshot {
        self.snapshot_from(mode, &self.states[mode.index()])
    }

    pub fn snapshots(&self) -> [PlanningSnapshot; 3] {
        PlanningMode::ALL.map(|mode| self.snapshot(mode))
    }

    pub fn reset(&mut self, mode: PlanningMode) -> PlanningSnapshot {
        let fresh = Self::new(self.config).expect("configuration was validated at construction");
        self.states[mode.index()] = fresh.states[mode.index()].clone();
        self.snapshot(mode)
    }

    pub fn reset_all(&mut self) -> [PlanningSnapshot; 3] {
        let fresh = Self::new(self.config).expect("configuration was validated at construction");
        self.states = fresh.states;
        self.snapshots()
    }

    pub fn transition_model(&self) -> Vec<PlanningTransition> {
        (0..PLANNING_STATE_COUNT)
            .flat_map(|state| {
                Action::ALL.into_iter().flat_map(move |requested_action| {
                    self.world
                        .transition_distribution_from_validated(state as u16, requested_action)
                        .into_iter()
                        .map(move |outcome| PlanningTransition {
                            state: state as u16,
                            requested_action: outcome.requested_action,
                            actual_action: outcome.actual_action,
                            next_state: outcome.next_state,
                            probability: outcome.probability,
                            reward: outcome.reward,
                            boundary_collision: outcome.boundary_collision,
                        })
                })
            })
            .collect()
    }

    pub fn reference_solution(&self) -> PlanningReference {
        let mut values = [0.0; PLANNING_STATE_COUNT];
        let mut image = bellman_image(&self.world, self.config.discount, &values);

        for _ in 0..REFERENCE_MAX_SWEEPS {
            let residual = residual_between(&image.values, &values);
            let scale = values.iter().copied().map(f64::abs).fold(1.0, f64::max);
            let floating_floor = NUMERIC_TIE_ULPS * f64::EPSILON * scale;
            if residual <= 1e-12_f64.max(floating_floor) || image.values == values {
                break;
            }
            values = image.values;
            image = bellman_image(&self.world, self.config.discount, &values);
        }

        PlanningReference {
            values,
            action_values: image.action_values,
            greedy_masks: image.greedy_masks,
            residual: residual_between(&image.values, &values),
        }
    }

    /// Perform one outer iteration of the selected algorithm.
    pub fn step(&mut self, mode: PlanningMode) -> PlanningStepOutcome {
        let index = mode.index();
        if self.states[index].converged || self.states[index].truncated {
            let snapshot = self.snapshot(mode);
            return PlanningStepOutcome {
                residual_history: vec![snapshot.residual],
                snapshot,
                updates: Vec::new(),
                phases: Vec::new(),
                max_update: 0.0,
            };
        }

        let before_residual = self.states[index].residual;
        let (updates, phases, max_update) = match mode {
            PlanningMode::ValueIteration => self.step_value_iteration(index),
            PlanningMode::PolicyIteration => self.step_policy_iteration(index, true),
            PlanningMode::TruncatedPolicyIteration => self.step_policy_iteration(index, false),
        };

        self.states[index].outer_iteration = self.states[index].outer_iteration.saturating_add(1);
        self.refresh_status(index, mode, max_update);

        PlanningStepOutcome {
            snapshot: self.snapshot(mode),
            updates,
            residual_history: vec![before_residual, self.states[index].residual],
            phases,
            max_update,
        }
    }

    pub fn advance(&mut self, mode: PlanningMode, outer_iterations: u32) -> PlanningAdvanceOutcome {
        let mut snapshot = self.snapshot(mode);
        let remaining = self
            .config
            .max_outer_iterations
            .saturating_sub(self.states[mode.index()].outer_iteration);
        let requested = outer_iterations.min(remaining);
        let mut residual_history = Vec::with_capacity(requested as usize + 1);
        residual_history.push(snapshot.residual);
        let mut phases = Vec::new();

        for _ in 0..requested {
            if snapshot.converged || snapshot.truncated {
                break;
            }
            let outcome = self.step(mode);
            phases.extend(outcome.phases);
            snapshot = outcome.snapshot;
            residual_history.push(snapshot.residual);
        }

        PlanningAdvanceOutcome {
            snapshot,
            residual_history,
            phases,
        }
    }

    pub fn run_to_convergence(&mut self, mode: PlanningMode) -> PlanningAdvanceOutcome {
        let remaining = self
            .config
            .max_outer_iterations
            .saturating_sub(self.states[mode.index()].outer_iteration);
        self.advance(mode, remaining)
    }

    fn step_value_iteration(
        &mut self,
        index: usize,
    ) -> (Vec<PlanningUpdate>, Vec<PlanningPhase>, f64) {
        let old_values = self.states[index].values;
        let old_policy = self.states[index].policy;
        let image = bellman_image(&self.world, self.config.discount, &old_values);
        let new_policy = canonical_policy(&image.greedy_masks, self.world.goal);
        let new_policy_masks = policy_masks(&new_policy, self.world.goal);
        let updates = planning_updates(&old_values, &image, &old_policy, &new_policy);
        let max_update = updates
            .iter()
            .map(|update| update.delta.abs())
            .fold(0.0, f64::max);
        let optimality_residual = residual_between(&image.values, &old_values);
        let policy_stable = old_policy == new_policy;
        let changed_value_states =
            updates.iter().filter(|update| update.delta != 0.0).count() as u16;
        let changed_policy_states = updates
            .iter()
            .filter(|update| update.policy_before != update.policy_after)
            .count() as u16;
        let state = &mut self.states[index];
        state.values = image.values;
        state.action_values = image.action_values;
        state.greedy_masks = image.greedy_masks;
        state.policy = new_policy;
        state.policy_masks = new_policy_masks;
        state.value_residual = max_update;
        state.evaluation_residual = policy_residual(
            &self.world,
            self.config.discount,
            &state.values,
            &state.policy,
        );
        state.policy_stable = policy_stable;
        state.cost.backups = state
            .cost
            .backups
            .saturating_add(PLANNING_STATE_COUNT as u64);
        state.cost.action_evaluations = state
            .cost
            .action_evaluations
            .saturating_add((PLANNING_STATE_COUNT * PLANNING_ACTION_COUNT) as u64);
        state.cost.policy_improvement_steps = state.cost.policy_improvement_steps.saturating_add(1);

        let phases = vec![
            PlanningPhase {
                kind: PlanningPhaseKind::ValueBackup,
                outer_iteration: state.outer_iteration.saturating_add(1),
                sweeps: 1,
                changed_states: changed_value_states,
                residual: optimality_residual,
                max_update,
                policy_stable,
            },
            PlanningPhase {
                kind: PlanningPhaseKind::PolicyImprovement,
                outer_iteration: state.outer_iteration.saturating_add(1),
                sweeps: 0,
                changed_states: changed_policy_states,
                residual: optimality_residual,
                max_update: 0.0,
                policy_stable,
            },
        ];
        (updates, phases, max_update)
    }

    fn step_policy_iteration(
        &mut self,
        index: usize,
        exact_evaluation: bool,
    ) -> (Vec<PlanningUpdate>, Vec<PlanningPhase>, f64) {
        let outer = self.states[index].outer_iteration.saturating_add(1);
        let mut phases = Vec::new();
        let mut total_eval_sweeps = 0_u32;
        let mut max_eval_update = 0.0_f64;
        let mut evaluation_changed = [false; PLANNING_STATE_COUNT];

        let eval_limit = if exact_evaluation {
            self.config.max_evaluation_sweeps
        } else {
            self.config.evaluation_sweeps
        };

        // Policy evaluation is a synchronous contraction.  PI runs to the
        // configured tolerance; TPI deliberately truncates after N sweeps.
        loop {
            if total_eval_sweeps >= eval_limit {
                break;
            }
            let old_values = self.states[index].values;
            let policy = self.states[index].policy;
            let next_values =
                policy_backup(&self.world, self.config.discount, &old_values, &policy);
            let update = residual_between(&next_values, &old_values);
            for state in 0..PLANNING_STATE_COUNT {
                if next_values[state] != old_values[state] {
                    evaluation_changed[state] = true;
                }
            }
            self.states[index].values = next_values;
            self.states[index].value_residual = update;
            self.states[index].evaluation_sweeps =
                self.states[index].evaluation_sweeps.saturating_add(1);
            self.states[index].cost.backups = self.states[index]
                .cost
                .backups
                .saturating_add(PLANNING_STATE_COUNT as u64);
            self.states[index].cost.policy_evaluation_sweeps = self.states[index]
                .cost
                .policy_evaluation_sweeps
                .saturating_add(1);
            self.states[index].cost.action_evaluations = self.states[index]
                .cost
                .action_evaluations
                .saturating_add(PLANNING_STATE_COUNT as u64);
            total_eval_sweeps += 1;
            max_eval_update = max_eval_update.max(update);

            let eval_residual =
                policy_residual(&self.world, self.config.discount, &next_values, &policy);
            self.states[index].evaluation_residual = eval_residual;

            if exact_evaluation && eval_residual <= self.config.tolerance {
                break;
            }
        }

        let eval_residual = self.states[index].evaluation_residual;
        let eval_truncated = exact_evaluation
            && eval_residual > self.config.tolerance
            && total_eval_sweeps >= eval_limit;
        self.states[index].evaluation_truncated = eval_truncated;
        phases.push(PlanningPhase {
            kind: PlanningPhaseKind::PolicyEvaluation,
            outer_iteration: outer,
            sweeps: total_eval_sweeps,
            changed_states: evaluation_changed
                .iter()
                .filter(|changed| **changed)
                .count() as u16,
            residual: eval_residual,
            max_update: max_eval_update,
            policy_stable: self.states[index].policy_stable,
        });

        let old_values = self.states[index].values;
        let old_policy = self.states[index].policy;
        let image = bellman_image(&self.world, self.config.discount, &old_values);
        let new_policy = canonical_policy(&image.greedy_masks, self.world.goal);
        let new_policy_masks = policy_masks(&new_policy, self.world.goal);
        let updates = planning_updates(&old_values, &image, &old_policy, &new_policy);
        let max_update = updates
            .iter()
            .map(|update| update.delta.abs())
            .fold(max_eval_update, f64::max);
        let policy_stable = old_policy == new_policy;
        let changed_policy_states = updates
            .iter()
            .filter(|update| update.policy_before != update.policy_after)
            .count() as u16;
        self.states[index].action_values = image.action_values;
        self.states[index].greedy_masks = image.greedy_masks;
        self.states[index].policy = new_policy;
        self.states[index].policy_masks = new_policy_masks;
        self.states[index].value_residual = max_update;
        self.states[index].policy_stable = policy_stable;
        self.states[index].cost.policy_improvement_steps = self.states[index]
            .cost
            .policy_improvement_steps
            .saturating_add(1);
        self.states[index].cost.backups = self.states[index]
            .cost
            .backups
            .saturating_add(PLANNING_STATE_COUNT as u64);
        self.states[index].cost.action_evaluations = self.states[index]
            .cost
            .action_evaluations
            .saturating_add((PLANNING_STATE_COUNT * PLANNING_ACTION_COUNT) as u64);
        phases.push(PlanningPhase {
            kind: PlanningPhaseKind::PolicyImprovement,
            outer_iteration: outer,
            sweeps: 0,
            changed_states: changed_policy_states,
            residual: residual_between(&image.values, &old_values),
            max_update,
            policy_stable,
        });

        (updates, phases, max_update)
    }

    fn refresh_status(&mut self, index: usize, mode: PlanningMode, max_update: f64) {
        let state = &mut self.states[index];
        let image = bellman_image(&self.world, self.config.discount, &state.values);
        state.action_values = image.action_values;
        state.greedy_masks = image.greedy_masks;
        state.residual = residual_between(&image.values, &state.values);
        state.evaluation_residual = policy_residual(
            &self.world,
            self.config.discount,
            &state.values,
            &state.policy,
        );
        // Keep the latest phase's update visible even when it was a policy
        // improvement after several evaluation sweeps.
        state.value_residual = max_update;
        state.converged = match mode {
            PlanningMode::ValueIteration => state.residual <= self.config.tolerance,
            PlanningMode::PolicyIteration | PlanningMode::TruncatedPolicyIteration => {
                state.policy_stable
                    && state.residual <= self.config.tolerance
                    && state.evaluation_residual <= self.config.tolerance
            }
        };
        state.truncated =
            !state.converged && state.outer_iteration >= self.config.max_outer_iterations;
    }

    fn snapshot_from(&self, mode: PlanningMode, state: &AlgorithmState) -> PlanningSnapshot {
        PlanningSnapshot {
            mode,
            values: state.values,
            action_values: state.action_values,
            greedy_masks: state.greedy_masks,
            policy_masks: state.policy_masks,
            policy: state.policy,
            outer_iteration: state.outer_iteration,
            evaluation_sweeps: state.evaluation_sweeps,
            residual: state.residual,
            value_residual: state.value_residual,
            evaluation_residual: state.evaluation_residual,
            policy_stable: state.policy_stable,
            converged: state.converged,
            truncated: state.truncated,
            evaluation_truncated: state.evaluation_truncated,
            cost: state.cost,
        }
    }
}

/// A transition row in the shared 4×4 model.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlanningTransition {
    pub state: u16,
    pub requested_action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub probability: f64,
    pub reward: f64,
    pub boundary_collision: bool,
}

fn bellman_image(
    world: &GridWorldConfig,
    discount: f64,
    values: &[f64; PLANNING_STATE_COUNT],
) -> BellmanImage {
    let mut next_values = [0.0; PLANNING_STATE_COUNT];
    let mut action_values = [[0.0; PLANNING_ACTION_COUNT]; PLANNING_STATE_COUNT];
    let mut greedy_masks = [0_u8; PLANNING_STATE_COUNT];

    for state in 0..PLANNING_STATE_COUNT {
        if state as u16 == world.goal {
            continue;
        }
        for action in Action::ALL {
            action_values[state][action.code() as usize] = world
                .transition_distribution_from_validated(state as u16, action)
                .into_iter()
                .map(|outcome| {
                    let next_value = if outcome.next_state == world.goal {
                        0.0
                    } else {
                        values[outcome.next_state as usize]
                    };
                    outcome.probability * (outcome.reward + discount * next_value)
                })
                .sum();
        }
        let best = action_values[state]
            .iter()
            .copied()
            .fold(f64::NEG_INFINITY, f64::max);
        next_values[state] = best;
        greedy_masks[state] = Action::ALL
            .into_iter()
            .filter(|action| numeric_tie(action_values[state][action.code() as usize], best))
            .fold(0_u8, |mask, action| mask | (1_u8 << action.code()));
    }

    BellmanImage {
        values: next_values,
        action_values,
        greedy_masks,
    }
}

fn policy_backup(
    world: &GridWorldConfig,
    discount: f64,
    values: &[f64; PLANNING_STATE_COUNT],
    policy: &[u8; PLANNING_STATE_COUNT],
) -> [f64; PLANNING_STATE_COUNT] {
    let mut next_values = [0.0; PLANNING_STATE_COUNT];
    for state in 0..PLANNING_STATE_COUNT {
        let action_code = policy[state];
        if state as u16 == world.goal || action_code >= PLANNING_ACTION_COUNT as u8 {
            continue;
        }
        let action = Action::try_from(action_code).expect("policy stores valid action codes");
        next_values[state] = world
            .transition_distribution_from_validated(state as u16, action)
            .into_iter()
            .map(|outcome| {
                let next_value = if outcome.next_state == world.goal {
                    0.0
                } else {
                    values[outcome.next_state as usize]
                };
                outcome.probability * (outcome.reward + discount * next_value)
            })
            .sum();
    }
    next_values
}

fn policy_residual(
    world: &GridWorldConfig,
    discount: f64,
    values: &[f64; PLANNING_STATE_COUNT],
    policy: &[u8; PLANNING_STATE_COUNT],
) -> f64 {
    residual_between(&policy_backup(world, discount, values, policy), values)
}

fn canonical_policy(
    greedy_masks: &[u8; PLANNING_STATE_COUNT],
    goal: u16,
) -> [u8; PLANNING_STATE_COUNT] {
    std::array::from_fn(|state| {
        if state as u16 == goal {
            TERMINAL_POLICY
        } else {
            canonical_action(greedy_masks[state])
        }
    })
}

fn canonical_action(mask: u8) -> u8 {
    Action::ALL
        .into_iter()
        .find(|action| mask & (1_u8 << action.code()) != 0)
        .map(Action::code)
        .unwrap_or(Action::Stay.code())
}

fn policy_masks(policy: &[u8; PLANNING_STATE_COUNT], goal: u16) -> [u8; PLANNING_STATE_COUNT] {
    std::array::from_fn(|state| {
        let action = policy[state];
        if state as u16 == goal || action >= PLANNING_ACTION_COUNT as u8 {
            0
        } else {
            1_u8 << action
        }
    })
}

fn planning_updates(
    old_values: &[f64; PLANNING_STATE_COUNT],
    image: &BellmanImage,
    old_policy: &[u8; PLANNING_STATE_COUNT],
    new_policy: &[u8; PLANNING_STATE_COUNT],
) -> Vec<PlanningUpdate> {
    (0..PLANNING_STATE_COUNT)
        .map(|state| PlanningUpdate {
            state: state as u16,
            old_value: old_values[state],
            new_value: image.values[state],
            delta: image.values[state] - old_values[state],
            action_values: image.action_values[state],
            greedy_mask: image.greedy_masks[state],
            policy_before: old_policy[state],
            policy_after: new_policy[state],
        })
        .collect()
}

fn numeric_tie(left: f64, right: f64) -> bool {
    if left == right {
        return true;
    }
    let scale = left.abs().max(right.abs()).max(1.0);
    (left - right).abs() <= NUMERIC_TIE_ULPS * f64::EPSILON * scale
}

fn residual_between(
    next: &[f64; PLANNING_STATE_COUNT],
    current: &[f64; PLANNING_STATE_COUNT],
) -> f64 {
    next.iter()
        .zip(current)
        .map(|(next, current)| (next - current).abs())
        .fold(0.0, f64::max)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> PlanningConfig {
        PlanningConfig {
            discount: 0.9,
            slip_probability: 0.0,
            tolerance: 1e-12,
            max_outer_iterations: 1_000,
            evaluation_sweeps: 1,
            max_evaluation_sweeps: 1_000,
            rewards: Rewards::default(),
        }
    }

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "expected {expected:.12}, received {actual:.12}"
        );
    }

    #[test]
    fn mode_names_round_trip_and_aliases_are_stable() {
        for mode in PlanningMode::ALL {
            assert_eq!(PlanningMode::try_from(mode.code()).expect("mode"), mode);
        }
        assert_eq!(
            PlanningMode::try_from("vi").expect("alias"),
            PlanningMode::ValueIteration
        );
        assert_eq!(
            PlanningMode::try_from("pi").expect("alias"),
            PlanningMode::PolicyIteration
        );
        assert_eq!(
            PlanningMode::try_from("mpi").expect("alias"),
            PlanningMode::TruncatedPolicyIteration
        );
        assert_eq!(
            PlanningMode::try_from("bad").expect_err("invalid").code(),
            "planning_unknown_mode"
        );
    }

    #[test]
    fn rejects_invalid_configuration_with_stable_codes() {
        let invalid = [
            (
                PlanningConfig {
                    discount: 1.0,
                    ..config()
                },
                "planning_discount_range",
            ),
            (
                PlanningConfig {
                    slip_probability: -0.1,
                    ..config()
                },
                "planning_slip_range",
            ),
            (
                PlanningConfig {
                    tolerance: 0.0,
                    ..config()
                },
                "planning_tolerance_range",
            ),
            (
                PlanningConfig {
                    max_outer_iterations: 0,
                    ..config()
                },
                "planning_max_outer_iterations_range",
            ),
            (
                PlanningConfig {
                    evaluation_sweeps: 0,
                    ..config()
                },
                "planning_evaluation_sweeps_range",
            ),
            (
                PlanningConfig {
                    max_evaluation_sweeps: 0,
                    ..config()
                },
                "planning_max_evaluation_sweeps_range",
            ),
            (
                PlanningConfig {
                    evaluation_sweeps: 4,
                    max_evaluation_sweeps: 2,
                    ..config()
                },
                "planning_evaluation_budget",
            ),
        ];
        for (candidate, code) in invalid {
            assert_eq!(
                PlanningEvaluator::new(candidate)
                    .expect_err("invalid")
                    .code(),
                code
            );
        }
    }

    #[test]
    fn model_has_the_shared_grid_rows_and_terminal_has_no_actions() {
        let evaluator = PlanningEvaluator::new(config()).expect("valid");
        let model = evaluator.transition_model();
        assert_eq!(model.len(), 75);
        assert!(model.iter().all(|row| row.state != 15));
        for state in 0..15 {
            for action in Action::ALL {
                let sum: f64 = model
                    .iter()
                    .filter(|row| row.state == state && row.requested_action == action)
                    .map(|row| row.probability)
                    .sum();
                assert_close(sum, 1.0, f64::EPSILON);
            }
        }
    }

    #[test]
    fn initial_policy_is_zero_vector_greedy_and_terminal_is_empty() {
        let evaluator = PlanningEvaluator::new(config()).expect("valid");
        for mode in PlanningMode::ALL {
            let snapshot = evaluator.snapshot(mode);
            assert_eq!(snapshot.values, [0.0; PLANNING_STATE_COUNT]);
            assert_eq!(snapshot.greedy_masks[0], 0b1_0110);
            assert_eq!(snapshot.policy[15], TERMINAL_POLICY);
            assert_eq!(snapshot.policy_masks[15], 0);
            assert_eq!(snapshot.greedy_masks[15], 0);
            assert_close(snapshot.residual, 1.0, f64::EPSILON);
        }
    }

    #[test]
    fn already_fixed_zero_reward_model_is_converged_at_initial_snapshot() {
        let candidate = PlanningConfig {
            tolerance: 1.0,
            rewards: Rewards {
                default: 0.0,
                boundary: 0.0,
                hazard: 0.0,
                goal: 0.0,
            },
            ..config()
        };
        let evaluator = PlanningEvaluator::new(candidate).expect("valid");
        for mode in PlanningMode::ALL {
            let snapshot = evaluator.snapshot(mode);
            assert!(snapshot.converged);
            assert!(!snapshot.policy_stable);
            assert_eq!(snapshot.outer_iteration, 0);
        }
    }

    #[test]
    fn value_iteration_matches_chapter_three_golden() {
        let mut evaluator = PlanningEvaluator::new(config()).expect("valid");
        let first = evaluator.step(PlanningMode::ValueIteration);
        assert_eq!(first.snapshot.outer_iteration, 1);
        assert_eq!(first.snapshot.values[11], 1.0);
        assert_eq!(first.snapshot.cost.backups, 16);
        assert_eq!(first.snapshot.cost.action_evaluations, 80);
        assert_close(first.snapshot.residual, 0.9, f64::EPSILON);
        assert_eq!(first.phases[0].changed_states, 15);
        assert_eq!(first.phases[1].changed_states, 0);

        let outcome = evaluator.run_to_convergence(PlanningMode::ValueIteration);
        assert!(outcome.snapshot.converged);
        assert_eq!(outcome.snapshot.outer_iteration, 6);
        let expected = [
            0.426_686, 0.518_54, 0.620_6, 0.734, 0.518_54, 0.426_686, 0.734, 0.86, 0.620_6, 0.734,
            0.86, 1.0, 0.734, 0.86, 1.0, 0.0,
        ];
        for (actual, expected) in outcome.snapshot.values.into_iter().zip(expected) {
            assert_close(actual, expected, 1e-6);
        }
        assert_eq!(outcome.snapshot.greedy_masks[0], (1_u8 << 1) | (1_u8 << 2));
    }

    #[test]
    fn truncated_one_sweep_is_value_iteration_step_for_step() {
        let mut vi = PlanningEvaluator::new(config()).expect("valid");
        let mut tpi = PlanningEvaluator::new(config()).expect("valid");
        for _ in 0..8 {
            let a = vi.step(PlanningMode::ValueIteration).snapshot;
            let b = tpi.step(PlanningMode::TruncatedPolicyIteration).snapshot;
            for (left, right) in a.values.into_iter().zip(b.values) {
                assert_close(left, right, 1e-14);
            }
            assert_eq!(a.greedy_masks, b.greedy_masks);
        }
    }

    #[test]
    fn policy_iteration_evaluates_and_improves_to_the_same_optimum() {
        let mut evaluator = PlanningEvaluator::new(config()).expect("valid");
        let outcome = evaluator.run_to_convergence(PlanningMode::PolicyIteration);
        assert!(outcome.snapshot.converged);
        assert!(outcome.snapshot.evaluation_sweeps > 0);
        assert!(outcome.snapshot.cost.policy_improvement_steps > 0);
        let reference = evaluator.reference_solution();
        for (actual, expected) in outcome.snapshot.values.into_iter().zip(reference.values) {
            assert_close(actual, expected, 1e-10);
        }
    }

    #[test]
    fn policy_improvement_is_componentwise_monotone_on_the_shared_grid() {
        let mut evaluator = PlanningEvaluator::new(config()).expect("valid");
        // The first evaluation starts from the pedagogical zero vector rather
        // than the exact value of the initial policy, so the textbook
        // monotonicity lemma applies from the first *improved-policy* value
        // onward.
        let mut previous = evaluator
            .step(PlanningMode::PolicyIteration)
            .snapshot
            .values;
        for _ in 0..8 {
            let snapshot = evaluator.step(PlanningMode::PolicyIteration).snapshot;
            assert!(
                snapshot
                    .values
                    .iter()
                    .zip(previous)
                    .all(|(next, before)| *next + 1e-12 >= before),
                "policy improvement decreased a state value"
            );
            previous = snapshot.values;
            if snapshot.converged {
                break;
            }
        }
    }

    #[test]
    fn truncated_depth_four_converges_and_exposes_phase_costs() {
        let mut candidate = config();
        candidate.evaluation_sweeps = 4;
        let mut evaluator = PlanningEvaluator::new(candidate).expect("valid");
        let outcome = evaluator.run_to_convergence(PlanningMode::TruncatedPolicyIteration);
        assert!(outcome.snapshot.converged);
        assert!(outcome.snapshot.cost.policy_evaluation_sweeps >= 4);
        assert!(
            outcome
                .phases
                .iter()
                .any(|phase| phase.kind == PlanningPhaseKind::PolicyEvaluation)
        );
    }

    #[test]
    fn windy_backup_averages_outcomes_before_action_max() {
        let mut candidate = config();
        candidate.slip_probability = 0.2;
        let mut evaluator = PlanningEvaluator::new(candidate).expect("valid");
        let outcome = evaluator.step(PlanningMode::ValueIteration);
        let state_eleven = outcome
            .updates
            .iter()
            .find(|update| update.state == 11)
            .expect("state update");
        assert_close(
            state_eleven.action_values[Action::Down.code() as usize],
            0.796,
            1e-15,
        );
        assert_close(state_eleven.new_value, 0.796, 1e-15);
    }

    #[test]
    fn windy_truncated_policy_iteration_reaches_the_windy_reference() {
        let mut candidate = config();
        candidate.slip_probability = 0.2;
        candidate.evaluation_sweeps = 2;
        let mut evaluator = PlanningEvaluator::new(candidate).expect("valid");
        let outcome = evaluator.run_to_convergence(PlanningMode::TruncatedPolicyIteration);
        let reference = evaluator.reference_solution();
        assert!(outcome.snapshot.converged);
        for (actual, expected) in outcome.snapshot.values.into_iter().zip(reference.values) {
            assert_close(actual, expected, 1e-10);
        }
        assert_eq!(outcome.snapshot.greedy_masks[15], 0);
    }

    #[test]
    fn modes_have_independent_state_and_reset_is_local() {
        let mut evaluator = PlanningEvaluator::new(config()).expect("valid");
        evaluator.step(PlanningMode::ValueIteration);
        evaluator.step(PlanningMode::PolicyIteration);
        assert_eq!(
            evaluator
                .snapshot(PlanningMode::ValueIteration)
                .outer_iteration,
            1
        );
        assert_eq!(
            evaluator
                .snapshot(PlanningMode::PolicyIteration)
                .outer_iteration,
            1
        );
        evaluator.reset(PlanningMode::ValueIteration);
        assert_eq!(
            evaluator
                .snapshot(PlanningMode::ValueIteration)
                .outer_iteration,
            0
        );
        assert_eq!(
            evaluator
                .snapshot(PlanningMode::PolicyIteration)
                .outer_iteration,
            1
        );
    }

    #[test]
    fn tiny_outer_limit_is_reported_as_truncated() {
        let mut candidate = config();
        candidate.max_outer_iterations = 1;
        candidate.tolerance = 1e-15;
        let mut evaluator = PlanningEvaluator::new(candidate).expect("valid");
        let outcome = evaluator.run_to_convergence(PlanningMode::ValueIteration);
        assert!(!outcome.snapshot.converged);
        assert!(outcome.snapshot.truncated);
        assert_eq!(outcome.snapshot.outer_iteration, 1);
    }

    #[test]
    fn policy_evaluation_cap_is_distinguished_from_convergence() {
        let mut candidate = config();
        candidate.max_evaluation_sweeps = 1;
        candidate.tolerance = 1e-12;
        let mut evaluator = PlanningEvaluator::new(candidate).expect("valid");
        let outcome = evaluator.step(PlanningMode::PolicyIteration);
        assert!(outcome.snapshot.evaluation_truncated);
        assert!(!outcome.snapshot.converged);
        let evaluation = outcome
            .phases
            .iter()
            .find(|phase| phase.kind == PlanningPhaseKind::PolicyEvaluation)
            .expect("evaluation phase");
        assert_eq!(evaluation.sweeps, 1);
        assert_eq!(evaluation.outer_iteration, 1);
        assert!(evaluation.residual > candidate.tolerance);
        assert!(!evaluation.policy_stable);
    }
}
