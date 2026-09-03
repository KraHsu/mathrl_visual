//! Tabular temporal-difference learning primitives for Chapter 7.
//!
//! The evaluator deliberately keeps the environment and the learning update in
//! one deterministic, seedable object.  The browser can therefore show the
//! *realised* transition, TD target, error, and updated entry without having to
//! reconstruct a model in JavaScript.  Four closely related algorithms are
//! exposed: state-value TD(0), on-policy SARSA, n-step SARSA, and off-policy
//! Q-learning.

use std::{collections::VecDeque, fmt};

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

use crate::{Action, ConfigError, GoalMode, GridWorldConfig, GridWorldSession, Rewards};

pub const TEMPORAL_DIFFERENCE_STATE_COUNT: usize = 16;
pub const TEMPORAL_DIFFERENCE_ACTION_COUNT: usize = 5;
pub const MAX_TEMPORAL_DIFFERENCE_EPISODES: u32 = 100_000;
pub const MAX_TEMPORAL_DIFFERENCE_STEPS: u32 = 100;
pub const MAX_TEMPORAL_DIFFERENCE_ADVANCE: u32 = 2_000;
pub const MAX_TEMPORAL_DIFFERENCE_N_STEP: u32 = 100;
pub const MAX_TEMPORAL_DIFFERENCE_ALPHA: f64 = 1.0;
pub const MAX_TEMPORAL_DIFFERENCE_EPSILON: f64 = 1.0;
pub const MAX_TEMPORAL_DIFFERENCE_REWARD_MAGNITUDE: f64 = 1_000_000.0;
pub const MAX_TEMPORAL_DIFFERENCE_VALUE_MAGNITUDE: f64 = 1_000_000.0;

const SHARED_GRID_SEED: u64 = 0x5eed;
const ACTION_RNG_XOR: u64 = 0x5444_4143_5449_4f4e;
const EPISODE_RNG_XOR: u64 = 0x4550_4953_4f44_4553;
const TERMINAL_ACTION: u8 = u8::MAX;

/// The tabular TD family used in the Chapter 7 lab.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TemporalDifferenceMode {
    /// Estimate state values with the one-step TD(0) target.
    TdZero,
    /// On-policy one-step action-value learning.
    Sarsa,
    /// On-policy n-step action-value learning.
    NStepSarsa,
    /// Off-policy action-value learning with a greedy bootstrap target.
    QLearning,
}

impl TemporalDifferenceMode {
    pub const ALL: [Self; 4] = [Self::TdZero, Self::Sarsa, Self::NStepSarsa, Self::QLearning];

    pub const fn code(self) -> &'static str {
        match self {
            Self::TdZero => "td_zero",
            Self::Sarsa => "sarsa",
            Self::NStepSarsa => "n_step_sarsa",
            Self::QLearning => "q_learning",
        }
    }

    pub const fn is_action_value(self) -> bool {
        !matches!(self, Self::TdZero)
    }
}

impl TryFrom<&str> for TemporalDifferenceMode {
    type Error = TemporalDifferenceModeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "td" | "td0" | "td_zero" | "td-zero" | "state_td" | "state-value" => Ok(Self::TdZero),
            "sarsa" | "on_policy" | "on-policy" => Ok(Self::Sarsa),
            "n_step" | "n-step" | "n_step_sarsa" | "n-step-sarsa" | "nstepsarsa" => {
                Ok(Self::NStepSarsa)
            }
            "q" | "q_learning" | "q-learning" | "qlearning" => Ok(Self::QLearning),
            _ => Err(TemporalDifferenceModeError::Unknown(value.to_owned())),
        }
    }
}

impl TryFrom<String> for TemporalDifferenceMode {
    type Error = TemporalDifferenceModeError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TemporalDifferenceModeError {
    Unknown(String),
}

impl TemporalDifferenceModeError {
    pub const fn code(&self) -> &'static str {
        "temporal_difference_mode"
    }
}

impl fmt::Display for TemporalDifferenceModeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => write!(formatter, "unknown temporal-difference mode {value}"),
        }
    }
}

impl std::error::Error for TemporalDifferenceModeError {}

