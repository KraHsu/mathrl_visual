//! A small, deterministic policy-evaluation model used by the chapter 2 lab.
//!
//! The four-state Markov reward process is intentionally fixed so the UI can
//! focus on Bellman expectation backups and convergence rather than MDP setup.

use std::fmt;

pub const EVALUATION_STATE_COUNT: usize = 4;
pub const MAX_EVALUATION_SWEEPS: u32 = 10_000;

const TRANSITIONS: [Transition; 7] = [
    Transition::new(0, 1, 0.5, -0.1),
    Transition::new(0, 2, 0.5, -0.1),
    Transition::new(1, 0, 0.2, -0.1),
    Transition::new(1, 3, 0.8, 1.0),
    Transition::new(2, 0, 0.4, -0.1),
    Transition::new(2, 3, 0.6, 1.0),
    Transition::new(3, 3, 1.0, 0.0),
];

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EvaluationConfig {
    pub discount: f64,
    pub tolerance: f64,
    pub max_sweeps: u32,
}

impl EvaluationConfig {
    pub fn validate(&self) -> Result<(), EvaluationConfigError> {
        if !self.discount.is_finite() || !(0.0..1.0).contains(&self.discount) {
            return Err(EvaluationConfigError::Discount);
        }
        if !self.tolerance.is_finite() || self.tolerance <= 0.0 || self.tolerance > 1.0 {
            return Err(EvaluationConfigError::Tolerance);
        }
        if !(1..=MAX_EVALUATION_SWEEPS).contains(&self.max_sweeps) {
            return Err(EvaluationConfigError::MaxSweeps);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvaluationConfigError {
    Discount,
    Tolerance,
    MaxSweeps,
}

impl EvaluationConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Discount => "evaluation_discount_range",
            Self::Tolerance => "evaluation_tolerance_range",
            Self::MaxSweeps => "evaluation_max_sweeps_range",
        }
    }
}

impl fmt::Display for EvaluationConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discount => write!(formatter, "discount must be finite and in [0, 1)"),
            Self::Tolerance => {
                write!(formatter, "tolerance must be finite and in (0, 1]")
            }
            Self::MaxSweeps => write!(
                formatter,
                "max_sweeps must be between 1 and {MAX_EVALUATION_SWEEPS}"
            ),
        }
    }
}

impl std::error::Error for EvaluationConfigError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Transition {
    pub state: u8,
    pub next_state: u8,
    pub probability: f64,
    pub reward: f64,
}

