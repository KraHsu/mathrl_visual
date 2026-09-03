//! Small, seeded actor--critic examples for Chapter 10.
//!
//! The environment is an original three-state episodic decision chain.  It
//! deliberately has two decisions so that a learner can inspect the actor
//! probability, critic target, TD error, advantage, and (for off-policy mode)
//! importance ratio in one row.  This is a finite teaching trace, not a claim
//! about asymptotic convergence.

use std::fmt;

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

pub const ACTOR_CRITIC_STATE_COUNT: usize = 3;
pub const ACTOR_CRITIC_ACTION_COUNT: usize = 2;
pub const ACTOR_CRITIC_NONTERMINAL_STATES: usize = 2;
pub const MAX_ACTOR_CRITIC_EPISODES: u32 = 100_000;
pub const MAX_ACTOR_CRITIC_EPISODES_PER_ADVANCE: u32 = 500;
pub const MAX_ACTOR_CRITIC_STEPS: u32 = 10;
pub const MAX_ACTOR_CRITIC_HISTORY: usize = 4_096;
pub const MAX_ACTOR_CRITIC_MAGNITUDE: f64 = 1_000_000.0;
pub const MAX_ACTOR_CRITIC_ALPHA: f64 = 10.0;

const LOGIT_BOUND: f64 = 20.0;
const NUMERIC_TIE_TOLERANCE: f64 = 1e-12;

/// Actor--critic variants represented in the lab.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ActorCriticMode {
    Qac = 0,
    A2c = 1,
    OffPolicy = 2,
    Deterministic = 3,
}

impl ActorCriticMode {
    pub const ALL: [Self; 4] = [Self::Qac, Self::A2c, Self::OffPolicy, Self::Deterministic];

    pub const fn code(self) -> u8 {
        self as u8
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Qac => "qac",
            Self::A2c => "a2c",
            Self::OffPolicy => "off_policy",
            Self::Deterministic => "deterministic",
        }
    }
}

impl TryFrom<&str> for ActorCriticMode {
    type Error = ActorCriticModeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "qac" | "q-actor-critic" | "q_actor_critic" => Ok(Self::Qac),
            "a2c" | "advantage" | "advantage-actor-critic" | "advantage_actor_critic" => {
                Ok(Self::A2c)
            }
            "off_policy" | "off-policy" | "offpolicy" | "is" => Ok(Self::OffPolicy),
            "deterministic" | "dpg" | "deterministic-policy-gradient" => Ok(Self::Deterministic),
            _ => Err(ActorCriticModeError::Unknown(value.to_owned())),
        }
    }
}

impl TryFrom<String> for ActorCriticMode {
    type Error = ActorCriticModeError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActorCriticModeError {
    Unknown(String),
}

impl ActorCriticModeError {
    pub const fn code(&self) -> &'static str {
        "actor_critic_mode"
    }
}

impl fmt::Display for ActorCriticModeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => write!(formatter, "unknown actor-critic mode {value}"),
        }
    }
}

impl std::error::Error for ActorCriticModeError {}

#[derive(Debug, Clone, PartialEq)]
pub struct ActorCriticConfig {
    pub mode: ActorCriticMode,
    pub actor_alpha: f64,
    pub critic_alpha: f64,
    pub discount: f64,
    pub epsilon: f64,
    pub max_episodes: u32,
    pub max_steps: u32,
    pub seed: u64,
}

impl Default for ActorCriticConfig {
    fn default() -> Self {
        Self {
            mode: ActorCriticMode::A2c,
            actor_alpha: 0.2,
            critic_alpha: 0.35,
            discount: 0.9,
            epsilon: 0.2,
            max_episodes: 200,
            max_steps: 10,
            seed: 0x5eed,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActorCriticConfigError {
    Mode(ActorCriticModeError),
    ActorAlpha,
    CriticAlpha,
    Discount,
    Epsilon,
    Episodes,
    Steps,
}

impl ActorCriticConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Mode(error) => error.code(),
            Self::ActorAlpha => "actor_critic_actor_alpha_range",
            Self::CriticAlpha => "actor_critic_critic_alpha_range",
            Self::Discount => "actor_critic_discount_range",
            Self::Epsilon => "actor_critic_epsilon_range",
            Self::Episodes => "actor_critic_episodes_range",
            Self::Steps => "actor_critic_steps_range",
        }
    }
}

