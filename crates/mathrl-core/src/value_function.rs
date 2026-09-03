//! Value-function approximation primitives for Chapter 8.
//!
//! This module intentionally uses small, transparent linear features so every
//! number in the browser can be audited.  `DeepQ` adds the two mechanisms that
//! matter pedagogically (a replay buffer and a lagged target network) while
//! keeping the network a bounded linear surrogate; it is not presented as a
//! general deep-learning framework.

use std::{collections::VecDeque, fmt};

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

use crate::{Action, ConfigError, GoalMode, GridWorldConfig, GridWorldSession, Rewards};

pub const VALUE_FUNCTION_STATE_COUNT: usize = 16;
pub const VALUE_FUNCTION_ACTION_COUNT: usize = 5;
pub const VALUE_FUNCTION_MAX_FEATURES: usize = 16;
pub const MAX_VALUE_FUNCTION_EPISODES: u32 = 100_000;
pub const MAX_VALUE_FUNCTION_STEPS: u32 = 100;
pub const MAX_VALUE_FUNCTION_ADVANCE: u32 = 2_000;
pub const MAX_VALUE_FUNCTION_ALPHA: f64 = 1.0;
pub const MAX_VALUE_FUNCTION_EPSILON: f64 = 1.0;
pub const MAX_VALUE_FUNCTION_REPLAY_CAPACITY: u32 = 10_000;
pub const MAX_VALUE_FUNCTION_BATCH_SIZE: u32 = 256;
pub const MAX_VALUE_FUNCTION_TARGET_INTERVAL: u32 = 10_000;
pub const MAX_VALUE_FUNCTION_MAGNITUDE: f64 = 1_000_000.0;

const SHARED_GRID_SEED: u64 = 0x5eed;
const ACTION_RNG_XOR: u64 = 0x5641_4c55_455f_4143;
const EPISODE_RNG_XOR: u64 = 0x5641_4c55_455f_4550;
const REPLAY_RNG_XOR: u64 = 0x5641_4c55_455f_5250;
const TERMINAL_ACTION: u8 = u8::MAX;

/// Value-function algorithms exposed by the Chapter 8 lab.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ValueFunctionMode {
    /// State-value TD with a linear feature vector.
    TdLinear,
    /// Action-value SARSA with a linear feature vector.
    SarsaLinear,
    /// Action-value Q-learning with a linear feature vector.
    QLearningLinear,
    /// A bounded teaching surrogate for deep Q-learning with replay and a
    /// target-network update interval.
    DeepQ,
}

impl ValueFunctionMode {
    pub const ALL: [Self; 4] = [
        Self::TdLinear,
        Self::SarsaLinear,
        Self::QLearningLinear,
        Self::DeepQ,
    ];

    pub const fn code(self) -> &'static str {
        match self {
            Self::TdLinear => "td_linear",
            Self::SarsaLinear => "sarsa_linear",
            Self::QLearningLinear => "q_learning_linear",
            Self::DeepQ => "deep_q",
        }
    }

    pub const fn is_action_value(self) -> bool {
        !matches!(self, Self::TdLinear)
    }
}

impl TryFrom<&str> for ValueFunctionMode {
    type Error = ValueFunctionModeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "td" | "td_linear" | "td-linear" | "state_td" | "state-value" => Ok(Self::TdLinear),
            "sarsa" | "sarsa_linear" | "sarsa-linear" => Ok(Self::SarsaLinear),
            "q" | "q_learning" | "q-learning" | "q_learning_linear" | "q-learning-linear" => {
                Ok(Self::QLearningLinear)
            }
            "deep_q" | "deep-q" | "dqn" | "deep_q_learning" | "deep-q-learning" => Ok(Self::DeepQ),
            _ => Err(ValueFunctionModeError::Unknown(value.to_owned())),
        }
    }
}

impl TryFrom<String> for ValueFunctionMode {
    type Error = ValueFunctionModeError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValueFunctionModeError {
    Unknown(String),
}

impl ValueFunctionModeError {
    pub const fn code(&self) -> &'static str {
        "value_function_mode"
    }
}

impl fmt::Display for ValueFunctionModeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => write!(formatter, "unknown value-function mode {value}"),
        }
    }
}

impl std::error::Error for ValueFunctionModeError {}

/// Feature vectors used by the lab.  All maps are deterministic functions of
/// the 4×4 cell coordinates; no learned state is hidden in the feature map.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FeatureMap {
    Coordinates,
    BiasCoordinates,
    Polynomial,
    Fourier,
    OneHot,
}

impl FeatureMap {
    pub const ALL: [Self; 5] = [
        Self::Coordinates,
        Self::BiasCoordinates,
        Self::Polynomial,
        Self::Fourier,
        Self::OneHot,
    ];

    pub const fn code(self) -> &'static str {
        match self {
            Self::Coordinates => "coordinates",
            Self::BiasCoordinates => "bias_coordinates",
            Self::Polynomial => "polynomial",
            Self::Fourier => "fourier",
            Self::OneHot => "one_hot",
        }
    }

    pub const fn feature_count(self) -> usize {
        match self {
            Self::Coordinates => 2,
            Self::BiasCoordinates => 3,
            Self::Polynomial => 6,
            Self::Fourier => 9,
            Self::OneHot => VALUE_FUNCTION_MAX_FEATURES,
        }
    }
}