/// Configuration shared by all tabular TD algorithms.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TemporalDifferenceConfig {
    pub mode: TemporalDifferenceMode,
    pub discount: f64,
    pub slip_probability: f64,
    pub epsilon: f64,
    pub alpha: f64,
    pub n_step: u32,
    pub max_episodes: u32,
    pub max_steps: u32,
    pub seed: u64,
    pub rewards: Rewards,
}

impl Default for TemporalDifferenceConfig {
    fn default() -> Self {
        Self {
            mode: TemporalDifferenceMode::Sarsa,
            discount: 0.9,
            slip_probability: 0.0,
            epsilon: 0.1,
            alpha: 0.1,
            n_step: 3,
            max_episodes: 100,
            max_steps: 40,
            seed: SHARED_GRID_SEED,
            rewards: Rewards {
                default: -1.0,
                boundary: -10.0,
                hazard: -10.0,
                goal: 0.0,
            },
        }
    }
}

impl TemporalDifferenceConfig {
    pub fn validate(&self) -> Result<(), TemporalDifferenceConfigError> {
        if !self.discount.is_finite() || !(0.0..=1.0).contains(&self.discount) {
            return Err(TemporalDifferenceConfigError::Discount);
        }
        if !self.slip_probability.is_finite() || !(0.0..=1.0).contains(&self.slip_probability) {
            return Err(TemporalDifferenceConfigError::SlipProbability);
        }
        if !self.epsilon.is_finite()
            || !(0.0..=MAX_TEMPORAL_DIFFERENCE_EPSILON).contains(&self.epsilon)
        {
            return Err(TemporalDifferenceConfigError::Epsilon);
        }
        if !self.alpha.is_finite()
            || !(0.0..=MAX_TEMPORAL_DIFFERENCE_ALPHA).contains(&self.alpha)
            || self.alpha <= 0.0
        {
            return Err(TemporalDifferenceConfigError::Alpha);
        }
        if !(1..=MAX_TEMPORAL_DIFFERENCE_N_STEP).contains(&self.n_step) {
            return Err(TemporalDifferenceConfigError::NStep);
        }
        if !(1..=MAX_TEMPORAL_DIFFERENCE_EPISODES).contains(&self.max_episodes) {
            return Err(TemporalDifferenceConfigError::MaxEpisodes);
        }
        if !(1..=MAX_TEMPORAL_DIFFERENCE_STEPS).contains(&self.max_steps) {
            return Err(TemporalDifferenceConfigError::MaxSteps);
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|reward| {
            !reward.is_finite() || reward.abs() > MAX_TEMPORAL_DIFFERENCE_REWARD_MAGNITUDE
        }) {
            return Err(TemporalDifferenceConfigError::Reward);
        }
        self.grid_world_config()
            .validate()
            .map_err(TemporalDifferenceConfigError::World)
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
            seed: self.seed,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TemporalDifferenceConfigError {
    Discount,
    SlipProbability,
    Epsilon,
    Alpha,
    NStep,
    MaxEpisodes,
    MaxSteps,
    Reward,
    World(ConfigError),
}

impl TemporalDifferenceConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Discount => "temporal_difference_discount_range",
            Self::SlipProbability => "temporal_difference_slip_range",
            Self::Epsilon => "temporal_difference_epsilon_range",
            Self::Alpha => "temporal_difference_alpha_range",
            Self::NStep => "temporal_difference_n_step_range",
            Self::MaxEpisodes => "temporal_difference_max_episodes_range",
            Self::MaxSteps => "temporal_difference_max_steps_range",
            Self::Reward => "temporal_difference_reward_range",
            Self::World(error) => error.code(),
        }
    }
}

impl fmt::Display for TemporalDifferenceConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discount => write!(formatter, "discount must be finite and in [0, 1]"),
            Self::SlipProbability => {
                write!(formatter, "slip probability must be finite and in [0, 1]")
            }
            Self::Epsilon => write!(formatter, "epsilon must be finite and in [0, 1]"),
            Self::Alpha => write!(formatter, "alpha must be finite and in (0, 1]"),
            Self::NStep => write!(
                formatter,
                "n_step must be between 1 and {MAX_TEMPORAL_DIFFERENCE_N_STEP}"
            ),
            Self::MaxEpisodes => write!(
                formatter,
                "max_episodes must be between 1 and {MAX_TEMPORAL_DIFFERENCE_EPISODES}"
            ),
            Self::MaxSteps => write!(
                formatter,
                "max_steps must be between 1 and {MAX_TEMPORAL_DIFFERENCE_STEPS}"
            ),
            Self::Reward => write!(formatter, "rewards must be finite and bounded"),
            Self::World(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for TemporalDifferenceConfigError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TemporalDifferenceError {
    InvalidConfig(TemporalDifferenceConfigError),
    Exhausted,
    EpisodeFinished,
    Numerical,
}

impl TemporalDifferenceError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::InvalidConfig(error) => error.code(),
            Self::Exhausted => "temporal_difference_exhausted",
            Self::EpisodeFinished => "temporal_difference_episode_finished",
            Self::Numerical => "temporal_difference_non_finite",
        }
    }
}