impl fmt::Display for ActorCriticConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Mode(error) => error.fmt(formatter),
            Self::ActorAlpha => write!(formatter, "actor step size must be in (0, 10]"),
            Self::CriticAlpha => write!(formatter, "critic step size must be in (0, 10]"),
            Self::Discount => write!(formatter, "discount must be finite and in [0, 1]"),
            Self::Epsilon => write!(formatter, "epsilon must be finite and in [0, 1]"),
            Self::Episodes => write!(
                formatter,
                "episode budget must be an integer from 1 through 100000"
            ),
            Self::Steps => write!(formatter, "step cap must be an integer from 1 through 10"),
        }
    }
}

impl std::error::Error for ActorCriticConfigError {}

#[derive(Debug, Clone, PartialEq)]
pub struct ActorCriticStep {
    pub episode: u32,
    pub time: u32,
    pub state: u8,
    pub action: u8,
    pub next_state: u8,
    pub reward: f64,
    pub done: bool,
    pub truncated: bool,
    pub target_probability: f64,
    pub behavior_probability: f64,
    pub importance_ratio: f64,
    pub actor_probability: [f64; ACTOR_CRITIC_ACTION_COUNT],
    pub score_gradient: [f64; ACTOR_CRITIC_ACTION_COUNT],
    pub q_value: f64,
    pub critic_value: f64,
    pub bootstrap: f64,
    pub td_target: f64,
    pub td_error: f64,
    pub advantage: f64,
    pub actor_update: [f64; ACTOR_CRITIC_ACTION_COUNT],
    pub critic_update: f64,
    pub actor_logits: [f64; ACTOR_CRITIC_ACTION_COUNT],
    pub critic_values: [f64; ACTOR_CRITIC_STATE_COUNT],
    pub q_values: [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_STATE_COUNT],
}

#[derive(Debug, Clone, PartialEq)]
pub struct ActorCriticSnapshot {
    pub mode: ActorCriticMode,
    pub actor_alpha: f64,
    pub critic_alpha: f64,
    pub discount: f64,
    pub epsilon: f64,
    pub max_episodes: u32,
    pub max_steps: u32,
    pub seed: u64,
    pub episode_count: u32,
    pub total_steps: u64,
    pub actor_logits: [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES],
    pub actor_probabilities: [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES],
    pub critic_values: [f64; ACTOR_CRITIC_STATE_COUNT],
    pub q_values: [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_STATE_COUNT],
    pub average_return: f64,
    pub return_variance: f64,
    pub average_td_error: f64,
    pub average_advantage: f64,
    pub average_importance_ratio: f64,
    pub entropy: f64,
    pub converged: bool,
    pub truncated: bool,
    pub exhausted: bool,
    pub last_episode_return: f64,
    pub last_step: Option<ActorCriticStep>,
    pub history: Vec<ActorCriticStep>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ActorCriticOutcome {
    pub snapshot: ActorCriticSnapshot,
    pub steps: Vec<ActorCriticStep>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ActorCriticAdvanceOutcome {
    pub snapshot: ActorCriticSnapshot,
    pub episodes: Vec<ActorCriticOutcome>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActorCriticError {
    Config(ActorCriticConfigError),
    Exhausted,
}

impl ActorCriticError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Config(error) => error.code(),
            Self::Exhausted => "actor_critic_exhausted",
        }
    }
}

impl fmt::Display for ActorCriticError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Config(error) => error.fmt(formatter),
            Self::Exhausted => write!(formatter, "the actor-critic episode budget is exhausted"),
        }
    }
}

impl std::error::Error for ActorCriticError {}

