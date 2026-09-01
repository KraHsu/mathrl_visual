//! Bellman-optimality fixed-point evaluation on the shared 4×4 Grid World.
//!
//! This module deliberately reuses [`GridWorldConfig`]'s transition query so
//! trajectory sampling and planning cannot drift apart. The chapter 3 lab
//! presents the fixed-point mathematics; chapter 4 can reuse the same sweep
//! path when it introduces value iteration as an algorithm.

use std::fmt;

use crate::{Action, ConfigError, GoalMode, GridWorldConfig, Rewards};

pub const OPTIMALITY_STATE_COUNT: usize = 16;
pub const OPTIMALITY_ACTION_COUNT: usize = 5;
pub const MAX_OPTIMALITY_SWEEPS: u32 = 10_000;
pub const MAX_OPTIMALITY_REWARD_MAGNITUDE: f64 = 1_000_000.0;

const MAX_OPTIMALITY_DISCOUNT: f64 = 0.99;
const REFERENCE_MAX_SWEEPS: u32 = 200_000;
const NUMERIC_TIE_ULPS: f64 = 64.0;
const SHARED_GRID_SEED: u64 = 0x5eed;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OptimalityConfig {
    pub discount: f64,
    pub slip_probability: f64,
    pub tolerance: f64,
    pub max_sweeps: u32,
    pub rewards: Rewards,
}

impl OptimalityConfig {
    pub fn validate(&self) -> Result<(), OptimalityConfigError> {
        if !self.discount.is_finite() || !(0.0..=MAX_OPTIMALITY_DISCOUNT).contains(&self.discount) {
            return Err(OptimalityConfigError::Discount);
        }
        if !self.slip_probability.is_finite() || !(0.0..=1.0).contains(&self.slip_probability) {
            return Err(OptimalityConfigError::SlipProbability);
        }
        if !self.tolerance.is_finite() || self.tolerance <= 0.0 || self.tolerance > 1.0 {
            return Err(OptimalityConfigError::Tolerance);
        }
        if !(1..=MAX_OPTIMALITY_SWEEPS).contains(&self.max_sweeps) {
            return Err(OptimalityConfigError::MaxSweeps);
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|reward| !reward.is_finite() || reward.abs() > MAX_OPTIMALITY_REWARD_MAGNITUDE)
        {
            return Err(OptimalityConfigError::Reward);
        }

        self.grid_world_config()
            .validate()
            .map_err(OptimalityConfigError::World)
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
pub enum OptimalityConfigError {
    Discount,
    SlipProbability,
    Tolerance,
    MaxSweeps,
    Reward,
    World(ConfigError),
}

impl OptimalityConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Discount => "optimality_discount_range",
            Self::SlipProbability => "optimality_slip_range",
            Self::Tolerance => "optimality_tolerance_range",
            Self::MaxSweeps => "optimality_max_sweeps_range",
            Self::Reward => "optimality_reward_range",
            Self::World(error) => error.code(),
        }
    }
}

