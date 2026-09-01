use std::fmt;

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

const MIN_SIDE: u8 = 2;
const MAX_SIDE: u8 = 20;
const MAX_STEPS: u32 = 100;
const MAX_REWARD_MAGNITUDE: f64 = f64::MAX / (MAX_STEPS as f64 + 1.0);
const POLICY_TOLERANCE: f64 = 1e-9;
const POLICY_SEED_XOR: u64 = 0x504f_4c49_4359_0001;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Action {
    Up = 0,
    Right = 1,
    Down = 2,
    Left = 3,
    Stay = 4,
}

impl Action {
    pub const ALL: [Self; 5] = [Self::Up, Self::Right, Self::Down, Self::Left, Self::Stay];

    pub const fn code(self) -> u8 {
        self as u8
    }

    fn from_cardinal_index(index: u8) -> Self {
        match index {
            0 => Self::Up,
            1 => Self::Right,
            2 => Self::Down,
            _ => Self::Left,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Policy {
    probabilities: [f64; 5],
}

impl Policy {
    pub fn new(probabilities: [f64; 5]) -> Result<Self, PolicyError> {
        if probabilities.iter().any(|value| !value.is_finite()) {
            return Err(PolicyError::NonFiniteProbability);
        }
        if probabilities.iter().any(|&value| value < 0.0) {
            return Err(PolicyError::NegativeProbability);
        }
        let sum: f64 = probabilities.iter().sum();
        if (sum - 1.0).abs() > POLICY_TOLERANCE {
            return Err(PolicyError::NotNormalized { sum });
        }
        // Keep the stored policy and the sampler's effective distribution identical,
        // even when a caller is only within the accepted floating-point tolerance.
        let probabilities = probabilities.map(|probability| probability / sum);
        Ok(Self { probabilities })
    }

    pub const fn probabilities(&self) -> &[f64; 5] {
        &self.probabilities
    }

    fn sample(&self, rng: &mut ChaCha8Rng) -> Action {
        let draw = rng.random::<f64>();
        let mut cumulative = 0.0;
        for (index, probability) in self.probabilities.iter().enumerate() {
            cumulative += probability;
            if draw < cumulative {
                return Action::ALL[index];
            }
        }
        Action::Stay
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PolicyError {
    NonFiniteProbability,
    NegativeProbability,
    NotNormalized { sum: f64 },
}

impl PolicyError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::NonFiniteProbability => "policy_non_finite",
            Self::NegativeProbability => "policy_negative",
            Self::NotNormalized { .. } => "policy_not_normalized",
        }
    }
}

impl fmt::Display for PolicyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonFiniteProbability => write!(formatter, "policy probabilities must be finite"),
            Self::NegativeProbability => {
                write!(formatter, "policy probabilities cannot be negative")
            }
            Self::NotNormalized { sum } => {
                write!(
                    formatter,
                    "policy probabilities must sum to 1, but sum to {sum}"
                )
            }
        }
    }
}

impl std::error::Error for PolicyError {}

impl TryFrom<u8> for Action {
    type Error = SessionError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Up),
            1 => Ok(Self::Right),
            2 => Ok(Self::Down),
            3 => Ok(Self::Left),
            4 => Ok(Self::Stay),
            _ => Err(SessionError::UnknownAction(value)),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum GoalMode {
    Terminate = 0,
    Absorb = 1,
    Continue = 2,
}

impl GoalMode {
    pub const fn code(self) -> u8 {
        self as u8
    }
}

impl TryFrom<u8> for GoalMode {
    type Error = ConfigError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Terminate),
            1 => Ok(Self::Absorb),
            2 => Ok(Self::Continue),
            _ => Err(ConfigError::UnknownGoalMode(value)),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rewards {
    pub default: f64,
    pub boundary: f64,
    pub hazard: f64,
    pub goal: f64,
}