/// Original chain environment used by all four modes.
pub fn transition(state: usize, action: usize) -> (usize, f64, bool) {
    match (state, action) {
        (0, 0) => (1, 0.0, false),
        (0, 1) => (2, 1.0, true),
        (1, 0) => (2, 2.0, true),
        (1, 1) => (2, -1.0, true),
        _ => (2, 0.0, true),
    }
}

#[derive(Debug, Clone)]
pub struct ActorCriticEvaluator {
    config: ActorCriticConfig,
    rng: ChaCha8Rng,
    episode_count: u32,
    total_steps: u64,
    actor_logits: [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES],
    critic_values: [f64; ACTOR_CRITIC_STATE_COUNT],
    q_values: [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_STATE_COUNT],
    return_count: u64,
    return_sum: f64,
    return_squared_sum: f64,
    td_sum: f64,
    advantage_sum: f64,
    ratio_sum: f64,
    last_episode_return: f64,
    last_step: Option<ActorCriticStep>,
    history: Vec<ActorCriticStep>,
}

impl ActorCriticConfig {
    pub fn validate(&self) -> Result<(), ActorCriticConfigError> {
        if !self.actor_alpha.is_finite()
            || self.actor_alpha <= 0.0
            || self.actor_alpha > MAX_ACTOR_CRITIC_ALPHA
        {
            return Err(ActorCriticConfigError::ActorAlpha);
        }
        if !self.critic_alpha.is_finite()
            || self.critic_alpha <= 0.0
            || self.critic_alpha > MAX_ACTOR_CRITIC_ALPHA
        {
            return Err(ActorCriticConfigError::CriticAlpha);
        }
        if !self.discount.is_finite() || !(0.0..=1.0).contains(&self.discount) {
            return Err(ActorCriticConfigError::Discount);
        }
        if !self.epsilon.is_finite() || !(0.0..=1.0).contains(&self.epsilon) {
            return Err(ActorCriticConfigError::Epsilon);
        }
        if self.max_episodes == 0 || self.max_episodes > MAX_ACTOR_CRITIC_EPISODES {
            return Err(ActorCriticConfigError::Episodes);
        }
        if self.max_steps == 0 || self.max_steps > MAX_ACTOR_CRITIC_STEPS {
            return Err(ActorCriticConfigError::Steps);
        }
        Ok(())
    }
}