impl TryFrom<&str> for FeatureMap {
    type Error = FeatureMapError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "coordinates" | "coordinate" | "xy" | "linear" => Ok(Self::Coordinates),
            "bias" | "bias_coordinates" | "bias-coordinates" | "constant" => {
                Ok(Self::BiasCoordinates)
            }
            "polynomial" | "poly" | "quadratic" => Ok(Self::Polynomial),
            "fourier" | "fourier_basis" | "fourier-basis" => Ok(Self::Fourier),
            "one_hot" | "one-hot" | "onehot" | "tabular" => Ok(Self::OneHot),
            _ => Err(FeatureMapError::Unknown(value.to_owned())),
        }
    }
}

impl TryFrom<String> for FeatureMap {
    type Error = FeatureMapError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FeatureMapError {
    Unknown(String),
}

impl FeatureMapError {
    pub const fn code(&self) -> &'static str {
        "value_function_feature_map"
    }
}

impl fmt::Display for FeatureMapError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => write!(formatter, "unknown feature map {value}"),
        }
    }
}

impl std::error::Error for FeatureMapError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ValueFunctionConfig {
    pub mode: ValueFunctionMode,
    pub feature_map: FeatureMap,
    pub discount: f64,
    pub slip_probability: f64,
    pub epsilon: f64,
    pub alpha: f64,
    pub replay_capacity: u32,
    pub batch_size: u32,
    pub target_update_interval: u32,
    pub max_episodes: u32,
    pub max_steps: u32,
    pub seed: u64,
    pub rewards: Rewards,
}

impl Default for ValueFunctionConfig {
    fn default() -> Self {
        Self {
            mode: ValueFunctionMode::TdLinear,
            feature_map: FeatureMap::BiasCoordinates,
            discount: 0.9,
            slip_probability: 0.0,
            epsilon: 0.1,
            alpha: 0.01,
            replay_capacity: 512,
            batch_size: 16,
            target_update_interval: 20,
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

impl ValueFunctionConfig {
    pub fn validate(&self) -> Result<(), ValueFunctionConfigError> {
        if !self.discount.is_finite() || !(0.0..=1.0).contains(&self.discount) {
            return Err(ValueFunctionConfigError::Discount);
        }
        if !self.slip_probability.is_finite() || !(0.0..=1.0).contains(&self.slip_probability) {
            return Err(ValueFunctionConfigError::SlipProbability);
        }
        if !self.epsilon.is_finite() || !(0.0..=MAX_VALUE_FUNCTION_EPSILON).contains(&self.epsilon)
        {
            return Err(ValueFunctionConfigError::Epsilon);
        }
        if !self.alpha.is_finite() || self.alpha <= 0.0 || self.alpha > MAX_VALUE_FUNCTION_ALPHA {
            return Err(ValueFunctionConfigError::Alpha);
        }
        if !(1..=MAX_VALUE_FUNCTION_REPLAY_CAPACITY).contains(&self.replay_capacity) {
            return Err(ValueFunctionConfigError::ReplayCapacity);
        }
        if !(1..=MAX_VALUE_FUNCTION_BATCH_SIZE).contains(&self.batch_size) {
            return Err(ValueFunctionConfigError::BatchSize);
        }
        if self.batch_size > self.replay_capacity {
            return Err(ValueFunctionConfigError::BatchLargerThanReplay);
        }
        if !(1..=MAX_VALUE_FUNCTION_TARGET_INTERVAL).contains(&self.target_update_interval) {
            return Err(ValueFunctionConfigError::TargetInterval);
        }
        if !(1..=MAX_VALUE_FUNCTION_EPISODES).contains(&self.max_episodes) {
            return Err(ValueFunctionConfigError::MaxEpisodes);
        }
        if !(1..=MAX_VALUE_FUNCTION_STEPS).contains(&self.max_steps) {
            return Err(ValueFunctionConfigError::MaxSteps);
        }
        if [
            self.rewards.default,
            self.rewards.boundary,
            self.rewards.hazard,
            self.rewards.goal,
        ]
        .iter()
        .any(|reward| !reward.is_finite() || reward.abs() > MAX_VALUE_FUNCTION_MAGNITUDE)
        {
            return Err(ValueFunctionConfigError::Reward);
        }
        self.grid_world_config()
            .validate()
            .map_err(ValueFunctionConfigError::World)
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
pub enum ValueFunctionConfigError {
    Discount,
    SlipProbability,
    Epsilon,
    Alpha,
    ReplayCapacity,
    BatchSize,
    BatchLargerThanReplay,
    TargetInterval,
    MaxEpisodes,
    MaxSteps,
    Reward,
    World(ConfigError),
}

impl ValueFunctionConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Discount => "value_function_discount_range",
            Self::SlipProbability => "value_function_slip_range",
            Self::Epsilon => "value_function_epsilon_range",
            Self::Alpha => "value_function_alpha_range",
            Self::ReplayCapacity => "value_function_replay_capacity_range",
            Self::BatchSize => "value_function_batch_size_range",
            Self::BatchLargerThanReplay => "value_function_batch_larger_than_replay",
            Self::TargetInterval => "value_function_target_interval_range",
            Self::MaxEpisodes => "value_function_max_episodes_range",
            Self::MaxSteps => "value_function_max_steps_range",
            Self::Reward => "value_function_reward_range",
            Self::World(error) => error.code(),
        }
    }
}

impl fmt::Display for ValueFunctionConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discount => write!(formatter, "discount must be finite and in [0, 1]"),
            Self::SlipProbability => {
                write!(formatter, "slip probability must be finite and in [0, 1]")
            }
            Self::Epsilon => write!(formatter, "epsilon must be finite and in [0, 1]"),
            Self::Alpha => write!(formatter, "alpha must be finite and in (0, 1]"),
            Self::ReplayCapacity => write!(
                formatter,
                "replay capacity must be between 1 and {MAX_VALUE_FUNCTION_REPLAY_CAPACITY}"
            ),
            Self::BatchSize => write!(
                formatter,
                "batch size must be between 1 and {MAX_VALUE_FUNCTION_BATCH_SIZE}"
            ),
            Self::BatchLargerThanReplay => {
                write!(formatter, "batch size cannot exceed replay capacity")
            }
            Self::TargetInterval => write!(formatter, "target update interval must be positive"),
            Self::MaxEpisodes => write!(
                formatter,
                "max episodes must be between 1 and {MAX_VALUE_FUNCTION_EPISODES}"
            ),
            Self::MaxSteps => write!(
                formatter,
                "max steps must be between 1 and {MAX_VALUE_FUNCTION_STEPS}"
            ),
            Self::Reward => write!(formatter, "rewards must be finite and bounded"),
            Self::World(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for ValueFunctionConfigError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValueFunctionError {
    InvalidConfig(ValueFunctionConfigError),
    Exhausted,
    EpisodeFinished,
    Numerical,
}

impl ValueFunctionError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::InvalidConfig(error) => error.code(),
            Self::Exhausted => "value_function_exhausted",
            Self::EpisodeFinished => "value_function_episode_finished",
            Self::Numerical => "value_function_non_finite",
        }
    }
}

