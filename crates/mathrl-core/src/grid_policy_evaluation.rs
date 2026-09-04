//! Fixed-policy Bellman expectation evaluation on the shared 4×4 Grid World.
//!
//! Chapter 2 originally shipped with a deliberately tiny four-state Markov
//! reward process.  This module is the full chapter-scale evaluator: it uses
//! exactly the same 4×4 geometry, rewards, hazards, goal convention, and wind
//! (slip) model as the Chapter 1 session and the Chapter 3/4 planning engines.
//! The policy is supplied by a named, deterministic teaching preset and is
//! never improved by this evaluator.

use std::fmt;

use crate::{Action, ConfigError, GoalMode, GridWorldConfig, Rewards};

pub const GRID_POLICY_STATE_COUNT: usize = 16;
pub const GRID_POLICY_ACTION_COUNT: usize = 5;
pub const MAX_GRID_POLICY_SWEEPS: u32 = 10_000;
pub const MAX_GRID_POLICY_REWARD_MAGNITUDE: f64 = 1_000_000.0;

const MAX_GRID_POLICY_DISCOUNT: f64 = 0.99;
const SHARED_GRID_SEED: u64 = 0x5eed;
const GOAL_STATE: u16 = 15;
const HAZARDS: [u16; 2] = [6, 9];
const NUMERIC_PIVOT_FLOOR: f64 = 1e-14;

/// A fixed policy used by the Chapter 2 experiment.
///
/// `Uniform` assigns probability 1/5 to every available action.  It is the
/// default because every row is easy to audit by hand.  `GoalSeeking` is a
/// second fixed (but still non-learning) policy whose probability mass favors
/// actions that reduce Manhattan distance to the goal.  Neither mode performs
/// policy improvement or takes a maximum over actions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GridPolicyKind {
    Uniform,
    GoalSeeking,
}

impl GridPolicyKind {
    pub const ALL: [Self; 2] = [Self::Uniform, Self::GoalSeeking];

    pub const fn code(self) -> &'static str {
        match self {
            Self::Uniform => "uniform",
            Self::GoalSeeking => "goal_seeking",
        }
    }

    pub const fn as_str(self) -> &'static str {
        self.code()
    }
}

impl TryFrom<&str> for GridPolicyKind {
    type Error = GridPolicyKindError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "uniform" | "equal" => Ok(Self::Uniform),
            "goal_seeking" | "goal-seeking" | "goal" => Ok(Self::GoalSeeking),
            other => Err(GridPolicyKindError::UnknownName(other.to_owned())),
        }
    }
}

impl TryFrom<u8> for GridPolicyKind {
    type Error = GridPolicyKindError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Uniform),
            1 => Ok(Self::GoalSeeking),
            other => Err(GridPolicyKindError::UnknownCode(other)),
        }
    }
}

impl fmt::Display for GridPolicyKind {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GridPolicyKindError {
    UnknownCode(u8),
    UnknownName(String),
}

impl GridPolicyKindError {
    pub const fn code(&self) -> &'static str {
        "grid_policy_unknown_kind"
    }
}

impl fmt::Display for GridPolicyKindError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownCode(code) => write!(formatter, "unknown fixed-policy code {code}"),
            Self::UnknownName(name) => write!(formatter, "unknown fixed-policy kind {name}"),
        }
    }
}

impl std::error::Error for GridPolicyKindError {}

/// Configuration for the shared 4×4 fixed-policy evaluator.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GridPolicyEvaluationConfig {
    pub policy: GridPolicyKind,
    pub discount: f64,
    pub slip_probability: f64,
    pub tolerance: f64,
    pub max_sweeps: u32,
    /// Seed is carried as shared experiment metadata.  The model-based
    /// evaluator does not sample, so changing it does not change backups.
    pub seed: u64,
    pub rewards: Rewards,
}

impl Default for GridPolicyEvaluationConfig {
    fn default() -> Self {
        Self {
            policy: GridPolicyKind::Uniform,
            discount: 0.9,
            slip_probability: 0.0,
            tolerance: 1e-10,
            max_sweeps: 1_000,
            seed: SHARED_GRID_SEED,
            rewards: Rewards::default(),
        }
    }
}