impl ActorCriticEvaluator {
    pub fn new(config: ActorCriticConfig) -> Result<Self, ActorCriticError> {
        config.validate().map_err(ActorCriticError::Config)?;
        Ok(Self {
            rng: ChaCha8Rng::seed_from_u64(config.seed),
            config,
            episode_count: 0,
            total_steps: 0,
            actor_logits: [[0.0; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES],
            critic_values: [0.0; ACTOR_CRITIC_STATE_COUNT],
            q_values: [[0.0; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_STATE_COUNT],
            return_count: 0,
            return_sum: 0.0,
            return_squared_sum: 0.0,
            td_sum: 0.0,
            advantage_sum: 0.0,
            ratio_sum: 0.0,
            last_episode_return: 0.0,
            last_step: None,
            history: Vec::new(),
        })
    }

    pub fn config(&self) -> &ActorCriticConfig {
        &self.config
    }

    pub fn episode_count(&self) -> u32 {
        self.episode_count
    }

    pub fn snapshot(&self) -> ActorCriticSnapshot {
        let probabilities = self.actor_probabilities();
        ActorCriticSnapshot {
            mode: self.config.mode,
            actor_alpha: self.config.actor_alpha,
            critic_alpha: self.config.critic_alpha,
            discount: self.config.discount,
            epsilon: self.config.epsilon,
            max_episodes: self.config.max_episodes,
            max_steps: self.config.max_steps,
            seed: self.config.seed,
            episode_count: self.episode_count,
            total_steps: self.total_steps,
            actor_logits: self.actor_logits,
            actor_probabilities: probabilities,
            critic_values: self.critic_values,
            q_values: self.q_values,
            average_return: mean(self.return_count, self.return_sum),
            return_variance: variance(self.return_count, self.return_sum, self.return_squared_sum),
            average_td_error: mean(self.total_steps, self.td_sum),
            average_advantage: mean(self.total_steps, self.advantage_sum),
            average_importance_ratio: mean(self.total_steps, self.ratio_sum),
            entropy: average_entropy(&probabilities),
            converged: self.total_steps > 0 && (self.td_sum.abs() / self.total_steps as f64) < 1e-4,
            truncated: self.last_step.as_ref().is_some_and(|step| step.truncated),
            exhausted: self.episode_count >= self.config.max_episodes,
            last_episode_return: self.last_episode_return,
            last_step: self.last_step.clone(),
            history: self.history.clone(),
        }
    }

    pub fn reset(&mut self, seed: Option<u64>) -> ActorCriticSnapshot {
        if let Some(seed) = seed {
            self.config.seed = seed;
        }
        self.rng = ChaCha8Rng::seed_from_u64(self.config.seed);
        self.episode_count = 0;
        self.total_steps = 0;
        self.actor_logits = [[0.0; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES];
        self.critic_values = [0.0; ACTOR_CRITIC_STATE_COUNT];
        self.q_values = [[0.0; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_STATE_COUNT];
        self.return_count = 0;
        self.return_sum = 0.0;
        self.return_squared_sum = 0.0;
        self.td_sum = 0.0;
        self.advantage_sum = 0.0;
        self.ratio_sum = 0.0;
        self.last_episode_return = 0.0;
        self.last_step = None;
        self.history.clear();
        self.snapshot()
    }

    pub fn episode(&mut self) -> Result<ActorCriticOutcome, ActorCriticError> {
        if self.episode_count >= self.config.max_episodes {
            return Err(ActorCriticError::Exhausted);
        }
        let episode_number = self.episode_count + 1;
        let mut state = 0usize;
        let mut return_value = 0.0;
        let mut steps = Vec::new();
        for time in 0..self.config.max_steps {
            if state >= ACTOR_CRITIC_NONTERMINAL_STATES {
                break;
            }
            let target_probabilities = self.actor_probabilities()[state];
            let (action, behavior_probability) = if self.config.mode == ActorCriticMode::OffPolicy {
                let behavior_probabilities =
                    behavior_policy(target_probabilities, self.config.epsilon);
                let action = sample_index(&mut self.rng, &behavior_probabilities);
                (action, behavior_probabilities[action])
            } else if self.config.mode == ActorCriticMode::Deterministic {
                (argmax(&target_probabilities), 1.0)
            } else {
                let action = sample_index(&mut self.rng, &target_probabilities);
                (action, target_probabilities[action])
            };
            let target_probability = target_probabilities[action];
            let (next_state, reward, done) = transition(state, action);
            let bootstrap = if done {
                0.0
            } else if self.config.mode == ActorCriticMode::A2c {
                self.critic_values[next_state]
            } else {
                let next_probs = self.actor_probabilities()[next_state];
                let next_action = argmax(&next_probs);
                self.q_values[next_state][next_action]
            };
            let q_value = self.q_values[state][action];
            let critic_value = if self.config.mode == ActorCriticMode::A2c {
                self.critic_values[state]
            } else {
                q_value
            };
            let td_target = reward + self.config.discount * bootstrap;
            let td_error = td_target - critic_value;
            let importance_ratio = if self.config.mode == ActorCriticMode::OffPolicy {
                (target_probability / behavior_probability.max(1e-12)).clamp(0.0, 100.0)
            } else {
                1.0
            };
            let advantage = if self.config.mode == ActorCriticMode::Qac {
                q_value
            } else {
                td_error
            };
            let mut score_gradient = target_probabilities.map(|probability| -probability);
            score_gradient[action] += 1.0;
            let actor_weight = if self.config.mode == ActorCriticMode::OffPolicy {
                importance_ratio * advantage
            } else {
                advantage
            };
            let actor_update =
                score_gradient.map(|value| self.config.actor_alpha * actor_weight * value);
            if self.config.mode != ActorCriticMode::Deterministic {
                for (slot, update) in self.actor_logits[state].iter_mut().zip(actor_update) {
                    *slot = (*slot + update).clamp(-LOGIT_BOUND, LOGIT_BOUND);
                }
            } else {
                // A discrete teaching analogue of a deterministic policy
                // gradient: move preference toward the selected action while
                // always acting greedily in this mode.
                for (slot, update) in self.actor_logits[state].iter_mut().zip(actor_update) {
                    *slot = (*slot + update).clamp(-LOGIT_BOUND, LOGIT_BOUND);
                }
            }
            let critic_update = self.config.critic_alpha * td_error;
            if self.config.mode == ActorCriticMode::A2c {
                self.critic_values[state] = (self.critic_values[state] + critic_update)
                    .clamp(-MAX_ACTOR_CRITIC_MAGNITUDE, MAX_ACTOR_CRITIC_MAGNITUDE);
            } else {
                self.q_values[state][action] = (self.q_values[state][action] + critic_update)
                    .clamp(-MAX_ACTOR_CRITIC_MAGNITUDE, MAX_ACTOR_CRITIC_MAGNITUDE);
            }
            return_value += self.config.discount.powi(time as i32) * reward;
            self.total_steps += 1;
            self.td_sum += td_error;
            self.advantage_sum += advantage;
            self.ratio_sum += importance_ratio;
            let truncated = !done && time + 1 >= self.config.max_steps;
            let step = ActorCriticStep {
                episode: episode_number,
                time,
                state: state as u8,
                action: action as u8,
                next_state: next_state as u8,
                reward,
                done,
                truncated,
                target_probability,
                behavior_probability,
                importance_ratio,
                actor_probability: target_probabilities,
                score_gradient,
                q_value,
                critic_value,
                bootstrap,
                td_target,
                td_error,
                advantage,
                actor_update,
                critic_update,
                actor_logits: self.actor_logits[state],
                critic_values: self.critic_values,
                q_values: self.q_values,
            };
            self.last_step = Some(step.clone());
            if self.history.len() >= MAX_ACTOR_CRITIC_HISTORY {
                self.history.remove(0);
            }
            self.history.push(step.clone());
            steps.push(step);
            state = next_state;
            if done {
                break;
            }
        }
        self.episode_count += 1;
        self.return_count += 1;
        self.return_sum += return_value;
        self.return_squared_sum += return_value * return_value;
        self.last_episode_return = return_value;
        Ok(ActorCriticOutcome {
            snapshot: self.snapshot(),
            steps,
        })
    }

    pub fn advance(&mut self, episodes: u32) -> ActorCriticAdvanceOutcome {
        let count = episodes.min(MAX_ACTOR_CRITIC_EPISODES_PER_ADVANCE);
        let mut outcomes = Vec::with_capacity(count as usize);
        for _ in 0..count {
            match self.episode() {
                Ok(outcome) => outcomes.push(outcome),
                Err(ActorCriticError::Exhausted) => break,
                Err(ActorCriticError::Config(_)) => break,
            }
        }
        ActorCriticAdvanceOutcome {
            snapshot: self.snapshot(),
            episodes: outcomes,
        }
    }

    pub fn run_to_completion(&mut self) -> ActorCriticAdvanceOutcome {
        let remaining = self.config.max_episodes.saturating_sub(self.episode_count);
        let mut all = Vec::new();
        let mut left = remaining;
        while left > 0 {
            let chunk = self.advance(left.min(MAX_ACTOR_CRITIC_EPISODES_PER_ADVANCE));
            left = left.saturating_sub(chunk.episodes.len() as u32);
            all.extend(chunk.episodes);
            if left > 0 && all.is_empty() {
                break;
            }
        }
        ActorCriticAdvanceOutcome {
            snapshot: self.snapshot(),
            episodes: all,
        }
    }

    fn actor_probabilities(
        &self,
    ) -> [[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES] {
        self.actor_logits.map(softmax)
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

fn softmax(logits: [f64; ACTOR_CRITIC_ACTION_COUNT]) -> [f64; ACTOR_CRITIC_ACTION_COUNT] {
    let maximum = logits.into_iter().fold(f64::NEG_INFINITY, f64::max);
    let mut values = logits.map(|value| (value - maximum).exp());
    let total = values.iter().sum::<f64>();
    if !total.is_finite() || total <= 0.0 {
        return [0.5, 0.5];
    }
    for value in &mut values {
        *value /= total;
    }
    values
}

fn behavior_policy(
    target: [f64; ACTOR_CRITIC_ACTION_COUNT],
    epsilon: f64,
) -> [f64; ACTOR_CRITIC_ACTION_COUNT] {
    let greedy = argmax(&target);
    let mut result = [epsilon / ACTOR_CRITIC_ACTION_COUNT as f64; ACTOR_CRITIC_ACTION_COUNT];
    result[greedy] += 1.0 - epsilon;
    result
}

fn argmax(values: &[f64; ACTOR_CRITIC_ACTION_COUNT]) -> usize {
    let mut best = 0;
    for index in 1..values.len() {
        if values[index] > values[best] + NUMERIC_TIE_TOLERANCE {
            best = index;
        }
    }
    best
}

fn mean(count: u64, sum: f64) -> f64 {
    if count == 0 { 0.0 } else { sum / count as f64 }
}

fn variance(count: u64, sum: f64, squared_sum: f64) -> f64 {
    if count < 2 {
        return 0.0;
    }
    ((squared_sum - sum * sum / count as f64) / count as f64).max(0.0)
}

fn average_entropy(
    probabilities: &[[f64; ACTOR_CRITIC_ACTION_COUNT]; ACTOR_CRITIC_NONTERMINAL_STATES],
) -> f64 {
    probabilities
        .iter()
        .map(|row| {
            row.iter()
                .map(|p| if *p > 0.0 { -p * p.ln() } else { 0.0 })
                .sum::<f64>()
        })
        .sum::<f64>()
        / ACTOR_CRITIC_NONTERMINAL_STATES as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chain_has_two_decisions() {
        assert_eq!(transition(0, 0), (1, 0.0, false));
        assert_eq!(transition(1, 0), (2, 2.0, true));
    }

    #[test]
    fn seeded_a2c_replays() {
        let config = ActorCriticConfig {
            mode: ActorCriticMode::A2c,
            ..Default::default()
        };
        let mut left = ActorCriticEvaluator::new(config.clone()).unwrap();
        let mut right = ActorCriticEvaluator::new(config).unwrap();
        let l = left.advance(8);
        let r = right.advance(8);
        assert_eq!(l.episodes, r.episodes);
        assert_eq!(l.snapshot.actor_logits, r.snapshot.actor_logits);
    }

    #[test]
    fn off_policy_reports_finite_ratio() {
        let config = ActorCriticConfig {
            mode: ActorCriticMode::OffPolicy,
            ..Default::default()
        };
        let mut evaluator = ActorCriticEvaluator::new(config).unwrap();
        let outcome = evaluator.episode().unwrap();
        assert!(
            outcome
                .steps
                .iter()
                .all(|step| step.importance_ratio.is_finite())
        );
        assert!(
            outcome
                .steps
                .iter()
                .all(|step| step.behavior_probability > 0.0)
        );
    }

    #[test]
    fn deterministic_mode_acts_greedily() {
        let config = ActorCriticConfig {
            mode: ActorCriticMode::Deterministic,
            ..Default::default()
        };
        let mut evaluator = ActorCriticEvaluator::new(config).unwrap();
        let outcome = evaluator.episode().unwrap();
        assert!(
            outcome
                .steps
                .iter()
                .all(|step| step.target_probability >= 0.5)
        );
    }
}
