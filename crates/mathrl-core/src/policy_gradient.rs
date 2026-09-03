//! Seeded, finite policy-gradient examples for Chapter 9.
//!
//! The laboratory uses a three-context contextual bandit.  A policy is a
//! row-wise softmax over three logits per context and the reward table is
//! intentionally small enough to inspect in a browser.  Rust owns the random
//! stream and all updates; the Worker only transports the resulting trace.
//!
//! The update is the Monte-Carlo policy-gradient estimator
//! `theta <- theta + alpha * (G - b(s)) * grad log pi(a|s)`.
//! `b(s)` is either zero or a running state baseline.  A bounded centred
//! uniform disturbance keeps finite browser runs deterministic and finite.

use std::fmt;

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

pub const POLICY_GRADIENT_STATE_COUNT: usize = 3;
pub const POLICY_GRADIENT_ACTION_COUNT: usize = 3;
pub const MAX_POLICY_GRADIENT_EPISODES: u32 = 100_000;
pub const MAX_POLICY_GRADIENT_EPISODES_PER_ADVANCE: u32 = 2_000;
pub const MAX_POLICY_GRADIENT_HISTORY: usize = 4_096;
pub const MAX_POLICY_GRADIENT_MAGNITUDE: f64 = 1_000_000.0;
pub const MAX_POLICY_GRADIENT_ALPHA: f64 = 10.0;
pub const MAX_POLICY_GRADIENT_NOISE_STD: f64 = 1_000_000.0;

const REWARD_TABLE: [[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT] =
    [[1.0, 0.0, -1.0], [-0.5, 1.25, 0.25], [0.2, -0.8, 1.4]];
const STATE_PROBABILITIES: [f64; POLICY_GRADIENT_STATE_COUNT] = [1.0 / 3.0; 3];
const LOGIT_BOUND: f64 = 20.0;

/// Whether REINFORCE uses a learned state baseline.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum PolicyGradientMode {
    Reinforce = 0,
    Baseline = 1,
}

impl PolicyGradientMode {
    pub const ALL: [Self; 2] = [Self::Reinforce, Self::Baseline];

    pub const fn code(self) -> u8 {
        self as u8
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Reinforce => "reinforce",
            Self::Baseline => "baseline",
        }
    }
}

impl TryFrom<&str> for PolicyGradientMode {
    type Error = PolicyGradientModeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "reinforce" | "mc" | "policy_gradient" | "policy-gradient" => Ok(Self::Reinforce),
            "baseline" | "state_baseline" | "state-baseline" | "reinforce_baseline" => {
                Ok(Self::Baseline)
            }
            _ => Err(PolicyGradientModeError::Unknown(value.to_owned())),
        }
    }
}

impl TryFrom<String> for PolicyGradientMode {
    type Error = PolicyGradientModeError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyGradientModeError {
    Unknown(String),
}

impl PolicyGradientModeError {
    pub const fn code(&self) -> &'static str {
        "policy_gradient_mode"
    }
}

impl fmt::Display for PolicyGradientModeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => write!(formatter, "unknown policy-gradient mode {value}"),
        }
    }
}

impl std::error::Error for PolicyGradientModeError {}

#[derive(Debug, Clone, PartialEq)]
pub struct PolicyGradientConfig {
    pub mode: PolicyGradientMode,
    pub alpha: f64,
    pub discount: f64,
    pub noise_std: f64,
    pub max_episodes: u32,
    pub seed: u64,
}

impl Default for PolicyGradientConfig {
    fn default() -> Self {
        Self {
            mode: PolicyGradientMode::Reinforce,
            alpha: 0.25,
            discount: 1.0,
            noise_std: 0.15,
            max_episodes: 200,
            seed: 0x5eed,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyGradientConfigError {
    Mode(PolicyGradientModeError),
    Alpha,
    Discount,
    Noise,
    Episodes,
    Seed,
}

impl PolicyGradientConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Mode(error) => error.code(),
            Self::Alpha => "policy_gradient_alpha_range",
            Self::Discount => "policy_gradient_discount_range",
            Self::Noise => "policy_gradient_noise_range",
            Self::Episodes => "policy_gradient_episodes_range",
            Self::Seed => "policy_gradient_seed",
        }
    }
}