impl GridPolicyEvaluationConfig {
    pub fn validate(&self) -> Result<(), GridPolicyEvaluationConfigError> {
        if !self.discount.is_finite() || !(0.0..=MAX_GRID_POLICY_DISCOUNT).contains(&self.discount)
        {
            return Err(GridPolicyEvaluationConfigError::Discount);
        }
        if !self.slip_probability.is_finite() || !(0.0..=1.0).contains(&self.slip_probability) {
            return Err(GridPolicyEvaluationConfigError::SlipProbability);
        }
        if !self.tolerance.is_finite() || self.tolerance <= 0.0 || self.tolerance > 1.0 {
            return Err(GridPolicyEvaluationConfigError::Tolerance);
        }
        if !(1..=MAX_GRID_POLICY_SWEEPS).contains(&self.max_sweeps) {
            return Err(GridPolicyEvaluationConfigError::MaxSweeps);
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|reward| !reward.is_finite() || reward.abs() > MAX_GRID_POLICY_REWARD_MAGNITUDE)
        {
            return Err(GridPolicyEvaluationConfigError::Reward);
        }
        self.world()
            .validate()
            .map_err(GridPolicyEvaluationConfigError::World)
    }

    pub fn world(&self) -> GridWorldConfig {
        GridWorldConfig {
            width: 4,
            height: 4,
            start: 0,
            goal: GOAL_STATE,
            goal_mode: GoalMode::Terminate,
            hazards: HAZARDS.to_vec(),
            rewards: self.rewards,
            slip_probability: self.slip_probability,
            discount: self.discount,
            seed: self.seed,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GridPolicyEvaluationConfigError {
    Discount,
    SlipProbability,
    Tolerance,
    MaxSweeps,
    Reward,
    World(ConfigError),
}

impl GridPolicyEvaluationConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Discount => "grid_policy_discount_range",
            Self::SlipProbability => "grid_policy_slip_range",
            Self::Tolerance => "grid_policy_tolerance_range",
            Self::MaxSweeps => "grid_policy_max_sweeps_range",
            Self::Reward => "grid_policy_reward_range",
            Self::World(error) => error.code(),
        }
    }
}

impl fmt::Display for GridPolicyEvaluationConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discount => write!(
                formatter,
                "discount must be finite and between 0 and {MAX_GRID_POLICY_DISCOUNT}"
            ),
            Self::SlipProbability => {
                write!(formatter, "slip_probability must be finite and in [0, 1]")
            }
            Self::Tolerance => write!(formatter, "tolerance must be finite and in (0, 1]"),
            Self::MaxSweeps => write!(
                formatter,
                "max_sweeps must be between 1 and {MAX_GRID_POLICY_SWEEPS}"
            ),
            Self::Reward => write!(
                formatter,
                "rewards must be finite with magnitude at most {MAX_GRID_POLICY_REWARD_MAGNITUDE}"
            ),
            Self::World(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for GridPolicyEvaluationConfigError {}

/// One row of the shared model for a state and requested action.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GridPolicyTransition {
    pub state: u16,
    pub requested_action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub probability: f64,
    pub reward: f64,
    pub boundary_collision: bool,
}