impl Default for Rewards {
    fn default() -> Self {
        Self {
            default: -0.04,
            boundary: -1.0,
            hazard: -1.0,
            goal: 1.0,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct GridWorldConfig {
    pub width: u8,
    pub height: u8,
    pub start: u16,
    pub goal: u16,
    pub goal_mode: GoalMode,
    pub hazards: Vec<u16>,
    pub rewards: Rewards,
    pub slip_probability: f64,
    pub discount: f64,
    pub seed: u64,
}

impl GridWorldConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if !(MIN_SIDE..=MAX_SIDE).contains(&self.width)
            || !(MIN_SIDE..=MAX_SIDE).contains(&self.height)
        {
            return Err(ConfigError::GridSize {
                min: MIN_SIDE,
                max: MAX_SIDE,
            });
        }

        let state_count = self.state_count();
        if self.start >= state_count {
            return Err(ConfigError::StateOutOfBounds {
                field: "start",
                value: self.start,
                state_count,
            });
        }
        if self.goal >= state_count {
            return Err(ConfigError::StateOutOfBounds {
                field: "goal",
                value: self.goal,
                state_count,
            });
        }
        if self.start == self.goal {
            return Err(ConfigError::StartEqualsGoal);
        }

        let mut hazards = self.hazards.clone();
        hazards.sort_unstable();
        if hazards.windows(2).any(|pair| pair[0] == pair[1]) {
            return Err(ConfigError::DuplicateHazard);
        }
        for &hazard in &hazards {
            if hazard >= state_count {
                return Err(ConfigError::StateOutOfBounds {
                    field: "hazard",
                    value: hazard,
                    state_count,
                });
            }
            if hazard == self.start || hazard == self.goal {
                return Err(ConfigError::HazardOverlapsSpecialState(hazard));
            }
        }

        if !self.slip_probability.is_finite() || !(0.0..=1.0).contains(&self.slip_probability) {
            return Err(ConfigError::Probability("slip_probability"));
        }
        if !self.discount.is_finite() || !(0.0..=1.0).contains(&self.discount) {
            return Err(ConfigError::Probability("discount"));
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|value| !value.is_finite())
        {
            return Err(ConfigError::NonFiniteReward);
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|value| value.abs() > MAX_REWARD_MAGNITUDE)
        {
            return Err(ConfigError::RewardMagnitude);
        }

        Ok(())
    }

    pub const fn state_count(&self) -> u16 {
        self.width as u16 * self.height as u16
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfigError {
    GridSize {
        min: u8,
        max: u8,
    },
    StateOutOfBounds {
        field: &'static str,
        value: u16,
        state_count: u16,
    },
    StartEqualsGoal,
    DuplicateHazard,
    HazardOverlapsSpecialState(u16),
    Probability(&'static str),
    NonFiniteReward,
    RewardMagnitude,
    UnknownGoalMode(u8),
}

impl ConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::GridSize { .. } => "grid_size",
            Self::StateOutOfBounds { .. } => "state_out_of_bounds",
            Self::StartEqualsGoal => "start_equals_goal",
            Self::DuplicateHazard => "duplicate_hazard",
            Self::HazardOverlapsSpecialState(_) => "hazard_overlap",
            Self::Probability(_) => "probability_range",
            Self::NonFiniteReward => "non_finite_reward",
            Self::RewardMagnitude => "reward_magnitude",
            Self::UnknownGoalMode(_) => "unknown_goal_mode",
        }
    }
}

impl fmt::Display for ConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::GridSize { min, max } => {
                write!(formatter, "grid sides must be between {min} and {max}")
            }
            Self::StateOutOfBounds {
                field,
                value,
                state_count,
            } => write!(
                formatter,
                "{field} state {value} is outside the {state_count}-state grid"
            ),
            Self::StartEqualsGoal => write!(formatter, "start and goal states must differ"),
            Self::DuplicateHazard => write!(formatter, "hazard states must be unique"),
            Self::HazardOverlapsSpecialState(state) => write!(
                formatter,
                "hazard state {state} overlaps the start or goal state"
            ),
            Self::Probability(field) => {
                write!(formatter, "{field} must be a finite value from 0 to 1")
            }
            Self::NonFiniteReward => write!(formatter, "reward values must be finite"),
            Self::RewardMagnitude => write!(
                formatter,
                "reward magnitude is too large for a {MAX_STEPS}-step return"
            ),
            Self::UnknownGoalMode(mode) => write!(formatter, "unknown goal mode code {mode}"),
        }
    }
}