impl fmt::Display for PolicyGradientConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Mode(error) => error.fmt(formatter),
            Self::Alpha => write!(formatter, "policy-gradient alpha must be in (0, 10]"),
            Self::Discount => write!(formatter, "discount must be finite and in [0, 1]"),
            Self::Noise => write!(formatter, "noise standard deviation must be in [0, 1e6]"),
            Self::Episodes => write!(
                formatter,
                "episode budget must be an integer from 1 through 100000"
            ),
            Self::Seed => write!(formatter, "seed must be a hexadecimal u64"),
        }
    }
}

impl std::error::Error for PolicyGradientConfigError {}

#[derive(Debug, Clone, PartialEq)]
pub struct PolicyGradientStep {
    pub episode: u32,
    pub state: u8,
    pub action: u8,
    pub reward_mean: f64,
    pub noise: f64,
    pub reward: f64,
    pub return_value: f64,
    pub baseline: f64,
    pub advantage: f64,
    pub probabilities: [f64; POLICY_GRADIENT_ACTION_COUNT],
    pub score_gradient: [f64; POLICY_GRADIENT_ACTION_COUNT],
    pub parameter_update: [f64; POLICY_GRADIENT_ACTION_COUNT],
    pub logits: [f64; POLICY_GRADIENT_ACTION_COUNT],
    pub objective: f64,
    pub entropy: f64,
    pub gradient_norm: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PolicyGradientSnapshot {
    pub mode: PolicyGradientMode,
    pub alpha: f64,
    pub discount: f64,
    pub noise_std: f64,
    pub max_episodes: u32,
    pub seed: u64,
    pub episode_count: u32,
    pub logits: [[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT],
    pub probabilities: [[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT],
    pub baseline_values: [f64; POLICY_GRADIENT_STATE_COUNT],
    pub baseline_counts: [u32; POLICY_GRADIENT_STATE_COUNT],
    pub objective: f64,
    pub entropy: f64,
    pub gradient_norm: f64,
    pub return_mean: f64,
    pub return_variance: f64,
    pub advantage_variance: f64,
    pub converged: bool,
    pub truncated: bool,
    pub exhausted: bool,
    pub last_step: Option<PolicyGradientStep>,
    pub history: Vec<PolicyGradientStep>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PolicyGradientOutcome {
    pub snapshot: PolicyGradientSnapshot,
    pub step: PolicyGradientStep,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PolicyGradientAdvanceOutcome {
    pub snapshot: PolicyGradientSnapshot,
    pub steps: Vec<PolicyGradientStep>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PolicyGradientError {
    Config(PolicyGradientConfigError),
    Exhausted,
}

impl PolicyGradientError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Config(error) => error.code(),
            Self::Exhausted => "policy_gradient_exhausted",
        }
    }
}

impl fmt::Display for PolicyGradientError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Config(error) => error.fmt(formatter),
            Self::Exhausted => write!(formatter, "the policy-gradient episode budget is exhausted"),
        }
    }
}

impl std::error::Error for PolicyGradientError {}