impl fmt::Display for ValueFunctionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidConfig(error) => error.fmt(formatter),
            Self::Exhausted => write!(formatter, "the configured episode budget is exhausted"),
            Self::EpisodeFinished => write!(formatter, "the current episode has finished"),
            Self::Numerical => write!(formatter, "the update produced a non-finite parameter"),
        }
    }
}

impl std::error::Error for ValueFunctionError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ValueFunctionTransition {
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
pub struct ValueFunctionUpdate {
    pub episode: u32,
    pub index: u32,
    pub state: u16,
    pub action: u8,
    pub features: [f64; VALUE_FUNCTION_MAX_FEATURES],
    pub feature_count: u8,
    pub prediction: f64,
    pub target: f64,
    pub td_error: f64,
    pub loss: f64,
    pub gradient_norm: f64,
    pub update_norm: f64,
    pub replay_size: u32,
    pub target_synced: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValueFunctionEpisode {
    pub number: u32,
    pub steps: Vec<ValueFunctionTransition>,
    pub updates: Vec<ValueFunctionUpdate>,
    pub total_return: f64,
    pub discounted_return: f64,
    pub length: u32,
    pub done: bool,
    pub truncated: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ValueFunctionSnapshot {
    pub mode: ValueFunctionMode,
    pub feature_map: FeatureMap,
    pub feature_count: u8,
    pub weights: [f64; VALUE_FUNCTION_MAX_FEATURES],
    pub action_weights: [[f64; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT],
    pub target_action_weights: [[f64; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT],
    pub values: [f64; VALUE_FUNCTION_STATE_COUNT],
    pub action_values: [[f64; VALUE_FUNCTION_ACTION_COUNT]; VALUE_FUNCTION_STATE_COUNT],
    pub policy: [u8; VALUE_FUNCTION_STATE_COUNT],
    pub policy_probabilities: [[f64; VALUE_FUNCTION_ACTION_COUNT]; VALUE_FUNCTION_STATE_COUNT],
    pub last_features: [f64; VALUE_FUNCTION_MAX_FEATURES],
    pub last_state: u16,
    pub last_action: u8,
    pub last_prediction: f64,
    pub last_target: f64,
    pub last_td_error: f64,
    pub last_loss: f64,
    pub last_gradient_norm: f64,
    pub last_update_norm: f64,
    pub replay_size: u32,
    pub update_count: u32,
    pub target_sync_count: u32,
    pub episode_count: u32,
    pub total_steps: u64,
    pub episode_return_mean: f64,
    pub episode_return_variance: f64,
    pub converged: bool,
    pub truncated: bool,
    pub exhausted: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValueFunctionOutcome {
    pub snapshot: ValueFunctionSnapshot,
    pub transition: ValueFunctionTransition,
    pub updates: Vec<ValueFunctionUpdate>,
    pub episode: Option<ValueFunctionEpisode>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValueFunctionAdvanceOutcome {
    pub snapshot: ValueFunctionSnapshot,
    pub transitions: Vec<ValueFunctionTransition>,
    pub updates: Vec<ValueFunctionUpdate>,
    pub episodes: Vec<ValueFunctionEpisode>,
}

#[derive(Debug, Clone, Copy)]
struct ReplayTransition {
    transition: ValueFunctionTransition,
}

/// A compact, deterministic value-function evaluator.
#[derive(Debug, Clone)]
pub struct ValueFunctionEvaluator {
    config: ValueFunctionConfig,
    environment: GridWorldSession,
    action_rng: ChaCha8Rng,
    episode_rng: ChaCha8Rng,
    replay_rng: ChaCha8Rng,
    weights: [f64; VALUE_FUNCTION_MAX_FEATURES],
    action_weights: [[f64; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT],
    target_action_weights: [[f64; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT],
    episode_count: u32,
    total_steps: u64,
    update_count: u32,
    target_sync_count: u32,
    episode_return_sum: f64,
    episode_return_square_sum: f64,
    current_action: Action,
    episode_steps: Vec<ValueFunctionTransition>,
    replay: VecDeque<ReplayTransition>,
    history: VecDeque<ValueFunctionUpdate>,
    last_features: [f64; VALUE_FUNCTION_MAX_FEATURES],
    last_state: u16,
    last_action: u8,
    last_prediction: f64,
    last_target: f64,
    last_td_error: f64,
    last_loss: f64,
    last_gradient_norm: f64,
    last_update_norm: f64,
}

impl ValueFunctionEvaluator {
    pub fn new(config: ValueFunctionConfig) -> Result<Self, ValueFunctionError> {
        config
            .validate()
            .map_err(ValueFunctionError::InvalidConfig)?;
        let environment = GridWorldSession::new(config.grid_world_config())
            .map_err(ValueFunctionConfigError::World)
            .map_err(ValueFunctionError::InvalidConfig)?;
        let mut evaluator = Self {
            config,
            environment,
            action_rng: ChaCha8Rng::seed_from_u64(config.seed ^ ACTION_RNG_XOR),
            episode_rng: ChaCha8Rng::seed_from_u64(config.seed ^ EPISODE_RNG_XOR),
            replay_rng: ChaCha8Rng::seed_from_u64(config.seed ^ REPLAY_RNG_XOR),
            weights: [0.0; VALUE_FUNCTION_MAX_FEATURES],
            action_weights: [[0.0; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT],
            target_action_weights: [[0.0; VALUE_FUNCTION_MAX_FEATURES];
                VALUE_FUNCTION_ACTION_COUNT],
            episode_count: 0,
            total_steps: 0,
            update_count: 0,
            target_sync_count: 0,
            episode_return_sum: 0.0,
            episode_return_square_sum: 0.0,
            current_action: Action::Up,
            episode_steps: Vec::new(),
            replay: VecDeque::with_capacity(config.replay_capacity as usize),
            history: VecDeque::with_capacity(8192),
            last_features: [0.0; VALUE_FUNCTION_MAX_FEATURES],
            last_state: 0,
            last_action: TERMINAL_ACTION,
            last_prediction: 0.0,
            last_target: 0.0,
            last_td_error: 0.0,
            last_loss: 0.0,
            last_gradient_norm: 0.0,
            last_update_norm: 0.0,
        };
        evaluator.current_action = evaluator.select_action(0);
        Ok(evaluator)
    }

    pub const fn config(&self) -> ValueFunctionConfig {
        self.config
    }

    pub fn feature_vector(&self, state: u16) -> [f64; VALUE_FUNCTION_MAX_FEATURES] {
        feature_vector(self.config.feature_map, state)
    }

    pub fn snapshot(&self) -> ValueFunctionSnapshot {
        let mut values = [0.0; VALUE_FUNCTION_STATE_COUNT];
        let mut action_values = [[0.0; VALUE_FUNCTION_ACTION_COUNT]; VALUE_FUNCTION_STATE_COUNT];
        let mut policy = [TERMINAL_ACTION; VALUE_FUNCTION_STATE_COUNT];
        let mut probabilities = [[0.0; VALUE_FUNCTION_ACTION_COUNT]; VALUE_FUNCTION_STATE_COUNT];
        for state in 0..VALUE_FUNCTION_STATE_COUNT {
            let features = feature_vector(self.config.feature_map, state as u16);
            if self.config.mode == ValueFunctionMode::TdLinear {
                values[state] = dot(
                    &self.weights,
                    &features,
                    self.config.feature_map.feature_count(),
                );
                let row = [values[state]; VALUE_FUNCTION_ACTION_COUNT];
                let greedy = greedy_action(&row);
                policy[state] = if state == VALUE_FUNCTION_STATE_COUNT - 1 {
                    TERMINAL_ACTION
                } else {
                    greedy as u8
                };
                probabilities[state] = if state == VALUE_FUNCTION_STATE_COUNT - 1 {
                    [0.0; VALUE_FUNCTION_ACTION_COUNT]
                } else {
                    epsilon_probabilities(greedy, self.config.epsilon)
                };
            } else {
                for (action, slot) in action_values[state].iter_mut().enumerate() {
                    *slot = dot(
                        &self.action_weights[action],
                        &features,
                        self.config.feature_map.feature_count(),
                    );
                }
                values[state] = action_values[state]
                    .iter()
                    .copied()
                    .fold(f64::NEG_INFINITY, f64::max);
                let greedy = greedy_action(&action_values[state]);
                policy[state] = if state == VALUE_FUNCTION_STATE_COUNT - 1 {
                    TERMINAL_ACTION
                } else {
                    greedy as u8
                };
                probabilities[state] = if state == VALUE_FUNCTION_STATE_COUNT - 1 {
                    [0.0; VALUE_FUNCTION_ACTION_COUNT]
                } else {
                    epsilon_probabilities(greedy, self.config.epsilon)
                };
            }
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
        ValueFunctionSnapshot {
            mode: self.config.mode,
            feature_map: self.config.feature_map,
            feature_count: self.config.feature_map.feature_count() as u8,
            weights: self.weights,
            action_weights: self.action_weights,
            target_action_weights: self.target_action_weights,
            values,
            action_values,
            policy,
            policy_probabilities: probabilities,
            last_features: self.last_features,
            last_state: self.last_state,
            last_action: self.last_action,
            last_prediction: self.last_prediction,
            last_target: self.last_target,
            last_td_error: self.last_td_error,
            last_loss: self.last_loss,
            last_gradient_norm: self.last_gradient_norm,
            last_update_norm: self.last_update_norm,
            replay_size: self.replay.len() as u32,
            update_count: self.update_count,
            target_sync_count: self.target_sync_count,
            episode_count: self.episode_count,
            total_steps: self.total_steps,
            episode_return_mean: mean,
            episode_return_variance: variance,
            converged: self.update_count > 0 && self.last_td_error.abs() < 1e-3,
            truncated: self.episode_steps.last().is_some_and(|step| step.truncated),
            exhausted: self.episode_count >= self.config.max_episodes,
        }
    }

    pub fn step(&mut self) -> Result<ValueFunctionOutcome, ValueFunctionError> {
        if self.episode_count >= self.config.max_episodes {
            return Err(ValueFunctionError::Exhausted);
        }
        let state = self.environment.snapshot().state;
        // State-value TD still needs a behaviour action to generate the next
        // sample.  Reusing the epsilon-greedy selector (rather than forcing
        // `Stay`) keeps the state distribution meaningful and makes the
        // feature/generalisation view comparable across all four modes.
        let action = if self.config.mode == ValueFunctionMode::TdLinear {
            self.select_action(state)
        } else {
            self.current_action
        };
        let outcome = self
            .environment
            .step(action)
            .map_err(|_| ValueFunctionError::EpisodeFinished)?;
        let truncated = outcome.truncated || outcome.step_count >= self.config.max_steps;
        let transition = ValueFunctionTransition {
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
        let updates = match self.config.mode {
            ValueFunctionMode::TdLinear => vec![self.apply_state_update(transition)?],
            ValueFunctionMode::SarsaLinear => {
                vec![self.apply_action_update(transition, next_action, false, false)?]
            }
            ValueFunctionMode::QLearningLinear => {
                vec![self.apply_action_update(transition, next_action, true, false)?]
            }
            ValueFunctionMode::DeepQ => {
                self.replay.push_back(ReplayTransition { transition });
                while self.replay.len() > self.config.replay_capacity as usize {
                    self.replay.pop_front();
                }
                if self.replay.len() >= self.config.batch_size as usize {
                    vec![self.apply_replay_update()?]
                } else {
                    Vec::new()
                }
            }
        };
        if let Some(update) = updates.last().copied() {
            self.last_features = update.features;
            self.last_state = update.state;
            self.last_action = update.action;
            self.last_prediction = update.prediction;
            self.last_target = update.target;
            self.last_td_error = update.td_error;
            self.last_loss = update.loss;
            self.last_gradient_norm = update.gradient_norm;
            self.last_update_norm = update.update_norm;
        }
        let episode = if outcome.done || truncated {
            Some(self.finish_episode(outcome.done, truncated))
        } else {
            self.current_action = next_action;
            None
        };
        Ok(ValueFunctionOutcome {
            snapshot: self.snapshot(),
            transition,
            updates,
            episode,
        })
    }

    pub fn advance(
        &mut self,
        transitions: u32,
    ) -> Result<ValueFunctionAdvanceOutcome, ValueFunctionError> {
        let requested = transitions.clamp(1, MAX_VALUE_FUNCTION_ADVANCE);
        let mut transitions_out = Vec::new();
        let mut updates = Vec::new();
        let mut episodes = Vec::new();
        for _ in 0..requested {
            if self.episode_count >= self.config.max_episodes {
                break;
            }
            let outcome = self.step()?;
            transitions_out.push(outcome.transition);
            updates.extend(outcome.updates);
            if let Some(episode) = outcome.episode {
                episodes.push(episode);
            }
        }
        Ok(ValueFunctionAdvanceOutcome {
            snapshot: self.snapshot(),
            transitions: transitions_out,
            updates,
            episodes,
        })
    }

    pub fn run_to_completion(&mut self) -> Result<ValueFunctionAdvanceOutcome, ValueFunctionError> {
        let mut all = ValueFunctionAdvanceOutcome {
            snapshot: self.snapshot(),
            transitions: Vec::new(),
            updates: Vec::new(),
            episodes: Vec::new(),
        };
        while self.episode_count < self.config.max_episodes {
            let batch = self.advance(MAX_VALUE_FUNCTION_ADVANCE)?;
            let empty = batch.transitions.is_empty();
            all.transitions.extend(batch.transitions);
            all.updates.extend(batch.updates);
            all.episodes.extend(batch.episodes);
            all.snapshot = batch.snapshot;
            if empty {
                break;
            }
        }
        Ok(all)
    }

    pub fn reset(&mut self, seed: Option<u64>) -> ValueFunctionSnapshot {
        let seed = seed.unwrap_or(self.config.seed);
        self.config.seed = seed;
        self.environment.reset(seed);
        self.action_rng = ChaCha8Rng::seed_from_u64(seed ^ ACTION_RNG_XOR);
        self.episode_rng = ChaCha8Rng::seed_from_u64(seed ^ EPISODE_RNG_XOR);
        self.replay_rng = ChaCha8Rng::seed_from_u64(seed ^ REPLAY_RNG_XOR);
        self.weights = [0.0; VALUE_FUNCTION_MAX_FEATURES];
        self.action_weights = [[0.0; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT];
        self.target_action_weights =
            [[0.0; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT];
        self.episode_count = 0;
        self.total_steps = 0;
        self.update_count = 0;
        self.target_sync_count = 0;
        self.episode_return_sum = 0.0;
        self.episode_return_square_sum = 0.0;
        self.current_action = self.select_action(0);
        self.episode_steps.clear();
        self.replay.clear();
        self.history.clear();
        self.last_features = [0.0; VALUE_FUNCTION_MAX_FEATURES];
        self.last_state = 0;
        self.last_action = TERMINAL_ACTION;
        self.last_prediction = 0.0;
        self.last_target = 0.0;
        self.last_td_error = 0.0;
        self.last_loss = 0.0;
        self.last_gradient_norm = 0.0;
        self.last_update_norm = 0.0;
        self.snapshot()
    }

    pub fn episode_count(&self) -> u32 {
        self.episode_count
    }
    pub fn update_count(&self) -> u32 {
        self.update_count
    }
    pub fn replay_size(&self) -> u32 {
        self.replay.len() as u32
    }
    pub fn history(&self) -> impl Iterator<Item = &ValueFunctionUpdate> {
        self.history.iter()
    }

    fn apply_state_update(
        &mut self,
        transition: ValueFunctionTransition,
    ) -> Result<ValueFunctionUpdate, ValueFunctionError> {
        let count = self.config.feature_map.feature_count();
        let features = feature_vector(self.config.feature_map, transition.state);
        let prediction = dot(&self.weights, &features, count);
        let next_features = feature_vector(self.config.feature_map, transition.next_state);
        let bootstrap = if transition.done || transition.truncated {
            0.0
        } else {
            dot(&self.weights, &next_features, count)
        };
        let target = transition.reward + self.config.discount * bootstrap;
        let td_error = target - prediction;
        let (gradient_norm, update_norm) = apply_vector_update(
            &mut self.weights,
            &features,
            count,
            self.config.alpha * td_error,
        )?;
        self.update_count += 1;
        let update = ValueFunctionUpdate {
            episode: self.episode_count + 1,
            index: transition.episode_step,
            state: transition.state,
            action: TERMINAL_ACTION,
            features,
            feature_count: count as u8,
            prediction,
            target,
            td_error,
            loss: td_error * td_error,
            gradient_norm,
            update_norm,
            replay_size: self.replay.len() as u32,
            target_synced: false,
        };
        self.push_history(update);
        Ok(update)
    }

    fn apply_action_update(
        &mut self,
        transition: ValueFunctionTransition,
        next_action: Action,
        q_learning: bool,
        target_network: bool,
    ) -> Result<ValueFunctionUpdate, ValueFunctionError> {
        let count = self.config.feature_map.feature_count();
        let features = feature_vector(self.config.feature_map, transition.state);
        let action_index = transition.action as usize;
        let prediction = dot(&self.action_weights[action_index], &features, count);
        let next_features = feature_vector(self.config.feature_map, transition.next_state);
        let bootstrap = if transition.done || transition.truncated {
            0.0
        } else if q_learning {
            (0..VALUE_FUNCTION_ACTION_COUNT)
                .map(|action| {
                    dot(
                        if target_network {
                            &self.target_action_weights[action]
                        } else {
                            &self.action_weights[action]
                        },
                        &next_features,
                        count,
                    )
                })
                .fold(f64::NEG_INFINITY, f64::max)
        } else {
            dot(
                if target_network {
                    &self.target_action_weights[next_action as usize]
                } else {
                    &self.action_weights[next_action as usize]
                },
                &next_features,
                count,
            )
        };
        let target = transition.reward + self.config.discount * bootstrap;
        let td_error = target - prediction;
        let (gradient_norm, update_norm) = apply_vector_update(
            &mut self.action_weights[action_index],
            &features,
            count,
            self.config.alpha * td_error,
        )?;
        self.update_count += 1;
        let update = ValueFunctionUpdate {
            episode: self.episode_count + 1,
            index: transition.episode_step,
            state: transition.state,
            action: transition.action as u8,
            features,
            feature_count: count as u8,
            prediction,
            target,
            td_error,
            loss: td_error * td_error,
            gradient_norm,
            update_norm,
            replay_size: self.replay.len() as u32,
            target_synced: false,
        };
        self.push_history(update);
        Ok(update)
    }

    fn apply_replay_update(&mut self) -> Result<ValueFunctionUpdate, ValueFunctionError> {
        let count = self.config.feature_map.feature_count();
        let batch_size = self.config.batch_size as usize;
        let mut selected = Vec::with_capacity(batch_size);
        for _ in 0..batch_size {
            let index = self.replay_rng.random_range(0..self.replay.len());
            selected.push(self.replay[index]);
        }
        let mut gradient = [[0.0; VALUE_FUNCTION_MAX_FEATURES]; VALUE_FUNCTION_ACTION_COUNT];
        let mut mean_loss = 0.0;
        let mut representative = selected[0].transition;
        let mut representative_prediction = 0.0;
        let mut representative_target = 0.0;
        let mut representative_error = 0.0;
        let mut representative_features = [0.0; VALUE_FUNCTION_MAX_FEATURES];
        for sample in selected {
            let transition = sample.transition;
            representative = transition;
            let features = feature_vector(self.config.feature_map, transition.state);
            let action = transition.action as usize;
            let prediction = dot(&self.action_weights[action], &features, count);
            let next_features = feature_vector(self.config.feature_map, transition.next_state);
            let bootstrap = if transition.done || transition.truncated {
                0.0
            } else {
                (0..VALUE_FUNCTION_ACTION_COUNT)
                    .map(|candidate| {
                        dot(
                            &self.target_action_weights[candidate],
                            &next_features,
                            count,
                        )
                    })
                    .fold(f64::NEG_INFINITY, f64::max)
            };
            let target = transition.reward + self.config.discount * bootstrap;
            let error = target - prediction;
            mean_loss += error * error;
            for feature in 0..count {
                gradient[action][feature] += error * features[feature] / batch_size as f64;
            }
            representative_prediction = prediction;
            representative_target = target;
            representative_error = error;
            representative_features = features;
        }
        let mut gradient_norm_squared = 0.0;
        let mut update_norm_squared = 0.0;
        for (action, row) in gradient
            .iter()
            .enumerate()
            .take(VALUE_FUNCTION_ACTION_COUNT)
        {
            for (feature, gradient_value) in row.iter().enumerate().take(count) {
                gradient_norm_squared += gradient_value * gradient_value;
                let delta = self.config.alpha * gradient_value;
                self.action_weights[action][feature] =
                    bounded(self.action_weights[action][feature] + delta)?;
                update_norm_squared += delta * delta;
            }
        }
        self.update_count += 1;
        let mut target_synced = false;
        if self
            .update_count
            .is_multiple_of(self.config.target_update_interval)
        {
            self.target_action_weights = self.action_weights;
            self.target_sync_count += 1;
            target_synced = true;
        }
        let update = ValueFunctionUpdate {
            episode: self.episode_count + 1,
            index: representative.episode_step,
            state: representative.state,
            action: representative.action as u8,
            features: representative_features,
            feature_count: count as u8,
            prediction: representative_prediction,
            target: representative_target,
            td_error: representative_error,
            loss: mean_loss / batch_size as f64,
            gradient_norm: gradient_norm_squared.sqrt(),
            update_norm: update_norm_squared.sqrt(),
            replay_size: self.replay.len() as u32,
            target_synced,
        };
        self.push_history(update);
        Ok(update)
    }

    fn finish_episode(&mut self, done: bool, truncated: bool) -> ValueFunctionEpisode {
        let snapshot = self.environment.snapshot();
        let episode_number = self.episode_count + 1;
        let episode = ValueFunctionEpisode {
            number: episode_number,
            steps: std::mem::take(&mut self.episode_steps),
            updates: self
                .history
                .iter()
                .copied()
                .filter(|update| update.episode == episode_number)
                .collect(),
            total_return: snapshot.cumulative_return,
            discounted_return: snapshot.discounted_return,
            length: snapshot.step_count,
            done,
            truncated,
        };
        self.episode_count += 1;
        self.episode_return_sum += episode.total_return;
        self.episode_return_square_sum += episode.total_return * episode.total_return;
        if self.episode_count < self.config.max_episodes {
            self.environment.reset(self.episode_rng.random::<u64>());
            self.current_action = self.select_action(self.environment.snapshot().state);
        }
        episode
    }

    fn push_history(&mut self, update: ValueFunctionUpdate) {
        const HISTORY_LIMIT: usize = 8_192;
        if self.history.len() >= HISTORY_LIMIT {
            self.history.pop_front();
        }
        self.history.push_back(update);
    }

    fn select_action(&mut self, state: u16) -> Action {
        if state as usize >= VALUE_FUNCTION_STATE_COUNT - 1 {
            return Action::Stay;
        }
        let features = feature_vector(self.config.feature_map, state);
        let count = self.config.feature_map.feature_count();
        let mut row = [0.0; VALUE_FUNCTION_ACTION_COUNT];
        if self.config.mode == ValueFunctionMode::TdLinear {
            row.fill(dot(&self.weights, &features, count));
        } else {
            for (action, slot) in row.iter_mut().enumerate() {
                *slot = dot(&self.action_weights[action], &features, count);
            }
        }
        let greedy = greedy_action(&row);
        if self.action_rng.random::<f64>() < self.config.epsilon {
            Action::ALL[self.action_rng.random_range(0..VALUE_FUNCTION_ACTION_COUNT)]
        } else {
            greedy
        }
    }
}

fn feature_vector(map: FeatureMap, state: u16) -> [f64; VALUE_FUNCTION_MAX_FEATURES] {
    let state = state.min((VALUE_FUNCTION_STATE_COUNT - 1) as u16) as usize;
    let x = (state % 4) as f64 / 3.0 * 2.0 - 1.0;
    let y = (state / 4) as f64 / 3.0 * 2.0 - 1.0;
    let mut features = [0.0; VALUE_FUNCTION_MAX_FEATURES];
    match map {
        FeatureMap::Coordinates => {
            features[0] = x;
            features[1] = y;
        }
        FeatureMap::BiasCoordinates => {
            features[0] = 1.0;
            features[1] = x;
            features[2] = y;
        }
        FeatureMap::Polynomial => {
            features[0] = 1.0;
            features[1] = x;
            features[2] = y;
            features[3] = x * x;
            features[4] = x * y;
            features[5] = y * y;
        }
        FeatureMap::Fourier => {
            let pi = std::f64::consts::PI;
            let mut index = 0;
            for i in 0..3 {
                for j in 0..3 {
                    features[index] =
                        (pi * (i as f64 * (x + 1.0) / 2.0 + j as f64 * (y + 1.0) / 2.0)).cos();
                    index += 1;
                }
            }
        }
        FeatureMap::OneHot => {
            features[state] = 1.0;
        }
    }
    features
}

fn dot(
    weights: &[f64; VALUE_FUNCTION_MAX_FEATURES],
    features: &[f64; VALUE_FUNCTION_MAX_FEATURES],
    count: usize,
) -> f64 {
    weights[..count]
        .iter()
        .zip(features[..count].iter())
        .map(|(weight, feature)| weight * feature)
        .sum()
}

fn apply_vector_update(
    weights: &mut [f64; VALUE_FUNCTION_MAX_FEATURES],
    features: &[f64; VALUE_FUNCTION_MAX_FEATURES],
    count: usize,
    scale: f64,
) -> Result<(f64, f64), ValueFunctionError> {
    let mut gradient_norm_squared = 0.0;
    let mut update_norm_squared = 0.0;
    for index in 0..count {
        let gradient = features[index];
        let delta = scale * gradient;
        gradient_norm_squared += gradient * gradient;
        update_norm_squared += delta * delta;
        weights[index] = bounded(weights[index] + delta)?;
    }
    Ok((gradient_norm_squared.sqrt(), update_norm_squared.sqrt()))
}

fn greedy_action(row: &[f64; VALUE_FUNCTION_ACTION_COUNT]) -> Action {
    let mut best = 0;
    for index in 1..VALUE_FUNCTION_ACTION_COUNT {
        if row[index] > row[best] {
            best = index;
        }
    }
    Action::ALL[best]
}

fn epsilon_probabilities(greedy: Action, epsilon: f64) -> [f64; VALUE_FUNCTION_ACTION_COUNT] {
    let mut probabilities =
        [epsilon / VALUE_FUNCTION_ACTION_COUNT as f64; VALUE_FUNCTION_ACTION_COUNT];
    probabilities[greedy as usize] += 1.0 - epsilon;
    probabilities
}

fn bounded(value: f64) -> Result<f64, ValueFunctionError> {
    if !value.is_finite() {
        return Err(ValueFunctionError::Numerical);
    }
    Ok(value.clamp(-MAX_VALUE_FUNCTION_MAGNITUDE, MAX_VALUE_FUNCTION_MAGNITUDE))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(mode: ValueFunctionMode) -> ValueFunctionConfig {
        ValueFunctionConfig {
            mode,
            max_episodes: 2,
            max_steps: 6,
            epsilon: 0.0,
            replay_capacity: 32,
            batch_size: 2,
            ..ValueFunctionConfig::default()
        }
    }

    #[test]
    fn feature_maps_have_expected_dimensions_and_finite_values() {
        for map in FeatureMap::ALL {
            let vector = feature_vector(map, 7);
            assert_eq!(vector[..map.feature_count()].len(), map.feature_count());
            assert!(vector.iter().all(|value| value.is_finite()));
        }
    }

    #[test]
    fn one_hot_value_update_generalizes_only_through_selected_feature() {
        let mut evaluator =
            ValueFunctionEvaluator::new(config(ValueFunctionMode::TdLinear)).unwrap();
        evaluator.config = ValueFunctionConfig {
            feature_map: FeatureMap::OneHot,
            ..evaluator.config
        };
        let before = evaluator.snapshot().values;
        let outcome = evaluator.step().unwrap();
        let after = outcome.snapshot.values;
        assert_ne!(before[0], after[0]);
        for state in 1..VALUE_FUNCTION_STATE_COUNT {
            assert_eq!(before[state], after[state]);
        }
    }

    #[test]
    fn linear_td_is_replayable() {
        let mut first = ValueFunctionEvaluator::new(config(ValueFunctionMode::TdLinear)).unwrap();
        let mut second = ValueFunctionEvaluator::new(config(ValueFunctionMode::TdLinear)).unwrap();
        let a = first.advance(20).unwrap();
        let b = second.advance(20).unwrap();
        assert_eq!(a.transitions, b.transitions);
        assert_eq!(a.updates, b.updates);
    }

    #[test]
    fn deep_q_uses_replay_and_syncs_target() {
        let mut cfg = config(ValueFunctionMode::DeepQ);
        cfg.target_update_interval = 1;
        let mut evaluator = ValueFunctionEvaluator::new(cfg).unwrap();
        let outcome = evaluator.advance(8).unwrap();
        assert!(outcome.snapshot.replay_size >= 2);
        assert!(outcome.snapshot.target_sync_count > 0);
        assert!(outcome.updates.iter().any(|update| update.target_synced));
    }

    #[test]
    fn rejects_batch_larger_than_replay() {
        let mut cfg = config(ValueFunctionMode::DeepQ);
        cfg.batch_size = 4;
        cfg.replay_capacity = 2;
        let error = ValueFunctionEvaluator::new(cfg).unwrap_err();
        assert_eq!(error.code(), "value_function_batch_larger_than_replay");
    }
}