impl std::error::Error for ConfigError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SessionError {
    EpisodeFinished,
    StepLimitReached,
    UnknownAction(u8),
}

impl SessionError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::EpisodeFinished => "episode_finished",
            Self::StepLimitReached => "step_limit_reached",
            Self::UnknownAction(_) => "unknown_action",
        }
    }
}

impl fmt::Display for SessionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EpisodeFinished => write!(formatter, "the episode has already finished"),
            Self::StepLimitReached => write!(formatter, "the 100-step safety limit was reached"),
            Self::UnknownAction(action) => write!(formatter, "unknown action code {action}"),
        }
    }
}

impl std::error::Error for SessionError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Snapshot {
    pub state: u16,
    pub step_count: u32,
    pub cumulative_return: f64,
    pub discounted_return: f64,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StepOutcome {
    pub previous_state: u16,
    pub requested_action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub reward: f64,
    pub discount_weight: f64,
    pub discounted_contribution: f64,
    pub cumulative_return: f64,
    pub discounted_return: f64,
    pub step_count: u32,
    pub boundary_collision: bool,
    pub slipped: bool,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TransitionOutcome {
    pub requested_action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub probability: f64,
    pub reward: f64,
    pub boundary_collision: bool,
}

#[derive(Debug, Clone)]
pub struct GridWorldSession {
    config: GridWorldConfig,
    state: u16,
    step_count: u32,
    cumulative_return: f64,
    discounted_return: f64,
    done: bool,
    rng: ChaCha8Rng,
    policy_rng: ChaCha8Rng,
}

impl GridWorldSession {
    pub fn new(mut config: GridWorldConfig) -> Result<Self, ConfigError> {
        config.validate()?;
        config.hazards.sort_unstable();
        Ok(Self {
            state: config.start,
            rng: ChaCha8Rng::seed_from_u64(config.seed),
            policy_rng: ChaCha8Rng::seed_from_u64(config.seed ^ POLICY_SEED_XOR),
            config,
            step_count: 0,
            cumulative_return: 0.0,
            discounted_return: 0.0,
            done: false,
        })
    }

    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            state: self.state,
            step_count: self.step_count,
            cumulative_return: self.cumulative_return,
            discounted_return: self.discounted_return,
            done: self.done,
            truncated: !self.done && self.step_count >= MAX_STEPS,
        }
    }

    pub fn reset(&mut self, seed: u64) -> Snapshot {
        self.config.seed = seed;
        self.state = self.config.start;
        self.step_count = 0;
        self.cumulative_return = 0.0;
        self.discounted_return = 0.0;
        self.done = false;
        self.rng = ChaCha8Rng::seed_from_u64(seed);
        self.policy_rng = ChaCha8Rng::seed_from_u64(seed ^ POLICY_SEED_XOR);
        self.snapshot()
    }

    pub fn transition_distribution(&self, requested_action: Action) -> Vec<TransitionOutcome> {
        if self.done {
            return Vec::new();
        }
        if requested_action == Action::Stay {
            return vec![self.model_outcome(requested_action, Action::Stay, 1.0)];
        }

        let slip_share = self.config.slip_probability / 4.0;
        [Action::Up, Action::Right, Action::Down, Action::Left]
            .into_iter()
            .filter_map(|actual_action| {
                let probability = slip_share
                    + if actual_action == requested_action {
                        1.0 - self.config.slip_probability
                    } else {
                        0.0
                    };
                (probability > 0.0)
                    .then(|| self.model_outcome(requested_action, actual_action, probability))
            })
            .collect()
    }

    pub fn transition_model(&self) -> Vec<TransitionOutcome> {
        Action::ALL
            .into_iter()
            .flat_map(|action| self.transition_distribution(action))
            .collect()
    }

    pub fn step_policy(&mut self, policy: &Policy) -> Result<StepOutcome, SessionError> {
        let requested_action = policy.sample(&mut self.policy_rng);
        self.step(requested_action)
    }