impl fmt::Display for OptimalityConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discount => write!(
                formatter,
                "discount must be finite and between 0 and {MAX_OPTIMALITY_DISCOUNT}"
            ),
            Self::SlipProbability => {
                write!(formatter, "slip_probability must be finite and in [0, 1]")
            }
            Self::Tolerance => write!(formatter, "tolerance must be finite and in (0, 1]"),
            Self::MaxSweeps => write!(
                formatter,
                "max_sweeps must be between 1 and {MAX_OPTIMALITY_SWEEPS}"
            ),
            Self::Reward => write!(
                formatter,
                "rewards must be finite with magnitude at most {MAX_OPTIMALITY_REWARD_MAGNITUDE}"
            ),
            Self::World(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for OptimalityConfigError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OptimalityTransition {
    pub state: u16,
    pub requested_action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub probability: f64,
    pub reward: f64,
    pub boundary_collision: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OptimalitySnapshot {
    pub values: [f64; OPTIMALITY_STATE_COUNT],
    pub action_values: [[f64; OPTIMALITY_ACTION_COUNT]; OPTIMALITY_STATE_COUNT],
    pub greedy_masks: [u8; OPTIMALITY_STATE_COUNT],
    pub sweep_count: u32,
    /// The current optimality residual, `max_s |T_*(V)(s) - V(s)|`.
    pub residual: f64,
    pub converged: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OptimalityReference {
    pub values: [f64; OPTIMALITY_STATE_COUNT],
    pub action_values: [[f64; OPTIMALITY_ACTION_COUNT]; OPTIMALITY_STATE_COUNT],
    pub greedy_masks: [u8; OPTIMALITY_STATE_COUNT],
    pub residual: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OptimalityUpdate {
    pub state: u16,
    pub old_value: f64,
    pub new_value: f64,
    /// The signed change, `new_value - old_value`.
    pub delta: f64,
    pub action_values: [f64; OPTIMALITY_ACTION_COUNT],
    pub greedy_mask: u8,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OptimalitySweepOutcome {
    pub snapshot: OptimalitySnapshot,
    pub updates: Vec<OptimalityUpdate>,
    pub max_update: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OptimalityAdvanceOutcome {
    pub snapshot: OptimalitySnapshot,
    /// Includes the residual before the call, followed by one point per sweep.
    pub residual_history: Vec<f64>,
}

#[derive(Debug, Clone)]
pub struct OptimalityEvaluator {
    config: OptimalityConfig,
    world: GridWorldConfig,
    values: [f64; OPTIMALITY_STATE_COUNT],
    sweep_count: u32,
}

#[derive(Debug, Clone, Copy)]
struct BellmanImage {
    values: [f64; OPTIMALITY_STATE_COUNT],
    action_values: [[f64; OPTIMALITY_ACTION_COUNT]; OPTIMALITY_STATE_COUNT],
    greedy_masks: [u8; OPTIMALITY_STATE_COUNT],
}

impl OptimalityEvaluator {
    pub fn new(config: OptimalityConfig) -> Result<Self, OptimalityConfigError> {
        config.validate()?;
        let mut world = config.grid_world_config();
        // Planning repeatedly uses the already-validated internal query. Keep
        // the same canonical ordering as GridWorldSession even though reward
        // lookup no longer depends on it.
        world.hazards.sort_unstable();
        Ok(Self {
            config,
            world,
            values: [0.0; OPTIMALITY_STATE_COUNT],
            sweep_count: 0,
        })
    }

    pub const fn config(&self) -> OptimalityConfig {
        self.config
    }

    pub fn transition_model(&self) -> Vec<OptimalityTransition> {
        (0..OPTIMALITY_STATE_COUNT)
            .flat_map(|state| {
                Action::ALL.into_iter().flat_map(move |requested_action| {
                    self.world
                        .transition_distribution_from_validated(state as u16, requested_action)
                        .into_iter()
                        .map(move |outcome| OptimalityTransition {
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

    pub fn snapshot(&self) -> OptimalitySnapshot {
        self.snapshot_for(self.values, self.sweep_count)
    }

    pub fn reset(&mut self) -> OptimalitySnapshot {
        self.values = [0.0; OPTIMALITY_STATE_COUNT];
        self.sweep_count = 0;
        self.snapshot()
    }

    pub fn reference_solution(&self) -> OptimalityReference {
        let mut values = [0.0; OPTIMALITY_STATE_COUNT];
        let mut image = self.bellman_image(&values);

        for _ in 0..REFERENCE_MAX_SWEEPS {
            let residual = residual_between(&image.values, &values);
            let scale = values.iter().copied().map(f64::abs).fold(1.0, f64::max);
            let floating_floor = NUMERIC_TIE_ULPS * f64::EPSILON * scale;
            if residual <= 1e-12_f64.max(floating_floor) || image.values == values {
                break;
            }
            values = image.values;
            image = self.bellman_image(&values);
        }

        OptimalityReference {
            values,
            action_values: image.action_values,
            greedy_masks: image.greedy_masks,
            residual: residual_between(&image.values, &values),
        }
    }

    /// Performs one synchronous Bellman-optimality sweep unless the current
    /// vector has already converged or reached the configured sweep limit.
    pub fn sweep(&mut self) -> OptimalitySweepOutcome {
        let before = self.snapshot();
        if before.converged || before.truncated {
            return OptimalitySweepOutcome {
                snapshot: before,
                updates: Vec::new(),
                max_update: 0.0,
            };
        }

        let image = self.bellman_image(&self.values);
        let updates = (0..OPTIMALITY_STATE_COUNT)
            .map(|state| OptimalityUpdate {
                state: state as u16,
                old_value: self.values[state],
                new_value: image.values[state],
                delta: image.values[state] - self.values[state],
                action_values: image.action_values[state],
                greedy_mask: image.greedy_masks[state],
            })
            .collect::<Vec<_>>();
        let max_update = updates
            .iter()
            .map(|update| update.delta.abs())
            .fold(0.0, f64::max);

        self.values = image.values;
        self.sweep_count += 1;

        OptimalitySweepOutcome {
            snapshot: self.snapshot(),
            updates,
            max_update,
        }
    }

    pub fn advance(&mut self, sweeps: u32) -> OptimalityAdvanceOutcome {
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

        OptimalityAdvanceOutcome {
            snapshot,
            residual_history,
        }
    }

    pub fn run_to_convergence(&mut self) -> OptimalityAdvanceOutcome {
        self.advance(self.config.max_sweeps.saturating_sub(self.sweep_count))
    }

    fn snapshot_for(
        &self,
        values: [f64; OPTIMALITY_STATE_COUNT],
        sweep_count: u32,
    ) -> OptimalitySnapshot {
        let image = self.bellman_image(&values);
        let residual = residual_between(&image.values, &values);
        let converged = residual <= self.config.tolerance;
        OptimalitySnapshot {
            values,
            action_values: image.action_values,
            greedy_masks: image.greedy_masks,
            sweep_count,
            residual,
            converged,
            truncated: !converged && sweep_count >= self.config.max_sweeps,
        }
    }

    fn bellman_image(&self, values: &[f64; OPTIMALITY_STATE_COUNT]) -> BellmanImage {
        let mut next_values = [0.0; OPTIMALITY_STATE_COUNT];
        let mut action_values = [[0.0; OPTIMALITY_ACTION_COUNT]; OPTIMALITY_STATE_COUNT];
        let mut greedy_masks = [0_u8; OPTIMALITY_STATE_COUNT];

        for state in 0..OPTIMALITY_STATE_COUNT {
            if state as u16 == self.world.goal {
                // Under the shared episodic convention, entering the goal pays
                // its reward and there is no later decision or continuation.
                continue;
            }

            for action in Action::ALL {
                let value = self
                    .world
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
                    .sum();
                action_values[state][action.code() as usize] = value;
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
}

fn numeric_tie(left: f64, right: f64) -> bool {
    if left == right {
        return true;
    }
    let scale = left.abs().max(right.abs()).max(1.0);
    (left - right).abs() <= NUMERIC_TIE_ULPS * f64::EPSILON * scale
}

fn residual_between(
    next: &[f64; OPTIMALITY_STATE_COUNT],
    current: &[f64; OPTIMALITY_STATE_COUNT],
) -> f64 {
    next.iter()
        .zip(current)
        .map(|(next, current)| (next - current).abs())
        .fold(0.0, f64::max)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> OptimalityConfig {
        OptimalityConfig {
            discount: 0.9,
            slip_probability: 0.0,
            tolerance: 1e-12,
            max_sweeps: 1_000,
            rewards: Rewards::default(),
        }
    }

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "expected {expected:.12}, received {actual:.12}"
        );
    }

    fn mask(actions: &[Action]) -> u8 {
        actions
            .iter()
            .fold(0_u8, |mask, action| mask | (1_u8 << action.code()))
    }

    #[test]
    fn rejects_invalid_configuration_values_with_stable_codes() {
        let invalid = [
            (
                OptimalityConfig {
                    discount: 1.0,
                    ..config()
                },
                "optimality_discount_range",
            ),
            (
                OptimalityConfig {
                    slip_probability: -0.1,
                    ..config()
                },
                "optimality_slip_range",
            ),
            (
                OptimalityConfig {
                    tolerance: 0.0,
                    ..config()
                },
                "optimality_tolerance_range",
            ),
            (
                OptimalityConfig {
                    max_sweeps: 0,
                    ..config()
                },
                "optimality_max_sweeps_range",
            ),
            (
                OptimalityConfig {
                    rewards: Rewards {
                        goal: MAX_OPTIMALITY_REWARD_MAGNITUDE + 1.0,
                        ..Rewards::default()
                    },
                    ..config()
                },
                "optimality_reward_range",
            ),
        ];

        for (config, expected_code) in invalid {
            assert_eq!(
                OptimalityEvaluator::new(config)
                    .expect_err("invalid config")
                    .code(),
                expected_code
            );
        }

        assert_eq!(
            OptimalityEvaluator::new(OptimalityConfig {
                discount: f64::NAN,
                ..config()
            })
            .expect_err("non-finite discount")
            .code(),
            "optimality_discount_range"
        );
    }

    #[test]
    fn complete_model_uses_the_shared_gridworld_rows() {
        let deterministic = OptimalityEvaluator::new(config()).expect("valid config");
        let model = deterministic.transition_model();
        assert_eq!(model.len(), 75);
        assert!(model.iter().all(|transition| transition.state != 15));

        for state in 0..15 {
            for action in Action::ALL {
                let sum: f64 = model
                    .iter()
                    .filter(|transition| {
                        transition.state == state && transition.requested_action == action
                    })
                    .map(|transition| transition.probability)
                    .sum();
                assert_close(sum, 1.0, f64::EPSILON);
            }
        }

        let hazard = model
            .iter()
            .find(|transition| {
                transition.state == 5
                    && transition.requested_action == Action::Right
                    && transition.actual_action == Action::Right
            })
            .expect("state 5 can enter hazard 6");
        assert_eq!(hazard.next_state, 6);
        assert_eq!(hazard.reward, -1.0);
    }

    #[test]
    fn windy_model_preserves_the_existing_slip_rule() {
        let windy = OptimalityEvaluator::new(OptimalityConfig {
            slip_probability: 0.2,
            ..config()
        })
        .expect("valid config");
        let model = windy.transition_model();
        assert_eq!(model.len(), 255);

        let row: Vec<_> = model
            .iter()
            .filter(|transition| {
                transition.state == 0 && transition.requested_action == Action::Right
            })
            .collect();
        assert_eq!(row.len(), 4);
        assert_close(
            row.iter()
                .find(|transition| transition.actual_action == Action::Right)
                .expect("requested direction is represented")
                .probability,
            0.85,
            1e-15,
        );
        assert_close(
            row.iter().map(|transition| transition.probability).sum(),
            1.0,
            1e-15,
        );
    }

    #[test]
    fn windy_backup_takes_each_action_expectation_before_the_maximum() {
        let mut windy = OptimalityEvaluator::new(OptimalityConfig {
            slip_probability: 0.2,
            ..config()
        })
        .expect("valid config");

        let first = windy.sweep();
        let state_eleven = first
            .updates
            .iter()
            .find(|update| update.state == 11)
            .expect("all states have an update");

        // Requested down has actual-action probabilities 0.05, 0.05,
        // 0.85, 0.05. Their rewards are -0.04, -1, +1, -0.04,
        // so the action expectation is 0.796. Taking max per actual
        // outcome first would incorrectly produce 1.0.
        assert_close(
            state_eleven.action_values[Action::Down.code() as usize],
            0.796,
            1e-15,
        );
        assert_close(state_eleven.new_value, 0.796, 1e-15);
        assert_close(first.snapshot.values[11], 0.796, 1e-15);
        assert!(state_eleven.new_value < 1.0);
    }

    #[test]
    fn zero_vector_exposes_immediate_rewards_and_greedy_ties() {
        let evaluator = OptimalityEvaluator::new(config()).expect("valid config");
        let snapshot = evaluator.snapshot();

        assert_eq!(snapshot.values, [0.0; OPTIMALITY_STATE_COUNT]);
        assert_close(snapshot.residual, 1.0, f64::EPSILON);
        assert_eq!(
            snapshot.greedy_masks[0],
            mask(&[Action::Right, Action::Down, Action::Stay])
        );
        assert_eq!(snapshot.greedy_masks[11], mask(&[Action::Down]));
        assert_eq!(snapshot.greedy_masks[15], 0);
        assert_eq!(snapshot.action_values[15], [0.0; OPTIMALITY_ACTION_COUNT]);
    }

    #[test]
    fn first_two_synchronous_sweeps_match_the_hand_calculation() {
        let mut evaluator = OptimalityEvaluator::new(config()).expect("valid config");

        let first = evaluator.sweep();
        let expected_first = [
            -0.04, -0.04, -0.04, -0.04, -0.04, -0.04, -0.04, -0.04, -0.04, -0.04, -0.04, 1.0,
            -0.04, -0.04, 1.0, 0.0,
        ];
        assert_eq!(first.snapshot.values, expected_first);
        assert_close(first.max_update, 1.0, f64::EPSILON);
        assert_eq!(first.updates.len(), OPTIMALITY_STATE_COUNT);

        let second = evaluator.sweep();
        let expected_second = [
            -0.076, -0.076, -0.076, -0.076, -0.076, -0.076, -0.076, 0.86, -0.076, -0.076, 0.86,
            1.0, -0.076, 0.86, 1.0, 0.0,
        ];
        for (actual, expected) in second.snapshot.values.into_iter().zip(expected_second) {
            assert_close(actual, expected, 1e-15);
        }

        let state_ten = second
            .updates
            .iter()
            .find(|update| update.state == 10)
            .expect("all states have a trace update");
        for (actual, expected) in state_ten
            .action_values
            .into_iter()
            .zip([-1.036, 0.86, 0.86, -1.036, -0.076])
        {
            assert_close(actual, expected, 1e-15);
        }
        assert_eq!(state_ten.greedy_mask, mask(&[Action::Right, Action::Down]));
    }

    #[test]
    fn default_grid_converges_to_the_shared_golden_solution() {
        let mut evaluator = OptimalityEvaluator::new(config()).expect("valid config");
        let outcome = evaluator.run_to_convergence();
        let expected = [
            0.426686, 0.51854, 0.6206, 0.734, 0.51854, 0.426686, 0.734, 0.86, 0.6206, 0.734, 0.86,
            1.0, 0.734, 0.86, 1.0, 0.0,
        ];

        assert!(outcome.snapshot.converged);
        assert!(!outcome.snapshot.truncated);
        assert_eq!(outcome.snapshot.sweep_count, 6);
        for (actual, expected) in outcome
            .residual_history
            .iter()
            .copied()
            .zip([1.0, 0.9, 0.81, 0.729, 0.6561, 0.59049, 0.0])
        {
            assert_close(actual, expected, 1e-15);
        }
        for (actual, expected) in outcome.snapshot.values.into_iter().zip(expected) {
            assert_close(actual, expected, 1e-12);
        }
        assert_eq!(
            outcome.snapshot.greedy_masks[0],
            mask(&[Action::Right, Action::Down])
        );
        assert_eq!(
            outcome.snapshot.greedy_masks[5],
            mask(&[Action::Up, Action::Left])
        );
        assert_eq!(
            outcome.snapshot.greedy_masks[10],
            mask(&[Action::Right, Action::Down])
        );
    }

    #[test]
    fn windy_reference_matches_an_independent_golden_calculation() {
        let evaluator = OptimalityEvaluator::new(OptimalityConfig {
            slip_probability: 0.2,
            ..config()
        })
        .expect("valid config");
        let reference = evaluator.reference_solution();
        let expected = [
            -0.108_770_295_743,
            0.045_702_507_252,
            0.181_794_448_705,
            0.374_120_401_261,
            0.045_702_507_252,
            -0.056_271_011_681,
            0.474_555_082_723,
            0.612_116_097_981,
            0.181_794_448_705,
            0.474_555_082_723,
            0.629_230_462_285,
            0.892_000_623_259,
            0.374_120_401_261,
            0.612_116_097_981,
            0.892_000_623_259,
            0.0,
        ];

        assert!(reference.residual <= 1e-11);
        for (actual, expected) in reference.values.into_iter().zip(expected) {
            assert_close(actual, expected, 2e-11);
        }
        assert_eq!(reference.greedy_masks[6], mask(&[Action::Down]));
        assert_eq!(reference.greedy_masks[9], mask(&[Action::Right]));
    }

    #[test]
    fn reference_and_sweep_paths_agree() {
        let mut evaluator = OptimalityEvaluator::new(config()).expect("valid config");
        let reference = evaluator.reference_solution();
        let iterative = evaluator.run_to_convergence().snapshot;

        assert_eq!(iterative.greedy_masks, reference.greedy_masks);
        for (actual, expected) in iterative.values.into_iter().zip(reference.values) {
            assert_close(actual, expected, 1e-12);
        }
    }

    #[test]
    fn configured_numeric_limits_still_produce_finite_reference_data() {
        let evaluator = OptimalityEvaluator::new(OptimalityConfig {
            discount: 0.99,
            slip_probability: 1.0,
            rewards: Rewards {
                default: MAX_OPTIMALITY_REWARD_MAGNITUDE,
                boundary: MAX_OPTIMALITY_REWARD_MAGNITUDE,
                hazard: MAX_OPTIMALITY_REWARD_MAGNITUDE,
                goal: MAX_OPTIMALITY_REWARD_MAGNITUDE,
            },
            ..config()
        })
        .expect("documented numeric limits are valid");

        let reference = evaluator.reference_solution();

        assert!(reference.values.into_iter().all(f64::is_finite));
        assert!(
            reference
                .action_values
                .into_iter()
                .flatten()
                .all(f64::is_finite)
        );
        assert!(reference.residual.is_finite());
        assert!(reference.residual <= 2e-6);
    }

    #[test]
    fn bellman_operator_satisfies_the_contraction_golden() {
        let evaluator = OptimalityEvaluator::new(config()).expect("valid config");
        let left = [0.0; OPTIMALITY_STATE_COUNT];
        let mut right = [1.0; OPTIMALITY_STATE_COUNT];
        right[15] = 0.0;

        let left_image = evaluator.bellman_image(&left);
        let right_image = evaluator.bellman_image(&right);
        let input_distance = residual_between(&left, &right);
        let output_distance = residual_between(&left_image.values, &right_image.values);

        assert_close(input_distance, 1.0, f64::EPSILON);
        assert_close(output_distance, 0.9, f64::EPSILON);
        assert!(output_distance <= evaluator.config().discount * input_distance);
    }

    #[test]
    fn contraction_bound_survives_action_switches_and_wind() {
        let left = std::array::from_fn(|state| (state as f64 - 7.0) / 3.0);
        let right = std::array::from_fn(|state| ((state * 7) % 11) as f64 / 2.0 - 1.0);
        let input_distance = residual_between(&left, &right);

        for discount in [0.0, 0.3, 0.9, 0.99] {
            for slip_probability in [0.0, 0.2, 1.0] {
                let evaluator = OptimalityEvaluator::new(OptimalityConfig {
                    discount,
                    slip_probability,
                    ..config()
                })
                .expect("bounded discounted configuration");
                let left_image = evaluator.bellman_image(&left);
                let right_image = evaluator.bellman_image(&right);
                let output_distance = residual_between(&left_image.values, &right_image.values);
                let bound = discount * input_distance;
                let rounding_allowance = 128.0 * f64::EPSILON * bound.abs().max(1.0);

                assert!(
                    output_distance <= bound + rounding_allowance,
                    "discount={discount}, slip={slip_probability}: {output_distance} > {bound}"
                );
            }
        }
    }

    #[test]
    fn zero_discount_is_myopic_and_converges_after_one_sweep() {
        let mut evaluator = OptimalityEvaluator::new(OptimalityConfig {
            discount: 0.0,
            ..config()
        })
        .expect("valid config");

        let outcome = evaluator.run_to_convergence();

        assert_eq!(outcome.snapshot.sweep_count, 1);
        assert!(outcome.snapshot.converged);
        assert_eq!(
            outcome.snapshot.greedy_masks[0],
            mask(&[Action::Right, Action::Down, Action::Stay])
        );
    }

    #[test]
    fn advance_matches_repeated_sweeps_and_reset_restores_zero() {
        let mut batched = OptimalityEvaluator::new(config()).expect("valid config");
        let mut repeated = OptimalityEvaluator::new(config()).expect("valid config");

        let batch = batched.advance(4);
        for _ in 0..4 {
            repeated.sweep();
        }
        assert_eq!(batch.snapshot, repeated.snapshot());
        assert_eq!(batch.residual_history.len(), 5);

        let reset = batched.reset();
        assert_eq!(reset.values, [0.0; OPTIMALITY_STATE_COUNT]);
        assert_eq!(reset.sweep_count, 0);
        assert_close(reset.residual, 1.0, f64::EPSILON);
    }

    #[test]
    fn sweep_limit_is_reported_as_truncation() {
        let mut evaluator = OptimalityEvaluator::new(OptimalityConfig {
            tolerance: 1e-15,
            max_sweeps: 1,
            ..config()
        })
        .expect("valid config");

        let outcome = evaluator.run_to_convergence();

        assert!(!outcome.snapshot.converged);
        assert!(outcome.snapshot.truncated);
        assert_eq!(outcome.snapshot.sweep_count, 1);
    }
}