/// One auditable term in a fixed-policy Bellman expectation backup.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GridPolicyTerm {
    pub requested_action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub policy_probability: f64,
    pub transition_probability: f64,
    /// Combined probability `π(a|s) p(s'|s,a)`.
    pub probability: f64,
    pub reward: f64,
    pub next_value: f64,
    pub discounted_next_value: f64,
    pub contribution: f64,
    pub boundary_collision: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GridPolicyUpdate {
    pub state: u16,
    pub old_value: f64,
    pub new_value: f64,
    pub delta: f64,
    pub terms: Vec<GridPolicyTerm>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GridPolicyEvaluationSnapshot {
    pub values: [f64; GRID_POLICY_STATE_COUNT],
    pub action_values: [[f64; GRID_POLICY_ACTION_COUNT]; GRID_POLICY_STATE_COUNT],
    pub policy_probabilities: [[f64; GRID_POLICY_ACTION_COUNT]; GRID_POLICY_STATE_COUNT],
    pub expected_rewards: [f64; GRID_POLICY_STATE_COUNT],
    pub transition_matrix: [[f64; GRID_POLICY_STATE_COUNT]; GRID_POLICY_STATE_COUNT],
    pub sweep_count: u32,
    /// Current fixed-policy residual `max_s |T_π(V)(s) - V(s)|`.
    pub residual: f64,
    pub converged: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GridPolicyEvaluationReference {
    pub values: [f64; GRID_POLICY_STATE_COUNT],
    pub residual: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GridPolicySweepOutcome {
    pub snapshot: GridPolicyEvaluationSnapshot,
    pub updates: Vec<GridPolicyUpdate>,
    pub max_update: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GridPolicyAdvanceOutcome {
    pub snapshot: GridPolicyEvaluationSnapshot,
    /// Residual before the call, followed by one value per completed sweep.
    pub residual_history: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GridPolicyEvaluationError {
    UnknownState(u16),
    SingularBellmanSystem,
}

impl GridPolicyEvaluationError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::UnknownState(_) => "grid_policy_unknown_state",
            Self::SingularBellmanSystem => "grid_policy_singular_system",
        }
    }
}

impl fmt::Display for GridPolicyEvaluationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownState(state) => write!(formatter, "unknown grid-policy state {state}"),
            Self::SingularBellmanSystem => {
                write!(formatter, "the grid-policy Bellman system is singular")
            }
        }
    }
}

impl std::error::Error for GridPolicyEvaluationError {}

/// Stateful synchronous fixed-policy evaluator.
#[derive(Debug, Clone)]
pub struct GridPolicyEvaluationEvaluator {
    config: GridPolicyEvaluationConfig,
    world: GridWorldConfig,
    policy_probabilities: [[f64; GRID_POLICY_ACTION_COUNT]; GRID_POLICY_STATE_COUNT],
    values: [f64; GRID_POLICY_STATE_COUNT],
    sweep_count: u32,
}

impl GridPolicyEvaluationEvaluator {
    pub fn new(
        config: GridPolicyEvaluationConfig,
    ) -> Result<Self, GridPolicyEvaluationConfigError> {
        config.validate()?;
        let world = config.world();
        Ok(Self {
            config,
            world,
            policy_probabilities: policy_table(config.policy),
            values: [0.0; GRID_POLICY_STATE_COUNT],
            sweep_count: 0,
        })
    }

    pub const fn config(&self) -> GridPolicyEvaluationConfig {
        self.config
    }

    pub const fn values(&self) -> &[f64; GRID_POLICY_STATE_COUNT] {
        &self.values
    }

    pub const fn policy_probabilities(
        &self,
    ) -> &[[f64; GRID_POLICY_ACTION_COUNT]; GRID_POLICY_STATE_COUNT] {
        &self.policy_probabilities
    }

    pub const fn seed(&self) -> u64 {
        self.config.seed
    }