impl Transition {
    const fn new(state: u8, next_state: u8, probability: f64, reward: f64) -> Self {
        Self {
            state,
            next_state,
            probability,
            reward,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BellmanTerm {
    pub next_state: u8,
    pub probability: f64,
    pub reward: f64,
    pub next_value: f64,
    pub discounted_next_value: f64,
    pub contribution: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct BellmanUpdate {
    pub state: u8,
    pub old_value: f64,
    pub new_value: f64,
    /// The signed change, `new_value - old_value`.
    pub delta: f64,
    pub terms: Vec<BellmanTerm>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EvaluationSnapshot {
    pub values: [f64; EVALUATION_STATE_COUNT],
    pub sweep_count: u32,
    /// The current Bellman residual, `max_s |T(V)(s) - V(s)|`.
    pub residual: f64,
    pub converged: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SweepOutcome {
    pub snapshot: EvaluationSnapshot,
    pub updates: Vec<BellmanUpdate>,
    pub max_update: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdvanceOutcome {
    pub snapshot: EvaluationSnapshot,
    /// Includes the residual before the call, followed by one point per sweep.
    pub residual_history: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvaluationError {
    UnknownState(u8),
    SingularBellmanSystem,
}

impl EvaluationError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::UnknownState(_) => "evaluation_unknown_state",
            Self::SingularBellmanSystem => "singular_bellman_system",
        }
    }
}

impl fmt::Display for EvaluationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownState(state) => write!(formatter, "unknown evaluation state {state}"),
            Self::SingularBellmanSystem => write!(formatter, "the Bellman system is singular"),
        }
    }
}

impl std::error::Error for EvaluationError {}

#[derive(Debug, Clone)]
pub struct BellmanEvaluator {
    config: EvaluationConfig,
    values: [f64; EVALUATION_STATE_COUNT],
    sweep_count: u32,
}

impl BellmanEvaluator {
    pub fn new(config: EvaluationConfig) -> Result<Self, EvaluationConfigError> {
        config.validate()?;
        Ok(Self {
            config,
            values: [0.0; EVALUATION_STATE_COUNT],
            sweep_count: 0,
        })
    }

    pub const fn config(&self) -> EvaluationConfig {
        self.config
    }

    pub const fn values(&self) -> &[f64; EVALUATION_STATE_COUNT] {
        &self.values
    }

    pub fn transition_model(&self) -> &'static [Transition] {
        &TRANSITIONS
    }

    pub fn bellman_terms(&self, state: u8) -> Result<Vec<BellmanTerm>, EvaluationError> {
        if state as usize >= EVALUATION_STATE_COUNT {
            return Err(EvaluationError::UnknownState(state));
        }
        Ok(TRANSITIONS
            .iter()
            .filter(|transition| transition.state == state)
            .map(|transition| {
                let next_value = self.values[transition.next_state as usize];
                let discounted_next_value = self.config.discount * next_value;
                BellmanTerm {
                    next_state: transition.next_state,
                    probability: transition.probability,
                    reward: transition.reward,
                    next_value,
                    discounted_next_value,
                    contribution: transition.probability
                        * (transition.reward + discounted_next_value),
                }
            })
            .collect())
    }

    pub fn bellman_update(&self, state: u8) -> Result<BellmanUpdate, EvaluationError> {
        let terms = self.bellman_terms(state)?;
        let old_value = self.values[state as usize];
        let new_value = terms.iter().map(|term| term.contribution).sum();
        Ok(BellmanUpdate {
            state,
            old_value,
            new_value,
            delta: new_value - old_value,
            terms,
        })
    }

    pub fn residual(&self) -> f64 {
        (0..EVALUATION_STATE_COUNT)
            .map(|state| {
                self.bellman_update(state as u8)
                    .expect("the fixed model only contains valid states")
                    .delta
                    .abs()
            })
            .fold(0.0, f64::max)
    }

    pub fn snapshot(&self) -> EvaluationSnapshot {
        let residual = self.residual();
        let converged = residual <= self.config.tolerance;
        EvaluationSnapshot {
            values: self.values,
            sweep_count: self.sweep_count,
            residual,
            converged,
            truncated: !converged && self.sweep_count >= self.config.max_sweeps,
        }
    }

    pub fn reset(&mut self) -> EvaluationSnapshot {
        self.values = [0.0; EVALUATION_STATE_COUNT];
        self.sweep_count = 0;
        self.snapshot()
    }

    /// Performs one synchronous Bellman sweep unless evaluation has already
    /// converged or reached its configured sweep limit.
    pub fn sweep(&mut self) -> SweepOutcome {
        let before = self.snapshot();
        if before.converged || before.truncated {
            return SweepOutcome {
                snapshot: before,
                updates: Vec::new(),
                max_update: 0.0,
            };
        }

        let updates: Vec<_> = (0..EVALUATION_STATE_COUNT)
            .map(|state| {
                self.bellman_update(state as u8)
                    .expect("the fixed model only contains valid states")
            })
            .collect();
        let max_update = updates
            .iter()
            .map(|update| update.delta.abs())
            .fold(0.0, f64::max);

        for update in &updates {
            self.values[update.state as usize] = update.new_value;
        }
        self.sweep_count += 1;

        SweepOutcome {
            snapshot: self.snapshot(),
            updates,
            max_update,
        }
    }

    /// Advances by at most `sweeps`, stopping early on convergence or the
    /// configured safety limit.
    pub fn advance(&mut self, sweeps: u32) -> AdvanceOutcome {
        let mut snapshot = self.snapshot();
        let mut residual_history =
            Vec::with_capacity(sweeps.min(self.config.max_sweeps) as usize + 1);
        residual_history.push(snapshot.residual);

        for _ in 0..sweeps {
            if snapshot.converged || snapshot.truncated {
                break;
            }
            snapshot = self.sweep().snapshot;
            residual_history.push(snapshot.residual);
        }

        AdvanceOutcome {
            snapshot,
            residual_history,
        }
    }

    pub fn run_to_convergence(&mut self) -> AdvanceOutcome {
        self.advance(self.config.max_sweeps.saturating_sub(self.sweep_count))
    }

    /// Solves `(I - gamma P)V = r` using partial-pivoting Gaussian elimination.
    pub fn exact_values(&self) -> Result<[f64; EVALUATION_STATE_COUNT], EvaluationError> {
        let mut system = [[0.0; EVALUATION_STATE_COUNT + 1]; EVALUATION_STATE_COUNT];

        for (state, row) in system.iter_mut().enumerate() {
            row[state] = 1.0;
            for transition in TRANSITIONS
                .iter()
                .filter(|transition| transition.state as usize == state)
            {
                row[transition.next_state as usize] -=
                    self.config.discount * transition.probability;
                row[EVALUATION_STATE_COUNT] += transition.probability * transition.reward;
            }
        }

        for pivot_column in 0..EVALUATION_STATE_COUNT {
            let pivot_row = (pivot_column..EVALUATION_STATE_COUNT)
                .max_by(|&left, &right| {
                    system[left][pivot_column]
                        .abs()
                        .total_cmp(&system[right][pivot_column].abs())
                })
                .expect("the pivot range is never empty");
            let pivot = system[pivot_row][pivot_column];
            if pivot == 0.0 || !pivot.is_finite() {
                return Err(EvaluationError::SingularBellmanSystem);
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
            system[state][EVALUATION_STATE_COUNT]
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> EvaluationConfig {
        EvaluationConfig {
            discount: 0.9,
            tolerance: 1e-10,
            max_sweeps: 10_000,
        }
    }

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "expected {expected:.12}, received {actual:.12}"
        );
    }

    #[test]
    fn every_transition_row_is_a_probability_distribution() {
        let evaluator = BellmanEvaluator::new(config()).expect("valid config");
        let model = evaluator.transition_model();

        for state in 0..EVALUATION_STATE_COUNT {
            let sum: f64 = model
                .iter()
                .filter(|transition| transition.state as usize == state)
                .map(|transition| transition.probability)
                .sum();
            assert_close(sum, 1.0, f64::EPSILON);
        }
        assert_eq!(model.len(), 7);
    }

    #[test]
    fn the_first_synchronous_sweep_matches_the_hand_calculation() {
        let mut evaluator = BellmanEvaluator::new(config()).expect("valid config");

        let outcome = evaluator.sweep();

        for (actual, expected) in outcome
            .snapshot
            .values
            .into_iter()
            .zip([-0.1, 0.78, 0.56, 0.0])
        {
            assert_close(actual, expected, f64::EPSILON);
        }
        assert_close(outcome.max_update, 0.78, f64::EPSILON);
        assert_eq!(outcome.updates.len(), EVALUATION_STATE_COUNT);
        assert_eq!(outcome.updates[0].terms.len(), 2);
    }

    #[test]
    fn gaussian_elimination_matches_the_exact_golden_values() {
        let evaluator = BellmanEvaluator::new(config()).expect("valid config");

        let exact = evaluator.exact_values().expect("invertible Bellman system");
        let expected = [0.664_464_993_4, 0.899_603_698_8, 0.799_207_397_6, 0.0];

        for (actual, expected) in exact.into_iter().zip(expected) {
            assert_close(actual, expected, 1e-10);
        }
    }

    #[test]
    fn run_converges_using_the_current_bellman_residual() {
        let mut evaluator = BellmanEvaluator::new(config()).expect("valid config");

        let outcome = evaluator.run_to_convergence();

        assert!(outcome.snapshot.converged);
        assert!(!outcome.snapshot.truncated);
        assert!(outcome.snapshot.residual <= evaluator.config().tolerance);
        assert_eq!(
            outcome.residual_history.len(),
            outcome.snapshot.sweep_count as usize + 1
        );
        let exact = evaluator.exact_values().expect("invertible Bellman system");
        for (iterative, exact) in outcome.snapshot.values.into_iter().zip(exact) {
            assert_close(iterative, exact, 2e-10);
        }
    }

    #[test]
    fn the_sweep_limit_is_reported_as_truncation() {
        let mut limited = config();
        limited.tolerance = 1e-15;
        limited.max_sweeps = 1;
        let mut evaluator = BellmanEvaluator::new(limited).expect("valid config");

        let outcome = evaluator.run_to_convergence();

        assert!(!outcome.snapshot.converged);
        assert!(outcome.snapshot.truncated);
        assert_eq!(outcome.snapshot.sweep_count, 1);
    }

    #[test]
    fn rejects_invalid_configuration_values_with_stable_codes() {
        let invalid = [
            (
                EvaluationConfig {
                    discount: 1.0,
                    ..config()
                },
                "evaluation_discount_range",
            ),
            (
                EvaluationConfig {
                    tolerance: 0.0,
                    ..config()
                },
                "evaluation_tolerance_range",
            ),
            (
                EvaluationConfig {
                    max_sweeps: 0,
                    ..config()
                },
                "evaluation_max_sweeps_range",
            ),
        ];

        for (config, expected_code) in invalid {
            let error = BellmanEvaluator::new(config).expect_err("invalid config");
            assert_eq!(error.code(), expected_code);
        }

        let non_finite = EvaluationConfig {
            tolerance: f64::NAN,
            ..config()
        };
        assert_eq!(
            BellmanEvaluator::new(non_finite)
                .expect_err("non-finite tolerance")
                .code(),
            "evaluation_tolerance_range"
        );
    }

    #[test]
    fn reset_restores_the_initial_values_and_counters() {
        let mut evaluator = BellmanEvaluator::new(config()).expect("valid config");
        evaluator.advance(4);

        let snapshot = evaluator.reset();

        assert_eq!(snapshot.values, [0.0; EVALUATION_STATE_COUNT]);
        assert_eq!(snapshot.sweep_count, 0);
        assert_close(snapshot.residual, 0.78, f64::EPSILON);
        assert!(!snapshot.converged);
        assert!(!snapshot.truncated);
    }

    #[test]
    fn advance_matches_repeated_single_sweeps() {
        let mut batched = BellmanEvaluator::new(config()).expect("valid config");
        let mut repeated = BellmanEvaluator::new(config()).expect("valid config");

        let batch_outcome = batched.advance(7);
        for _ in 0..7 {
            repeated.sweep();
        }

        assert_eq!(batch_outcome.snapshot, repeated.snapshot());
        assert_eq!(batch_outcome.residual_history.len(), 8);
    }

    #[test]
    fn bellman_terms_use_only_the_pre_sweep_value_vector() {
        let mut evaluator = BellmanEvaluator::new(config()).expect("valid config");
        evaluator.sweep();

        let update = evaluator.bellman_update(0).expect("known state");

        assert_close(update.terms[0].next_value, 0.78, f64::EPSILON);
        assert_close(update.terms[1].next_value, 0.56, f64::EPSILON);
        assert_close(update.new_value, 0.503, 1e-15);
        assert_eq!(
            evaluator.bellman_terms(4),
            Err(EvaluationError::UnknownState(4))
        );
    }
}