    pub fn step(&mut self, requested_action: Action) -> Result<StepOutcome, SessionError> {
        if self.done {
            return Err(SessionError::EpisodeFinished);
        }
        if self.step_count >= MAX_STEPS {
            return Err(SessionError::StepLimitReached);
        }

        let previous_state = self.state;
        let actual_action = self.sample_action(requested_action);
        let slipped = actual_action != requested_action;
        let (next_state, boundary_collision) = self.transition(previous_state, actual_action);
        let reward = self.reward_for(previous_state, next_state, boundary_collision);

        let discount_weight = self.config.discount.powi(self.step_count as i32);
        let discounted_contribution = discount_weight * reward;
        self.state = next_state;
        self.step_count += 1;
        self.cumulative_return += reward;
        self.discounted_return += discounted_contribution;
        self.done = next_state == self.config.goal && self.config.goal_mode == GoalMode::Terminate;

        Ok(StepOutcome {
            previous_state,
            requested_action,
            actual_action,
            next_state,
            reward,
            discount_weight,
            discounted_contribution,
            cumulative_return: self.cumulative_return,
            discounted_return: self.discounted_return,
            step_count: self.step_count,
            boundary_collision,
            slipped,
            done: self.done,
            truncated: !self.done && self.step_count >= MAX_STEPS,
        })
    }

    fn sample_action(&mut self, requested: Action) -> Action {
        if requested == Action::Stay
            || self.config.slip_probability == 0.0
            || self.rng.random::<f64>() >= self.config.slip_probability
        {
            return requested;
        }

        Action::from_cardinal_index(self.rng.random_range(0..4))
    }

    fn model_outcome(
        &self,
        requested_action: Action,
        actual_action: Action,
        probability: f64,
    ) -> TransitionOutcome {
        let (next_state, boundary_collision) = self.transition(self.state, actual_action);
        TransitionOutcome {
            requested_action,
            actual_action,
            next_state,
            probability,
            reward: self.reward_for(self.state, next_state, boundary_collision),
            boundary_collision,
        }
    }

    fn reward_for(&self, previous_state: u16, next_state: u16, boundary_collision: bool) -> f64 {
        if previous_state == self.config.goal && self.config.goal_mode == GoalMode::Absorb {
            0.0
        } else if boundary_collision {
            self.config.rewards.boundary
        } else if next_state == self.config.goal {
            self.config.rewards.goal
        } else if self.config.hazards.binary_search(&next_state).is_ok() {
            self.config.rewards.hazard
        } else {
            self.config.rewards.default
        }
    }