    pub fn transition_model(&self) -> Vec<GridPolicyTransition> {
        (0..GRID_POLICY_STATE_COUNT)
            .flat_map(|state| {
                Action::ALL.into_iter().flat_map(move |requested_action| {
                    self.world
                        .transition_distribution_from_validated(state as u16, requested_action)
                        .into_iter()
                        .map(move |outcome| GridPolicyTransition {
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

    pub fn policy_terms(
        &self,
        state: u16,
    ) -> Result<Vec<GridPolicyTerm>, GridPolicyEvaluationError> {
        self.ensure_state(state)?;
        Ok(self.terms_for(state, &self.values))
    }

    pub fn bellman_update(
        &self,
        state: u16,
    ) -> Result<GridPolicyUpdate, GridPolicyEvaluationError> {
        self.ensure_state(state)?;
        let terms = self.terms_for(state, &self.values);
        let old_value = self.values[state as usize];
        let new_value = terms.iter().map(|term| term.contribution).sum();
        Ok(GridPolicyUpdate {
            state,
            old_value,
            new_value,
            delta: new_value - old_value,
            terms,
        })
    }

    pub fn snapshot(&self) -> GridPolicyEvaluationSnapshot {
        let action_values = self.action_values_for(&self.values);
        let (expected_rewards, transition_matrix) = self.policy_model();
        let next_values = self.policy_backup(&self.values);
        let residual = residual_between(&next_values, &self.values);
        let converged = residual <= self.config.tolerance;
        GridPolicyEvaluationSnapshot {
            values: self.values,
            action_values,
            policy_probabilities: self.policy_probabilities,
            expected_rewards,
            transition_matrix,
            sweep_count: self.sweep_count,
            residual,
            converged,
            truncated: !converged && self.sweep_count >= self.config.max_sweeps,
        }
    }

    pub fn reset(&mut self) -> GridPolicyEvaluationSnapshot {
        self.values = [0.0; GRID_POLICY_STATE_COUNT];
        self.sweep_count = 0;
        self.snapshot()
    }

    /// Perform one synchronous Bellman expectation sweep.
    pub fn sweep(&mut self) -> GridPolicySweepOutcome {
        let before = self.snapshot();
        if before.converged || before.truncated {
            return GridPolicySweepOutcome {
                snapshot: before,
                updates: Vec::new(),
                max_update: 0.0,
            };
        }

        let updates: Vec<_> = (0..GRID_POLICY_STATE_COUNT)
            .map(|state| {
                let state = state as u16;
                let terms = self.terms_for(state, &self.values);
                let old_value = self.values[state as usize];
                let new_value = terms.iter().map(|term| term.contribution).sum();
                GridPolicyUpdate {
                    state,
                    old_value,
                    new_value,
                    delta: new_value - old_value,
                    terms,
                }
            })
            .collect();
        let max_update = updates
            .iter()
            .map(|update| update.delta.abs())
            .fold(0.0, f64::max);

        for update in &updates {
            self.values[update.state as usize] = update.new_value;
        }
        self.sweep_count = self.sweep_count.saturating_add(1);

        GridPolicySweepOutcome {
            snapshot: self.snapshot(),
            updates,
            max_update,
        }
    }

    pub fn advance(&mut self, sweeps: u32) -> GridPolicyAdvanceOutcome {
        let mut snapshot = self.snapshot();
        let mut residual_history = Vec::with_capacity(
            sweeps.min(self.config.max_sweeps.saturating_sub(self.sweep_count)) as usize + 1,
        );
        residual_history.push(snapshot.residual);
        for _ in 0..sweeps {
            if snapshot.converged || snapshot.truncated {
                break;
            }
            snapshot = self.sweep().snapshot;
            residual_history.push(snapshot.residual);
        }
        GridPolicyAdvanceOutcome {
            snapshot,
            residual_history,
        }
    }

    pub fn run_to_convergence(&mut self) -> GridPolicyAdvanceOutcome {
        self.advance(self.config.max_sweeps.saturating_sub(self.sweep_count))
    }

    /// Solve `(I - γP_π)V = r_π` with partial-pivoting Gaussian elimination.
    pub fn exact_values(
        &self,
    ) -> Result<[f64; GRID_POLICY_STATE_COUNT], GridPolicyEvaluationError> {
        let (expected_rewards, transition_matrix) = self.policy_model();
        let mut system = [[0.0; GRID_POLICY_STATE_COUNT + 1]; GRID_POLICY_STATE_COUNT];
        for state in 0..GRID_POLICY_STATE_COUNT {
            system[state][state] = 1.0;
            for next_state in 0..GRID_POLICY_STATE_COUNT {
                system[state][next_state] -=
                    self.config.discount * transition_matrix[state][next_state];
            }
            system[state][GRID_POLICY_STATE_COUNT] = expected_rewards[state];
        }

        for pivot_column in 0..GRID_POLICY_STATE_COUNT {
            let pivot_row = (pivot_column..GRID_POLICY_STATE_COUNT)
                .max_by(|&left, &right| {
                    system[left][pivot_column]
                        .abs()
                        .total_cmp(&system[right][pivot_column].abs())
                })
                .expect("pivot range is non-empty");
            let pivot = system[pivot_row][pivot_column];
            if !pivot.is_finite() || pivot.abs() <= NUMERIC_PIVOT_FLOOR {
                return Err(GridPolicyEvaluationError::SingularBellmanSystem);
            }
            system.swap(pivot_column, pivot_row);
            for value in system[pivot_column].iter_mut().skip(pivot_column) {
                *value /= pivot;
            }
            let normalized_pivot = system[pivot_column];
            for (row_index, row) in system.iter_mut().enumerate() {
                if row_index == pivot_column {
                    continue;
                }
                let factor = row[pivot_column];
                for (column, value) in row.iter_mut().enumerate().skip(pivot_column) {
                    *value -= factor * normalized_pivot[column];
                }
            }
        }

        Ok(std::array::from_fn(|state| {
            system[state][GRID_POLICY_STATE_COUNT]
        }))
    }

    pub fn reference_solution(
        &self,
    ) -> Result<GridPolicyEvaluationReference, GridPolicyEvaluationError> {
        let values = self.exact_values()?;
        let residual = residual_between(&self.policy_backup(&values), &values);
        Ok(GridPolicyEvaluationReference { values, residual })
    }

    fn ensure_state(&self, state: u16) -> Result<(), GridPolicyEvaluationError> {
        if state as usize >= GRID_POLICY_STATE_COUNT {
            Err(GridPolicyEvaluationError::UnknownState(state))
        } else {
            Ok(())
        }
    }

    fn terms_for(
        &self,
        state: u16,
        values: &[f64; GRID_POLICY_STATE_COUNT],
    ) -> Vec<GridPolicyTerm> {
        if state == self.world.goal {
            return Vec::new();
        }
        Action::ALL
            .into_iter()
            .flat_map(|requested_action| {
                let policy_probability =
                    self.policy_probabilities[state as usize][requested_action.code() as usize];
                self.world
                    .transition_distribution_from_validated(state, requested_action)
                    .into_iter()
                    .filter_map(move |outcome| {
                        if policy_probability == 0.0 {
                            return None;
                        }
                        let next_value = if outcome.next_state == self.world.goal {
                            0.0
                        } else {
                            values[outcome.next_state as usize]
                        };
                        let probability = policy_probability * outcome.probability;
                        let discounted_next_value = self.config.discount * next_value;
                        Some(GridPolicyTerm {
                            requested_action,
                            actual_action: outcome.actual_action,
                            next_state: outcome.next_state,
                            policy_probability,
                            transition_probability: outcome.probability,
                            probability,
                            reward: outcome.reward,
                            next_value,
                            discounted_next_value,
                            contribution: probability * (outcome.reward + discounted_next_value),
                            boundary_collision: outcome.boundary_collision,
                        })
                    })
            })
            .collect()
    }

    fn policy_backup(
        &self,
        values: &[f64; GRID_POLICY_STATE_COUNT],
    ) -> [f64; GRID_POLICY_STATE_COUNT] {
        std::array::from_fn(|state| {
            self.terms_for(state as u16, values)
                .iter()
                .map(|term| term.contribution)
                .sum()
        })
    }

    fn action_values_for(
        &self,
        values: &[f64; GRID_POLICY_STATE_COUNT],
    ) -> [[f64; GRID_POLICY_ACTION_COUNT]; GRID_POLICY_STATE_COUNT] {
        std::array::from_fn(|state| {
            if state as u16 == self.world.goal {
                return [0.0; GRID_POLICY_ACTION_COUNT];
            }
            Action::ALL.map(|action| {
                self.world
                    .transition_distribution_from_validated(state as u16, action)
                    .into_iter()
                    .map(|outcome| {
                        let next_value = if outcome.next_state == self.world.goal {
                            0.0
                        } else {
                            values[outcome.next_state as usize]
                        };
                        outcome.probability * (outcome.reward + self.config.discount * next_value)
                    })
                    .sum()
            })
        })
    }

    fn policy_model(
        &self,
    ) -> (
        [f64; GRID_POLICY_STATE_COUNT],
        [[f64; GRID_POLICY_STATE_COUNT]; GRID_POLICY_STATE_COUNT],
    ) {
        let mut expected_rewards = [0.0; GRID_POLICY_STATE_COUNT];
        let mut transition_matrix = [[0.0; GRID_POLICY_STATE_COUNT]; GRID_POLICY_STATE_COUNT];
        for state in 0..GRID_POLICY_STATE_COUNT {
            if state as u16 == self.world.goal {
                continue;
            }
            for action in Action::ALL {
                let policy_probability = self.policy_probabilities[state][action.code() as usize];
                for outcome in self
                    .world
                    .transition_distribution_from_validated(state as u16, action)
                {
                    let probability = policy_probability * outcome.probability;
                    expected_rewards[state] += probability * outcome.reward;
                    transition_matrix[state][outcome.next_state as usize] += probability;
                }
            }
        }
        (expected_rewards, transition_matrix)
    }
}

fn residual_between(
    next: &[f64; GRID_POLICY_STATE_COUNT],
    current: &[f64; GRID_POLICY_STATE_COUNT],
) -> f64 {
    next.iter()
        .zip(current)
        .map(|(next, current)| (next - current).abs())
        .fold(0.0, f64::max)
}

fn policy_table(
    kind: GridPolicyKind,
) -> [[f64; GRID_POLICY_ACTION_COUNT]; GRID_POLICY_STATE_COUNT] {
    std::array::from_fn(|state| {
        if state as u16 == GOAL_STATE {
            return [0.0; GRID_POLICY_ACTION_COUNT];
        }
        match kind {
            GridPolicyKind::Uniform => [0.2; GRID_POLICY_ACTION_COUNT],
            GridPolicyKind::GoalSeeking => goal_seeking_row(state as u16),
        }
    })
}

fn goal_seeking_row(state: u16) -> [f64; GRID_POLICY_ACTION_COUNT] {
    let row = state / 4;
    let column = state % 4;
    let distance = (3_u16.saturating_sub(row)) + (3_u16.saturating_sub(column));
    let mut weights = [0.05; GRID_POLICY_ACTION_COUNT];
    for action in [Action::Up, Action::Right, Action::Down, Action::Left] {
        let (next_row, next_column) = match action {
            Action::Up => (row.saturating_sub(1), column),
            Action::Right => (row, (column + 1).min(3)),
            Action::Down => ((row + 1).min(3), column),
            Action::Left => (row, column.saturating_sub(1)),
            Action::Stay => (row, column),
        };
        let next_distance = (3_u16.saturating_sub(next_row)) + (3_u16.saturating_sub(next_column));
        if next_distance < distance {
            weights[action.code() as usize] = 0.4;
        }
    }
    let sum: f64 = weights.iter().sum();
    weights.map(|weight| weight / sum)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> GridPolicyEvaluationConfig {
        GridPolicyEvaluationConfig::default()
    }

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "expected {expected:.12}, received {actual:.12}"
        );
    }

    #[test]
    fn fixed_world_matches_the_shared_four_by_four_contract() {
        let evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        let world = config().world();
        assert_eq!(world.width, 4);
        assert_eq!(world.height, 4);
        assert_eq!(world.start, 0);
        assert_eq!(world.goal, 15);
        assert_eq!(world.hazards, vec![6, 9]);
        assert_eq!(evaluator.policy_probabilities()[15], [0.0; 5]);
    }

    #[test]
    fn policy_and_environment_rows_are_normalized() {
        let evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        for state in 0..GRID_POLICY_STATE_COUNT {
            let policy_sum: f64 = evaluator.policy_probabilities()[state].iter().sum();
            if state == GOAL_STATE as usize {
                assert_eq!(policy_sum, 0.0);
                continue;
            }
            assert_close(policy_sum, 1.0, f64::EPSILON);
            for action in Action::ALL {
                let sum: f64 = evaluator
                    .transition_model()
                    .iter()
                    .filter(|row| row.state == state as u16 && row.requested_action == action)
                    .map(|row| row.probability)
                    .sum();
                assert_close(sum, 1.0, f64::EPSILON);
            }
        }
    }

    #[test]
    fn first_uniform_sweep_is_the_shared_grid_golden() {
        let mut evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        let outcome = evaluator.sweep();
        // With no wind and a uniform policy, these are the expected immediate
        // rewards (the first sweep starts from V₀=0).
        let expected = [
            -0.424, -0.232, -0.424, -0.424, -0.232, -0.424, -0.232, -0.424, -0.424, -0.232, -0.424,
            -0.024, -0.424, -0.424, -0.024, 0.0,
        ];
        for (actual, expected) in outcome.snapshot.values.into_iter().zip(expected) {
            assert_close(actual, expected, 1e-12);
        }
        assert_eq!(outcome.updates.len(), GRID_POLICY_STATE_COUNT);
        assert_eq!(outcome.updates[15].terms.len(), 0);
    }

    #[test]
    fn exact_solution_matches_iterated_fixed_point() {
        let mut evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        let exact = evaluator.exact_values().expect("invertible system");
        let reference = evaluator.reference_solution().expect("reference");
        assert_eq!(exact, reference.values);
        assert!(reference.residual < 1e-12);
        let outcome = evaluator.run_to_convergence();
        assert!(outcome.snapshot.converged);
        assert!(!outcome.snapshot.truncated);
        for (iterated, expected) in outcome.snapshot.values.into_iter().zip(exact) {
            assert_close(iterated, expected, 2e-9);
        }
    }

    #[test]
    fn matrix_keeps_terminal_probability_out_of_nonterminal_columns() {
        let evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        let snapshot = evaluator.snapshot();
        assert_eq!(
            snapshot.transition_matrix[15],
            [0.0; GRID_POLICY_STATE_COUNT]
        );
        assert!(snapshot.transition_matrix.iter().any(|row| {
            let sum: f64 = row.iter().sum();
            sum < 1.0 - 1e-12
        }));
    }

    #[test]
    fn goal_seeking_is_still_a_fixed_policy_and_normalized() {
        let mut candidate = config();
        candidate.policy = GridPolicyKind::GoalSeeking;
        let evaluator = GridPolicyEvaluationEvaluator::new(candidate).expect("valid config");
        for state in 0..15 {
            assert_close(
                evaluator.policy_probabilities()[state].iter().sum(),
                1.0,
                f64::EPSILON,
            );
        }
        assert!(evaluator.policy_probabilities()[0][Action::Right.code() as usize] > 0.2);
    }

    #[test]
    fn invalid_configuration_has_stable_codes() {
        let invalid = [
            (
                GridPolicyEvaluationConfig {
                    discount: 1.0,
                    ..config()
                },
                "grid_policy_discount_range",
            ),
            (
                GridPolicyEvaluationConfig {
                    slip_probability: f64::NAN,
                    ..config()
                },
                "grid_policy_slip_range",
            ),
            (
                GridPolicyEvaluationConfig {
                    max_sweeps: 0,
                    ..config()
                },
                "grid_policy_max_sweeps_range",
            ),
        ];
        for (candidate, code) in invalid {
            assert_eq!(
                GridPolicyEvaluationEvaluator::new(candidate)
                    .expect_err("invalid config")
                    .code(),
                code
            );
        }
        assert_eq!(
            GridPolicyKind::try_from("other").unwrap_err().code(),
            "grid_policy_unknown_kind"
        );
    }

    #[test]
    fn reset_restores_zero_vector_and_sweep_count() {
        let mut evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        evaluator.advance(4);
        let snapshot = evaluator.reset();
        assert_eq!(snapshot.values, [0.0; GRID_POLICY_STATE_COUNT]);
        assert_eq!(snapshot.sweep_count, 0);
        assert!(!snapshot.converged);
    }

    #[test]
    fn selected_state_terms_use_the_pre_sweep_vector() {
        let mut evaluator = GridPolicyEvaluationEvaluator::new(config()).expect("valid config");
        evaluator.sweep();
        let update = evaluator.bellman_update(0).expect("known state");
        assert!(update.terms.iter().any(|term| term.next_value < 0.0));
        assert!(
            update
                .terms
                .iter()
                .all(|term| term.next_value == evaluator.values()[term.next_state as usize])
        );
        assert_eq!(
            evaluator.bellman_update(16),
            Err(GridPolicyEvaluationError::UnknownState(16))
        );
    }
}