impl fmt::Display for TemporalDifferenceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidConfig(error) => error.fmt(formatter),
            Self::Exhausted => write!(formatter, "the configured episode budget is exhausted"),
            Self::EpisodeFinished => write!(formatter, "the current episode has finished"),
            Self::Numerical => write!(formatter, "the update produced a non-finite value"),
        }
    }
}

impl std::error::Error for TemporalDifferenceError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TemporalDifferenceTransition {
    pub episode_step: u32,
    pub state: u16,
    pub action: Action,
    pub actual_action: Action,
    pub next_state: u16,
    pub reward: f64,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TemporalDifferenceUpdate {
    pub episode: u32,
    pub index: u32,
    pub state: u16,
    pub action: u8,
    pub old_value: f64,
    pub new_value: f64,
    pub target: f64,
    pub td_error: f64,
    pub n_step_return: f64,
    pub bootstrap_state: u16,
    pub bootstrap_action: u8,
    pub bootstrap_value: f64,
    pub terminal: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TemporalDifferenceEpisode {
    pub number: u32,
    pub steps: Vec<TemporalDifferenceTransition>,
    pub updates: Vec<TemporalDifferenceUpdate>,
    pub total_return: f64,
    pub discounted_return: f64,
    pub length: u32,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TemporalDifferenceSnapshot {
    pub mode: TemporalDifferenceMode,
    pub episode_count: u32,
    pub total_steps: u64,
    pub values: [f64; TEMPORAL_DIFFERENCE_STATE_COUNT],
    pub action_values: [[f64; TEMPORAL_DIFFERENCE_ACTION_COUNT]; TEMPORAL_DIFFERENCE_STATE_COUNT],
    pub policy: [u8; TEMPORAL_DIFFERENCE_STATE_COUNT],
    pub policy_probabilities:
        [[f64; TEMPORAL_DIFFERENCE_ACTION_COUNT]; TEMPORAL_DIFFERENCE_STATE_COUNT],
    pub last_state: u16,
    pub last_action: u8,
    pub last_target: f64,
    pub last_td_error: f64,
    pub last_update: Option<TemporalDifferenceUpdate>,
    pub episode_return_mean: f64,
    pub episode_return_variance: f64,
    pub converged: bool,
    pub truncated: bool,
    pub exhausted: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TemporalDifferenceOutcome {
    pub snapshot: TemporalDifferenceSnapshot,
    pub transition: TemporalDifferenceTransition,
    pub updates: Vec<TemporalDifferenceUpdate>,
    pub episode: Option<TemporalDifferenceEpisode>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TemporalDifferenceAdvanceOutcome {
    pub snapshot: TemporalDifferenceSnapshot,
    pub transitions: Vec<TemporalDifferenceTransition>,
    pub updates: Vec<TemporalDifferenceUpdate>,
    pub episodes: Vec<TemporalDifferenceEpisode>,
}

#[derive(Debug, Clone, Copy)]
struct PendingTransition {
    transition: TemporalDifferenceTransition,
    next_action: Action,
}

/// A deterministic tabular TD evaluator over the shared 4×4 Grid World.
#[derive(Debug, Clone)]
pub struct TemporalDifferenceEvaluator {
    config: TemporalDifferenceConfig,
    environment: GridWorldSession,
    action_rng: ChaCha8Rng,
    episode_rng: ChaCha8Rng,
    values: [f64; TEMPORAL_DIFFERENCE_STATE_COUNT],
    action_values: [[f64; TEMPORAL_DIFFERENCE_ACTION_COUNT]; TEMPORAL_DIFFERENCE_STATE_COUNT],
    episode_count: u32,
    total_steps: u64,
    episode_return_sum: f64,
    episode_return_square_sum: f64,
    current_action: Action,
    episode_steps: Vec<TemporalDifferenceTransition>,
    pending: VecDeque<PendingTransition>,
    history: VecDeque<TemporalDifferenceUpdate>,
    last_update: Option<TemporalDifferenceUpdate>,
    last_target: f64,
    last_td_error: f64,
}

impl TemporalDifferenceEvaluator {
    pub fn new(config: TemporalDifferenceConfig) -> Result<Self, TemporalDifferenceError> {
        config
            .validate()
            .map_err(TemporalDifferenceError::InvalidConfig)?;
        let world = config.grid_world_config();
        let environment = GridWorldSession::new(world)
            .map_err(TemporalDifferenceConfigError::World)
            .map_err(TemporalDifferenceError::InvalidConfig)?;
        let mut evaluator = Self {
            config,
            environment,
            action_rng: ChaCha8Rng::seed_from_u64(config.seed ^ ACTION_RNG_XOR),
            episode_rng: ChaCha8Rng::seed_from_u64(config.seed ^ EPISODE_RNG_XOR),
            values: [0.0; TEMPORAL_DIFFERENCE_STATE_COUNT],
            action_values: [[0.0; TEMPORAL_DIFFERENCE_ACTION_COUNT];
                TEMPORAL_DIFFERENCE_STATE_COUNT],
            episode_count: 0,
            total_steps: 0,
            episode_return_sum: 0.0,
            episode_return_square_sum: 0.0,
            current_action: Action::Up,
            episode_steps: Vec::new(),
            pending: VecDeque::new(),
            history: VecDeque::with_capacity(4096),
            last_update: None,
            last_target: 0.0,
            last_td_error: 0.0,
        };
        evaluator.current_action = evaluator.select_action(0);
        Ok(evaluator)
    }

    pub const fn config(&self) -> TemporalDifferenceConfig {
        self.config
    }

    pub fn snapshot(&self) -> TemporalDifferenceSnapshot {
        let mut values = self.values;
        let mut policy = [TERMINAL_ACTION; TEMPORAL_DIFFERENCE_STATE_COUNT];
        let mut probabilities =
            [[0.0; TEMPORAL_DIFFERENCE_ACTION_COUNT]; TEMPORAL_DIFFERENCE_STATE_COUNT];
        if self.config.mode.is_action_value() {
            for (value, row) in values.iter_mut().zip(self.action_values.iter()) {
                *value = row.iter().copied().fold(f64::NEG_INFINITY, f64::max);
            }
        }
        for state in 0..TEMPORAL_DIFFERENCE_STATE_COUNT {
            if state == TEMPORAL_DIFFERENCE_STATE_COUNT - 1 {
                continue;
            }
            let row = if self.config.mode == TemporalDifferenceMode::TdZero {
                [values[state]; TEMPORAL_DIFFERENCE_ACTION_COUNT]
            } else {
                self.action_values[state]
            };
            let greedy = greedy_action(&row);
            policy[state] = greedy as u8;
            probabilities[state] = epsilon_greedy_probabilities(greedy, self.config.epsilon);
        }
        let mean = if self.episode_count == 0 {
            0.0
        } else {
            self.episode_return_sum / f64::from(self.episode_count)
        };
        let variance = if self.episode_count == 0 {
            0.0
        } else {
            (self.episode_return_square_sum / f64::from(self.episode_count) - mean * mean).max(0.0)
        };
        let exhausted = self.episode_count >= self.config.max_episodes;
        TemporalDifferenceSnapshot {
            mode: self.config.mode,
            episode_count: self.episode_count,
            total_steps: self.total_steps,
            values,
            action_values: self.action_values,
            policy,
            policy_probabilities: probabilities,
            last_state: self.last_update.map(|update| update.state).unwrap_or(0),
            last_action: self
                .last_update
                .map(|update| update.action)
                .unwrap_or(TERMINAL_ACTION),
            last_target: self.last_target,
            last_td_error: self.last_td_error,
            last_update: self.last_update,
            episode_return_mean: mean,
            episode_return_variance: variance,
            converged: self
                .last_update
                .is_some_and(|update| update.td_error.abs() < 1e-3),
            truncated: self
                .episode_steps
                .last()
                .is_some_and(|transition| transition.truncated),
            exhausted,
        }
    }

    /// Perform one environment transition and all updates that become due.
    pub fn step(&mut self) -> Result<TemporalDifferenceOutcome, TemporalDifferenceError> {
        if self.episode_count >= self.config.max_episodes {
            return Err(TemporalDifferenceError::Exhausted);
        }
        let state = self.environment.snapshot().state;
        let action = if self.config.mode == TemporalDifferenceMode::TdZero {
            self.select_action(state)
        } else {
            self.current_action
        };
        let outcome = self
            .environment
            .step(action)
            .map_err(|_| TemporalDifferenceError::EpisodeFinished)?;
        // GridWorld has a conservative global safety cap of 100 steps.  The
        // chapter control can request a shorter educational episode, so mark
        // that boundary as truncated in the TD trace as well.
        let truncated = outcome.truncated || outcome.step_count >= self.config.max_steps;
        let transition = TemporalDifferenceTransition {
            episode_step: outcome.step_count - 1,
            state: outcome.previous_state,
            action: outcome.requested_action,
            actual_action: outcome.actual_action,
            next_state: outcome.next_state,
            reward: outcome.reward,
            done: outcome.done,
            truncated,
        };
        self.total_steps += 1;
        self.episode_steps.push(transition);
        let next_action = if outcome.done || truncated {
            Action::Stay
        } else {
            self.select_action(outcome.next_state)
        };
        let mut updates = Vec::new();
        match self.config.mode {
            TemporalDifferenceMode::TdZero => {
                updates.push(self.apply_state_update(transition)?);
            }
            TemporalDifferenceMode::Sarsa => {
                updates.push(self.apply_action_update(transition, next_action, false)?);
            }
            TemporalDifferenceMode::QLearning => {
                updates.push(self.apply_action_update(transition, next_action, true)?);
            }
            TemporalDifferenceMode::NStepSarsa => {
                self.pending.push_back(PendingTransition {
                    transition,
                    next_action,
                });
                if self.pending.len() >= self.config.n_step as usize
                    && let Some(update) = self.apply_n_step_update(self.config.n_step as usize)?
                {
                    updates.push(update);
                }
                if outcome.done || truncated {
                    while !self.pending.is_empty() {
                        if let Some(update) = self.apply_n_step_update(self.pending.len())? {
                            updates.push(update);
                        }
                    }
                }
            }
        }
        self.last_update = updates.last().copied().or(self.last_update);
        self.last_target = updates
            .last()
            .map(|update| update.target)
            .unwrap_or(self.last_target);
        self.last_td_error = updates
            .last()
            .map(|update| update.td_error)
            .unwrap_or(self.last_td_error);
        let episode = if outcome.done || truncated {
            Some(self.finish_episode(outcome.done, truncated))
        } else {
            self.current_action = next_action;
            None
        };
        Ok(TemporalDifferenceOutcome {
            snapshot: self.snapshot(),
            transition,
            updates,
            episode,
        })
    }

    /// Advance by at most [`MAX_TEMPORAL_DIFFERENCE_ADVANCE`] transitions.
    pub fn advance(
        &mut self,
        transitions: u32,
    ) -> Result<TemporalDifferenceAdvanceOutcome, TemporalDifferenceError> {
        let requested = transitions.clamp(1, MAX_TEMPORAL_DIFFERENCE_ADVANCE);
        let mut transition_rows = Vec::new();
        let mut updates = Vec::new();
        let mut episodes = Vec::new();
        for _ in 0..requested {
            if self.episode_count >= self.config.max_episodes {
                break;
            }
            let outcome = self.step()?;
            transition_rows.push(outcome.transition);
            updates.extend(outcome.updates);
            if let Some(episode) = outcome.episode {
                episodes.push(episode);
            }
            if self.episode_count >= self.config.max_episodes {
                break;
            }
        }
        Ok(TemporalDifferenceAdvanceOutcome {
            snapshot: self.snapshot(),
            transitions: transition_rows,
            updates,
            episodes,
        })
    }

    pub fn run_to_completion(
        &mut self,
    ) -> Result<TemporalDifferenceAdvanceOutcome, TemporalDifferenceError> {
        let mut all_transitions = Vec::new();
        let mut all_updates = Vec::new();
        let mut all_episodes = Vec::new();
        while self.episode_count < self.config.max_episodes {
            let outcome = self.advance(MAX_TEMPORAL_DIFFERENCE_ADVANCE)?;
            all_transitions.extend(outcome.transitions);
            all_updates.extend(outcome.updates);
            all_episodes.extend(outcome.episodes);
            if all_transitions.is_empty() {
                break;
            }
        }
        Ok(TemporalDifferenceAdvanceOutcome {
            snapshot: self.snapshot(),
            transitions: all_transitions,
            updates: all_updates,
            episodes: all_episodes,
        })
    }

    pub fn reset(&mut self, seed: Option<u64>) -> TemporalDifferenceSnapshot {
        let next_seed = seed.unwrap_or(self.config.seed);
        self.config.seed = next_seed;
        // The environment's config is private, so reset is enough to rewind
        // its state and random stream.  Independent streams keep action and
        // wind draws reproducible even when an algorithm changes its policy.
        self.environment.reset(next_seed);
        self.action_rng = ChaCha8Rng::seed_from_u64(next_seed ^ ACTION_RNG_XOR);
        self.episode_rng = ChaCha8Rng::seed_from_u64(next_seed ^ EPISODE_RNG_XOR);
        self.values = [0.0; TEMPORAL_DIFFERENCE_STATE_COUNT];
        self.action_values =
            [[0.0; TEMPORAL_DIFFERENCE_ACTION_COUNT]; TEMPORAL_DIFFERENCE_STATE_COUNT];
        self.episode_count = 0;
        self.total_steps = 0;
        self.episode_return_sum = 0.0;
        self.episode_return_square_sum = 0.0;
        self.current_action = self.select_action(0);
        self.episode_steps.clear();
        self.pending.clear();
        self.history.clear();
        self.last_update = None;
        self.last_target = 0.0;
        self.last_td_error = 0.0;
        self.snapshot()
    }

    pub fn episode_count(&self) -> u32 {
        self.episode_count
    }

    pub fn last_episode_step(&self) -> u32 {
        self.episode_steps.len() as u32
    }

    pub fn history(&self) -> impl Iterator<Item = &TemporalDifferenceUpdate> {
        self.history.iter()
    }

    fn apply_state_update(
        &mut self,
        transition: TemporalDifferenceTransition,
    ) -> Result<TemporalDifferenceUpdate, TemporalDifferenceError> {
        let old_value = self.values[transition.state as usize];
        let bootstrap = if transition.done || transition.truncated {
            0.0
        } else {
            self.values[transition.next_state as usize]
        };
        let target = transition.reward + self.config.discount * bootstrap;
        let td_error = target - old_value;
        let new_value = bounded(old_value + self.config.alpha * td_error)?;
        self.values[transition.state as usize] = new_value;
        let update = TemporalDifferenceUpdate {
            episode: self.episode_count + 1,
            index: transition.episode_step,
            state: transition.state,
            action: TERMINAL_ACTION,
            old_value,
            new_value,
            target,
            td_error,
            n_step_return: target,
            bootstrap_state: transition.next_state,
            bootstrap_action: TERMINAL_ACTION,
            bootstrap_value: bootstrap,
            terminal: transition.done || transition.truncated,
        };
        self.push_history(update);
        Ok(update)
    }

    fn apply_action_update(
        &mut self,
        transition: TemporalDifferenceTransition,
        next_action: Action,
        q_learning: bool,
    ) -> Result<TemporalDifferenceUpdate, TemporalDifferenceError> {
        let state = transition.state as usize;
        let action = transition.action as usize;
        let old_value = self.action_values[state][action];
        let bootstrap = if transition.done || transition.truncated {
            0.0
        } else if q_learning {
            self.action_values[transition.next_state as usize]
                .iter()
                .copied()
                .fold(f64::NEG_INFINITY, f64::max)
        } else {
            self.action_values[transition.next_state as usize][next_action as usize]
        };
        let target = transition.reward + self.config.discount * bootstrap;
        let td_error = target - old_value;
        let new_value = bounded(old_value + self.config.alpha * td_error)?;
        self.action_values[state][action] = new_value;
        let update = TemporalDifferenceUpdate {
            episode: self.episode_count + 1,
            index: transition.episode_step,
            state: transition.state,
            action: transition.action as u8,
            old_value,
            new_value,
            target,
            td_error,
            n_step_return: target,
            bootstrap_state: transition.next_state,
            bootstrap_action: if transition.done || transition.truncated {
                TERMINAL_ACTION
            } else {
                next_action as u8
            },
            bootstrap_value: bootstrap,
            terminal: transition.done || transition.truncated,
        };
        self.push_history(update);
        Ok(update)
    }

    fn apply_n_step_update(
        &mut self,
        horizon: usize,
    ) -> Result<Option<TemporalDifferenceUpdate>, TemporalDifferenceError> {
        let Some(front) = self.pending.front().copied() else {
            return Ok(None);
        };
        let horizon = horizon.max(1).min(self.pending.len());
        let mut return_value = 0.0;
        let mut discount_power = 1.0;
        let mut terminal = false;
        let mut bootstrap_state = front.transition.next_state;
        let mut bootstrap_action = front.next_action as u8;
        for item in self.pending.iter().take(horizon) {
            return_value += discount_power * item.transition.reward;
            bootstrap_state = item.transition.next_state;
            bootstrap_action = item.next_action as u8;
            discount_power *= self.config.discount;
            if item.transition.done || item.transition.truncated {
                terminal = true;
                break;
            }
        }
        let bootstrap = if terminal {
            0.0
        } else {
            let action = Action::try_from(bootstrap_action).unwrap_or(Action::Stay);
            self.action_values[bootstrap_state as usize][action as usize]
        };
        return_value += discount_power * bootstrap;
        let state = front.transition.state as usize;
        let action = front.transition.action as usize;
        let old_value = self.action_values[state][action];
        let td_error = return_value - old_value;
        let new_value = bounded(old_value + self.config.alpha * td_error)?;
        self.action_values[state][action] = new_value;
        let update = TemporalDifferenceUpdate {
            episode: self.episode_count + 1,
            index: front.transition.episode_step,
            state: front.transition.state,
            action: front.transition.action as u8,
            old_value,
            new_value,
            target: return_value,
            td_error,
            n_step_return: return_value,
            bootstrap_state,
            bootstrap_action: if terminal {
                TERMINAL_ACTION
            } else {
                bootstrap_action
            },
            bootstrap_value: bootstrap,
            terminal,
        };
        self.pending.pop_front();
        self.push_history(update);
        Ok(Some(update))
    }

    fn finish_episode(&mut self, done: bool, truncated: bool) -> TemporalDifferenceEpisode {
        let snapshot = self.environment.snapshot();
        let episode = TemporalDifferenceEpisode {
            number: self.episode_count + 1,
            steps: std::mem::take(&mut self.episode_steps),
            updates: self.last_episode_updates().collect(),
            total_return: snapshot.cumulative_return,
            discounted_return: snapshot.discounted_return,
            length: snapshot.step_count,
            done,
            truncated,
        };
        self.episode_count += 1;
        self.episode_return_sum += episode.total_return;
        self.episode_return_square_sum += episode.total_return * episode.total_return;
        self.pending.clear();
        if self.episode_count < self.config.max_episodes {
            let next_seed = self.episode_rng.random::<u64>();
            self.environment.reset(next_seed);
            self.current_action = self.select_action(self.environment.snapshot().state);
        }
        episode
    }

    fn last_episode_updates(&self) -> impl Iterator<Item = TemporalDifferenceUpdate> + '_ {
        // `history` is bounded; return rows for the current episode only.
        self.history
            .iter()
            .copied()
            .filter(move |update| update.episode == self.episode_count + 1)
    }

    fn push_history(&mut self, update: TemporalDifferenceUpdate) {
        const HISTORY_LIMIT: usize = 8_192;
        if self.history.len() >= HISTORY_LIMIT {
            self.history.pop_front();
        }
        self.history.push_back(update);
    }

    fn select_action(&mut self, state: u16) -> Action {
        if state as usize >= TEMPORAL_DIFFERENCE_STATE_COUNT - 1 {
            return Action::Stay;
        }
        let row = if self.config.mode == TemporalDifferenceMode::TdZero {
            [self.values[state as usize]; TEMPORAL_DIFFERENCE_ACTION_COUNT]
        } else {
            self.action_values[state as usize]
        };
        let greedy = greedy_action(&row);
        if self.action_rng.random::<f64>() < self.config.epsilon {
            Action::ALL[self
                .action_rng
                .random_range(0..TEMPORAL_DIFFERENCE_ACTION_COUNT)]
        } else {
            greedy
        }
    }
}

fn greedy_action(row: &[f64; TEMPORAL_DIFFERENCE_ACTION_COUNT]) -> Action {
    let mut best = 0usize;
    let mut best_value = row[0];
    for (index, value) in row.iter().enumerate().skip(1) {
        // Stable lowest-index tie breaking makes seeded traces easy to audit.
        if *value > best_value {
            best = index;
            best_value = *value;
        }
    }
    Action::ALL[best]
}

fn epsilon_greedy_probabilities(
    greedy: Action,
    epsilon: f64,
) -> [f64; TEMPORAL_DIFFERENCE_ACTION_COUNT] {
    let exploratory = epsilon / TEMPORAL_DIFFERENCE_ACTION_COUNT as f64;
    let mut probabilities = [exploratory; TEMPORAL_DIFFERENCE_ACTION_COUNT];
    probabilities[greedy as usize] += 1.0 - epsilon;
    probabilities
}

fn bounded(value: f64) -> Result<f64, TemporalDifferenceError> {
    if !value.is_finite() {
        return Err(TemporalDifferenceError::Numerical);
    }
    Ok(value.clamp(
        -MAX_TEMPORAL_DIFFERENCE_VALUE_MAGNITUDE,
        MAX_TEMPORAL_DIFFERENCE_VALUE_MAGNITUDE,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(mode: TemporalDifferenceMode) -> TemporalDifferenceConfig {
        TemporalDifferenceConfig {
            mode,
            max_episodes: 3,
            max_steps: 8,
            epsilon: 0.0,
            slip_probability: 0.0,
            ..TemporalDifferenceConfig::default()
        }
    }

    #[test]
    fn td_zero_updates_only_visited_state() {
        let mut evaluator =
            TemporalDifferenceEvaluator::new(config(TemporalDifferenceMode::TdZero)).unwrap();
        let before = evaluator.snapshot().values;
        let outcome = evaluator.step().unwrap();
        let after = outcome.snapshot.values;
        assert_ne!(
            before[outcome.transition.state as usize],
            after[outcome.transition.state as usize]
        );
        for state in 0..TEMPORAL_DIFFERENCE_STATE_COUNT {
            if state != outcome.transition.state as usize {
                assert_eq!(before[state], after[state]);
            }
        }
        assert_eq!(outcome.updates.len(), 1);
        assert!(
            (outcome.updates[0].target
                - (outcome.transition.reward
                    + 0.9 * before[outcome.transition.next_state as usize]))
                .abs()
                < 1e-12
        );
    }

    #[test]
    fn q_learning_and_sarsa_are_replayable() {
        let mut first =
            TemporalDifferenceEvaluator::new(config(TemporalDifferenceMode::QLearning)).unwrap();
        let mut second =
            TemporalDifferenceEvaluator::new(config(TemporalDifferenceMode::QLearning)).unwrap();
        let a = first.advance(20).unwrap();
        let b = second.advance(20).unwrap();
        assert_eq!(a.transitions, b.transitions);
        assert_eq!(a.updates, b.updates);
        assert_eq!(a.snapshot.action_values, b.snapshot.action_values);
    }

    #[test]
    fn n_step_one_has_one_update_per_transition() {
        let mut cfg = config(TemporalDifferenceMode::NStepSarsa);
        cfg.n_step = 1;
        let mut evaluator = TemporalDifferenceEvaluator::new(cfg).unwrap();
        let outcome = evaluator.advance(7).unwrap();
        assert_eq!(outcome.transitions.len(), outcome.updates.len());
    }

    #[test]
    fn finite_budget_reports_exhaustion() {
        let mut evaluator =
            TemporalDifferenceEvaluator::new(config(TemporalDifferenceMode::TdZero)).unwrap();
        evaluator.run_to_completion().unwrap();
        assert!(evaluator.snapshot().exhausted);
        assert_eq!(evaluator.snapshot().episode_count, 3);
    }

    #[test]
    fn rejects_invalid_alpha() {
        let mut cfg = config(TemporalDifferenceMode::Sarsa);
        cfg.alpha = 0.0;
        let error = TemporalDifferenceEvaluator::new(cfg).unwrap_err();
        assert_eq!(error.code(), "temporal_difference_alpha_range");
    }
}