/// Finite REINFORCE evaluator with a reproducible contextual-bandit stream.
#[derive(Debug, Clone)]
pub struct PolicyGradientEvaluator {
    config: PolicyGradientConfig,
    rng: ChaCha8Rng,
    episode_count: u32,
    logits: [[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT],
    baseline_values: [f64; POLICY_GRADIENT_STATE_COUNT],
    baseline_counts: [u32; POLICY_GRADIENT_STATE_COUNT],
    return_count: u64,
    return_sum: f64,
    return_squared_sum: f64,
    advantage_sum: f64,
    advantage_squared_sum: f64,
    gradient_norm: f64,
    last_step: Option<PolicyGradientStep>,
    history: Vec<PolicyGradientStep>,
}

impl PolicyGradientConfig {
    pub fn validate(&self) -> Result<(), PolicyGradientConfigError> {
        if !self.alpha.is_finite() || self.alpha <= 0.0 || self.alpha > MAX_POLICY_GRADIENT_ALPHA {
            return Err(PolicyGradientConfigError::Alpha);
        }
        if !self.discount.is_finite() || !(0.0..=1.0).contains(&self.discount) {
            return Err(PolicyGradientConfigError::Discount);
        }
        if !self.noise_std.is_finite()
            || self.noise_std < 0.0
            || self.noise_std > MAX_POLICY_GRADIENT_NOISE_STD
        {
            return Err(PolicyGradientConfigError::Noise);
        }
        if self.max_episodes == 0 || self.max_episodes > MAX_POLICY_GRADIENT_EPISODES {
            return Err(PolicyGradientConfigError::Episodes);
        }
        Ok(())
    }
}

impl PolicyGradientEvaluator {
    pub fn new(config: PolicyGradientConfig) -> Result<Self, PolicyGradientError> {
        config.validate().map_err(PolicyGradientError::Config)?;
        Ok(Self {
            rng: ChaCha8Rng::seed_from_u64(config.seed),
            config,
            episode_count: 0,
            logits: [[0.0; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT],
            baseline_values: [0.0; POLICY_GRADIENT_STATE_COUNT],
            baseline_counts: [0; POLICY_GRADIENT_STATE_COUNT],
            return_count: 0,
            return_sum: 0.0,
            return_squared_sum: 0.0,
            advantage_sum: 0.0,
            advantage_squared_sum: 0.0,
            gradient_norm: 0.0,
            last_step: None,
            history: Vec::new(),
        })
    }

    pub fn config(&self) -> &PolicyGradientConfig {
        &self.config
    }

    pub fn episode_count(&self) -> u32 {
        self.episode_count
    }

    pub fn reward_table() -> [[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT] {
        REWARD_TABLE
    }

    pub fn snapshot(&self) -> PolicyGradientSnapshot {
        let probabilities = self.probabilities();
        let objective = expected_objective(&probabilities);
        let entropy = expected_entropy(&probabilities);
        PolicyGradientSnapshot {
            mode: self.config.mode,
            alpha: self.config.alpha,
            discount: self.config.discount,
            noise_std: self.config.noise_std,
            max_episodes: self.config.max_episodes,
            seed: self.config.seed,
            episode_count: self.episode_count,
            logits: self.logits,
            probabilities,
            baseline_values: self.baseline_values,
            baseline_counts: self.baseline_counts,
            objective,
            entropy,
            gradient_norm: self.gradient_norm,
            return_mean: mean(self.return_count, self.return_sum),
            return_variance: variance(self.return_count, self.return_sum, self.return_squared_sum),
            advantage_variance: variance(
                self.return_count,
                self.advantage_sum,
                self.advantage_squared_sum,
            ),
            converged: self.episode_count > 0 && self.gradient_norm < 1e-5,
            truncated: false,
            exhausted: self.episode_count >= self.config.max_episodes,
            last_step: self.last_step.clone(),
            history: self.history.clone(),
        }
    }

    pub fn reset(&mut self, seed: Option<u64>) -> PolicyGradientSnapshot {
        if let Some(seed) = seed {
            self.config.seed = seed;
        }
        self.rng = ChaCha8Rng::seed_from_u64(self.config.seed);
        self.episode_count = 0;
        self.logits = [[0.0; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT];
        self.baseline_values = [0.0; POLICY_GRADIENT_STATE_COUNT];
        self.baseline_counts = [0; POLICY_GRADIENT_STATE_COUNT];
        self.return_count = 0;
        self.return_sum = 0.0;
        self.return_squared_sum = 0.0;
        self.advantage_sum = 0.0;
        self.advantage_squared_sum = 0.0;
        self.gradient_norm = 0.0;
        self.last_step = None;
        self.history.clear();
        self.snapshot()
    }

    pub fn step(&mut self) -> Result<PolicyGradientOutcome, PolicyGradientError> {
        if self.episode_count >= self.config.max_episodes {
            return Err(PolicyGradientError::Exhausted);
        }
        let state = sample_index(&mut self.rng, &STATE_PROBABILITIES);
        let probabilities = softmax(self.logits[state]);
        let action = sample_index(&mut self.rng, &probabilities);
        let reward_mean = REWARD_TABLE[state][action];
        let noise = centered_noise(&mut self.rng, self.config.noise_std);
        let reward = reward_mean + noise;
        let return_value = self.config.discount * reward;
        let baseline = if self.config.mode == PolicyGradientMode::Baseline {
            self.baseline_values[state]
        } else {
            0.0
        };
        let advantage = return_value - baseline;
        let mut score_gradient = probabilities.map(|probability| -probability);
        score_gradient[action] += 1.0;
        let parameter_update = score_gradient.map(|value| self.config.alpha * advantage * value);
        let mut logits = self.logits[state];
        for (slot, update) in logits.iter_mut().zip(parameter_update) {
            *slot = (*slot + update).clamp(-LOGIT_BOUND, LOGIT_BOUND);
        }
        self.logits[state] = logits;
        if self.config.mode == PolicyGradientMode::Baseline {
            let count = self.baseline_counts[state].saturating_add(1);
            self.baseline_values[state] +=
                (return_value - self.baseline_values[state]) / count as f64;
            self.baseline_counts[state] = count;
        }
        self.episode_count = self.episode_count.saturating_add(1);
        self.return_count += 1;
        self.return_sum += return_value;
        self.return_squared_sum += return_value * return_value;
        self.advantage_sum += advantage;
        self.advantage_squared_sum += advantage * advantage;
        self.gradient_norm = parameter_update
            .iter()
            .map(|value| value * value)
            .sum::<f64>()
            .sqrt();
        let probabilities_after = self.probabilities()[state];
        let step = PolicyGradientStep {
            episode: self.episode_count,
            state: state as u8,
            action: action as u8,
            reward_mean,
            noise,
            reward,
            return_value,
            baseline,
            advantage,
            probabilities: probabilities_after,
            score_gradient,
            parameter_update,
            logits,
            objective: expected_objective(&self.probabilities()),
            entropy: expected_entropy(&self.probabilities()),
            gradient_norm: self.gradient_norm,
        };
        self.last_step = Some(step.clone());
        if self.history.len() >= MAX_POLICY_GRADIENT_HISTORY {
            self.history.remove(0);
        }
        self.history.push(step.clone());
        Ok(PolicyGradientOutcome {
            snapshot: self.snapshot(),
            step,
        })
    }

    pub fn advance(&mut self, episodes: u32) -> PolicyGradientAdvanceOutcome {
        let count = episodes.min(MAX_POLICY_GRADIENT_EPISODES_PER_ADVANCE);
        let mut steps = Vec::with_capacity(count as usize);
        for _ in 0..count {
            match self.step() {
                Ok(outcome) => steps.push(outcome.step),
                Err(PolicyGradientError::Exhausted) => break,
                Err(PolicyGradientError::Config(_)) => break,
            }
        }
        PolicyGradientAdvanceOutcome {
            snapshot: self.snapshot(),
            steps,
        }
    }

    pub fn run_to_completion(&mut self) -> PolicyGradientAdvanceOutcome {
        let mut all_steps = Vec::new();
        while self.episode_count < self.config.max_episodes {
            let remaining = self.config.max_episodes.saturating_sub(self.episode_count);
            let batch = self.advance(remaining.min(MAX_POLICY_GRADIENT_EPISODES_PER_ADVANCE));
            if batch.steps.is_empty() {
                break;
            }
            all_steps.extend(batch.steps);
        }
        PolicyGradientAdvanceOutcome {
            snapshot: self.snapshot(),
            steps: all_steps,
        }
    }

    fn probabilities(&self) -> [[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT] {
        self.logits.map(softmax)
    }
}

fn sample_index(rng: &mut ChaCha8Rng, probabilities: &[f64]) -> usize {
    let draw = rng.random::<f64>();
    let mut cumulative = 0.0;
    for (index, probability) in probabilities.iter().enumerate() {
        cumulative += *probability;
        if draw < cumulative || index + 1 == probabilities.len() {
            return index;
        }
    }
    0
}

fn centered_noise(rng: &mut ChaCha8Rng, standard_deviation: f64) -> f64 {
    if standard_deviation == 0.0 {
        return 0.0;
    }
    // Uniform[-sqrt(3)σ, sqrt(3)σ] has variance σ².
    let radius = 3.0_f64.sqrt() * standard_deviation;
    (rng.random::<f64>() * 2.0 - 1.0) * radius
}

fn softmax(logits: [f64; POLICY_GRADIENT_ACTION_COUNT]) -> [f64; POLICY_GRADIENT_ACTION_COUNT] {
    let maximum = logits.into_iter().fold(f64::NEG_INFINITY, f64::max);
    let mut values = logits.map(|value| (value - maximum).exp());
    let total = values.iter().sum::<f64>();
    if !total.is_finite() || total <= 0.0 {
        return [1.0 / POLICY_GRADIENT_ACTION_COUNT as f64; POLICY_GRADIENT_ACTION_COUNT];
    }
    for value in &mut values {
        *value /= total;
    }
    values
}

fn expected_objective(
    probabilities: &[[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT],
) -> f64 {
    probabilities
        .iter()
        .enumerate()
        .map(|(state, row)| {
            STATE_PROBABILITIES[state]
                * row
                    .iter()
                    .zip(REWARD_TABLE[state])
                    .map(|(probability, reward)| probability * reward)
                    .sum::<f64>()
        })
        .sum()
}

fn expected_entropy(
    probabilities: &[[f64; POLICY_GRADIENT_ACTION_COUNT]; POLICY_GRADIENT_STATE_COUNT],
) -> f64 {
    probabilities
        .iter()
        .zip(STATE_PROBABILITIES)
        .map(|(row, state_weight)| {
            state_weight
                * row
                    .iter()
                    .map(|probability| {
                        if *probability > 0.0 {
                            -probability * probability.ln()
                        } else {
                            0.0
                        }
                    })
                    .sum::<f64>()
        })
        .sum()
}

fn mean(count: u64, sum: f64) -> f64 {
    if count == 0 { 0.0 } else { sum / count as f64 }
}

fn variance(count: u64, sum: f64, squared_sum: f64) -> f64 {
    if count < 2 {
        return 0.0;
    }
    let value = (squared_sum - sum * sum / count as f64) / count as f64;
    value.max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeded_trace_replays() {
        let config = PolicyGradientConfig {
            noise_std: 0.0,
            ..Default::default()
        };
        let mut first = PolicyGradientEvaluator::new(config.clone()).unwrap();
        let mut second = PolicyGradientEvaluator::new(config).unwrap();
        let a = first.advance(8);
        let b = second.advance(8);
        assert_eq!(a.steps, b.steps);
        assert_eq!(a.snapshot.logits, b.snapshot.logits);
    }

    #[test]
    fn baseline_tracks_returns() {
        let config = PolicyGradientConfig {
            mode: PolicyGradientMode::Baseline,
            noise_std: 0.0,
            ..Default::default()
        };
        let mut evaluator = PolicyGradientEvaluator::new(config).unwrap();
        evaluator.advance(12);
        assert!(evaluator.snapshot().baseline_counts.iter().sum::<u32>() > 0);
        assert!(
            evaluator
                .snapshot()
                .probabilities
                .iter()
                .flatten()
                .all(|p| p.is_finite())
        );
    }

    #[test]
    fn objective_uses_each_context_row() {
        let mut evaluator = PolicyGradientEvaluator::new(PolicyGradientConfig::default()).unwrap();
        let initial = evaluator.snapshot().objective;
        evaluator.logits[2] = [10.0, -10.0, -10.0];
        let changed = evaluator.snapshot().objective;
        assert_ne!(initial, changed);
    }

    #[test]
    fn run_to_completion_drains_multiple_advance_chunks() {
        let config = PolicyGradientConfig {
            max_episodes: MAX_POLICY_GRADIENT_EPISODES_PER_ADVANCE + 3,
            noise_std: 0.0,
            ..Default::default()
        };
        let mut evaluator = PolicyGradientEvaluator::new(config).unwrap();
        let outcome = evaluator.run_to_completion();
        assert_eq!(outcome.steps.len() as u32, evaluator.episode_count());
        assert!(outcome.snapshot.exhausted);
    }
}