    fn transition(&self, state: u16, action: Action) -> (u16, bool) {
        if state == self.config.goal && self.config.goal_mode == GoalMode::Absorb {
            return (state, false);
        }

        let width = self.config.width as u16;
        let row = state / width;
        let column = state % width;

        let candidate = match action {
            Action::Up if row > 0 => Some(state - width),
            Action::Right if column + 1 < width => Some(state + 1),
            Action::Down if row + 1 < self.config.height as u16 => Some(state + width),
            Action::Left if column > 0 => Some(state - 1),
            Action::Stay => Some(state),
            _ => None,
        };

        match candidate {
            Some(next_state) => (next_state, false),
            None => (state, true),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> GridWorldConfig {
        GridWorldConfig {
            width: 4,
            height: 4,
            start: 0,
            goal: 15,
            goal_mode: GoalMode::Terminate,
            hazards: vec![6, 9],
            rewards: Rewards::default(),
            slip_probability: 0.0,
            discount: 0.9,
            seed: 0x5eed,
        }
    }

    #[test]
    fn rejects_overlapping_special_states() {
        let mut invalid = config();
        invalid.hazards.push(invalid.goal);

        assert_eq!(
            invalid.validate(),
            Err(ConfigError::HazardOverlapsSpecialState(invalid.goal))
        );
    }

    #[test]
    fn rejects_rewards_that_can_overflow_the_bounded_return() {
        let mut invalid = config();
        invalid.rewards.default = MAX_REWARD_MAGNITUDE * 2.0;

        assert_eq!(invalid.validate(), Err(ConfigError::RewardMagnitude));
    }

    #[test]
    fn boundary_collision_stays_in_place_and_is_penalized() {
        let mut session = GridWorldSession::new(config()).expect("valid config");

        let outcome = session.step(Action::Up).expect("active episode");

        assert_eq!(outcome.previous_state, 0);
        assert_eq!(outcome.next_state, 0);
        assert!(outcome.boundary_collision);
        assert_eq!(outcome.reward, -1.0);
    }

    #[test]
    fn hazards_are_accessible_and_receive_the_hazard_reward() {
        let mut session = GridWorldSession::new(config()).expect("valid config");

        session.step(Action::Right).expect("step 1");
        session.step(Action::Right).expect("step 2");
        let outcome = session.step(Action::Down).expect("step 3");

        assert_eq!(outcome.next_state, 6);
        assert_eq!(outcome.reward, -1.0);
        assert!(!outcome.done);
    }

    #[test]
    fn reaching_the_goal_finishes_the_episode() {
        let mut session = GridWorldSession::new(config()).expect("valid config");
        for action in [
            Action::Right,
            Action::Right,
            Action::Right,
            Action::Down,
            Action::Down,
            Action::Down,
        ] {
            session.step(action).expect("path remains active");
        }

        let snapshot = session.snapshot();
        assert_eq!(snapshot.state, 15);
        assert!(snapshot.done);
        assert!(session.transition_model().is_empty());
        assert_eq!(
            session.step(Action::Stay),
            Err(SessionError::EpisodeFinished)
        );
    }

    #[test]
    fn absorbing_goal_self_loops_with_zero_reward() {
        let mut absorbing = config();
        absorbing.goal_mode = GoalMode::Absorb;
        let mut session = GridWorldSession::new(absorbing).expect("valid config");
        for action in [
            Action::Right,
            Action::Right,
            Action::Right,
            Action::Down,
            Action::Down,
            Action::Down,
        ] {
            session.step(action).expect("path remains active");
        }

        assert!(!session.snapshot().done);
        let self_loop = session
            .step(Action::Left)
            .expect("absorbing model continues");
        assert_eq!(self_loop.previous_state, 15);
        assert_eq!(self_loop.next_state, 15);
        assert_eq!(self_loop.reward, 0.0);
        assert!(!self_loop.done);
    }

    #[test]
    fn continuing_goal_allows_the_agent_to_leave() {
        let mut continuing = config();
        continuing.goal_mode = GoalMode::Continue;
        let mut session = GridWorldSession::new(continuing).expect("valid config");
        for action in [
            Action::Right,
            Action::Right,
            Action::Right,
            Action::Down,
            Action::Down,
            Action::Down,
        ] {
            session.step(action).expect("path remains active");
        }

        assert!(!session.snapshot().done);
        let departure = session
            .step(Action::Left)
            .expect("continuing task remains active");
        assert_eq!(departure.previous_state, 15);
        assert_eq!(departure.next_state, 14);
        assert_eq!(departure.reward, -0.04);
    }

    #[test]
    fn seeded_stochastic_transitions_are_reproducible_after_reset() {
        let mut stochastic = config();
        stochastic.slip_probability = 1.0;
        let seed = stochastic.seed;
        let mut session = GridWorldSession::new(stochastic).expect("valid config");
        let requested = [Action::Right, Action::Down, Action::Right, Action::Down];

        let first: Vec<_> = requested
            .iter()
            .map(|&action| {
                let outcome = session.step(action).expect("active episode");
                (outcome.actual_action, outcome.next_state)
            })
            .collect();
        assert_eq!(
            first,
            vec![
                (Action::Up, 0),
                (Action::Right, 1),
                (Action::Left, 0),
                (Action::Down, 4),
            ],
            "the fixed seed is a cross-version replay contract"
        );
        session.reset(seed);
        let second: Vec<_> = requested
            .iter()
            .map(|&action| {
                let outcome = session.step(action).expect("active episode");
                (outcome.actual_action, outcome.next_state)
            })
            .collect();

        assert_eq!(first, second);
    }

    #[test]
    fn discounted_return_uses_reward_time_index() {
        let mut session = GridWorldSession::new(config()).expect("valid config");
        let first = session.step(Action::Right).expect("step 1");
        let second = session.step(Action::Right).expect("step 2");

        assert!((first.discount_weight - 1.0).abs() < 1e-12);
        assert!((first.discounted_contribution - (-0.04)).abs() < 1e-12);
        assert!((second.discount_weight - 0.9).abs() < 1e-12);
        assert!((second.discounted_contribution - (-0.036)).abs() < 1e-12);
        assert!((first.discounted_return - (-0.04)).abs() < 1e-12);
        assert!((second.discounted_return - (-0.04 - 0.9 * 0.04)).abs() < 1e-12);
    }

    #[test]
    fn validates_policy_probabilities() {
        assert!(Policy::new([0.2; 5]).is_ok());
        assert_eq!(
            Policy::new([0.5, 0.5, 0.5, 0.0, -0.5]),
            Err(PolicyError::NegativeProbability)
        );
        assert!(matches!(
            Policy::new([0.1; 5]),
            Err(PolicyError::NotNormalized { .. })
        ));

        let approximately_normalized =
            Policy::new([0.2, 0.2, 0.2, 0.2, 0.2 - 5e-10]).expect("within tolerance");
        let stored_sum: f64 = approximately_normalized.probabilities().iter().sum();
        assert!((stored_sum - 1.0).abs() < f64::EPSILON * 5.0);
        assert!(
            (approximately_normalized.probabilities()[4] - (0.2 - 5e-10) / (1.0 - 5e-10)).abs()
                < 1e-15
        );
    }

    #[test]
    fn transition_distribution_matches_the_slip_rule() {
        let mut stochastic = config();
        stochastic.slip_probability = 0.2;
        let session = GridWorldSession::new(stochastic).expect("valid config");

        let outcomes = session.transition_distribution(Action::Right);
        let probability_sum: f64 = outcomes.iter().map(|outcome| outcome.probability).sum();
        assert!((probability_sum - 1.0).abs() < 1e-12);
        assert_eq!(outcomes.len(), 4);
        assert!((outcomes[1].probability - 0.85).abs() < 1e-12);
        assert_eq!(outcomes[0].next_state, 0);
        assert!(outcomes[0].boundary_collision);
        assert_eq!(outcomes[0].reward, -1.0);
    }

    #[test]
    fn deterministic_transition_distribution_has_one_outcome() {
        let session = GridWorldSession::new(config()).expect("valid config");
        let outcomes = session.transition_distribution(Action::Right);

        assert_eq!(outcomes.len(), 1);
        assert_eq!(outcomes[0].actual_action, Action::Right);
        assert_eq!(outcomes[0].next_state, 1);
        assert_eq!(outcomes[0].probability, 1.0);
    }

    #[test]
    fn policy_sampling_does_not_change_the_environment_rng_stream() {
        let mut stochastic = config();
        stochastic.slip_probability = 1.0;
        let mut policy_session = GridWorldSession::new(stochastic.clone()).expect("valid config");
        let mut direct_session = GridWorldSession::new(stochastic).expect("valid config");
        let always_right = Policy::new([0.0, 1.0, 0.0, 0.0, 0.0]).expect("valid policy");

        let from_policy = policy_session
            .step_policy(&always_right)
            .expect("active episode");
        let direct = direct_session.step(Action::Right).expect("active episode");

        assert_eq!(from_policy.requested_action, Action::Right);
        assert_eq!(from_policy.actual_action, direct.actual_action);
        assert_eq!(from_policy.next_state, direct.next_state);
    }

    #[test]
    fn truncates_at_the_step_safety_limit() {
        let mut session = GridWorldSession::new(config()).expect("valid config");
        let mut final_outcome = None;
        for _ in 0..MAX_STEPS {
            final_outcome = Some(session.step(Action::Stay).expect("within step limit"));
        }

        assert!(final_outcome.expect("one outcome").truncated);
        assert!(session.snapshot().truncated);
        assert_eq!(
            session.step(Action::Stay),
            Err(SessionError::StepLimitReached)
        );
    }
}
