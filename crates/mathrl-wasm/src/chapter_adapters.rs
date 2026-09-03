//! Flat wasm-bindgen adapters for the Chapter 7–10 teaching laboratories.
//!
//! The numerical implementations deliberately remain in `mathrl-core`.  This
//! module only translates their strongly typed Rust records into small,
//! camel-cased JSON values consumed by the versioned Web Workers.  Keeping the
//! translation here makes the browser boundary auditable and prevents a
//! second, subtly different implementation from growing in TypeScript.

use mathrl_core::{
    Action, ActorCriticAdvanceOutcome as CoreActorCriticAdvanceOutcome,
    ActorCriticConfig as CoreActorCriticConfig, ActorCriticEvaluator as CoreActorCriticEvaluator,
    ActorCriticMode as CoreActorCriticMode, ActorCriticOutcome as CoreActorCriticOutcome,
    ActorCriticSnapshot as CoreActorCriticSnapshot, ActorCriticStep as CoreActorCriticStep,
    FeatureMap as CoreFeatureMap, PolicyGradientAdvanceOutcome as CorePolicyGradientAdvanceOutcome,
    PolicyGradientConfig as CorePolicyGradientConfig,
    PolicyGradientEvaluator as CorePolicyGradientEvaluator,
    PolicyGradientMode as CorePolicyGradientMode,
    PolicyGradientOutcome as CorePolicyGradientOutcome,
    PolicyGradientSnapshot as CorePolicyGradientSnapshot,
    PolicyGradientStep as CorePolicyGradientStep, Rewards,
    TemporalDifferenceAdvanceOutcome as CoreTemporalDifferenceAdvanceOutcome,
    TemporalDifferenceConfig as CoreTemporalDifferenceConfig,
    TemporalDifferenceEpisode as CoreTemporalDifferenceEpisode,
    TemporalDifferenceEvaluator as CoreTemporalDifferenceEvaluator,
    TemporalDifferenceMode as CoreTemporalDifferenceMode,
    TemporalDifferenceOutcome as CoreTemporalDifferenceOutcome,
    TemporalDifferenceSnapshot as CoreTemporalDifferenceSnapshot,
    TemporalDifferenceTransition as CoreTemporalDifferenceTransition,
    TemporalDifferenceUpdate as CoreTemporalDifferenceUpdate,
    ValueFunctionAdvanceOutcome as CoreValueFunctionAdvanceOutcome,
    ValueFunctionConfig as CoreValueFunctionConfig,
    ValueFunctionEpisode as CoreValueFunctionEpisode,
    ValueFunctionEvaluator as CoreValueFunctionEvaluator,
    ValueFunctionMode as CoreValueFunctionMode, ValueFunctionOutcome as CoreValueFunctionOutcome,
    ValueFunctionSnapshot as CoreValueFunctionSnapshot,
    ValueFunctionTransition as CoreValueFunctionTransition,
    ValueFunctionUpdate as CoreValueFunctionUpdate,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

use super::{error_value, parse_seed, serialize};

fn seed_hex(seed: u64) -> String {
    format!("{seed:016x}")
}

fn action_code(action: Action) -> u8 {
    action.code()
}

// ---------------------------------------------------------------------------
// Chapter 7: tabular temporal-difference methods

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TdTransitionPayload {
    episode_step: u32,
    state: u16,
    action: u8,
    actual_action: u8,
    next_state: u16,
    reward: f64,
    done: bool,
    truncated: bool,
}

impl From<CoreTemporalDifferenceTransition> for TdTransitionPayload {
    fn from(value: CoreTemporalDifferenceTransition) -> Self {
        Self {
            episode_step: value.episode_step,
            state: value.state,
            action: action_code(value.action),
            actual_action: action_code(value.actual_action),
            next_state: value.next_state,
            reward: value.reward,
            done: value.done,
            truncated: value.truncated,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TdUpdatePayload {
    episode: u32,
    index: u32,
    state: u16,
    action: u8,
    old_value: f64,
    new_value: f64,
    target: f64,
    td_error: f64,
    n_step_return: f64,
    bootstrap_state: u16,
    bootstrap_action: u8,
    bootstrap_value: f64,
    terminal: bool,
}

impl From<CoreTemporalDifferenceUpdate> for TdUpdatePayload {
    fn from(value: CoreTemporalDifferenceUpdate) -> Self {
        Self {
            episode: value.episode,
            index: value.index,
            state: value.state,
            action: value.action,
            old_value: value.old_value,
            new_value: value.new_value,
            target: value.target,
            td_error: value.td_error,
            n_step_return: value.n_step_return,
            bootstrap_state: value.bootstrap_state,
            bootstrap_action: value.bootstrap_action,
            bootstrap_value: value.bootstrap_value,
            terminal: value.terminal,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TdEpisodePayload {
    number: u32,
    steps: Vec<TdTransitionPayload>,
    updates: Vec<TdUpdatePayload>,
    total_return: f64,
    discounted_return: f64,
    length: u32,
    done: bool,
    truncated: bool,
}

impl From<CoreTemporalDifferenceEpisode> for TdEpisodePayload {
    fn from(value: CoreTemporalDifferenceEpisode) -> Self {
        Self {
            number: value.number,
            steps: value.steps.into_iter().map(Into::into).collect(),
            updates: value.updates.into_iter().map(Into::into).collect(),
            total_return: value.total_return,
            discounted_return: value.discounted_return,
            length: value.length,
            done: value.done,
            truncated: value.truncated,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TdSnapshotPayload {
    mode: String,
    episode_count: u32,
    total_steps: u64,
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    policy: [u8; 16],
    policy_probabilities: [[f64; 5]; 16],
    last_state: u16,
    last_action: u8,
    last_target: f64,
    last_td_error: f64,
    last_update: Option<TdUpdatePayload>,
    episode_return_mean: f64,
    episode_return_variance: f64,
    converged: bool,
    truncated: bool,
    exhausted: bool,
}

impl From<CoreTemporalDifferenceSnapshot> for TdSnapshotPayload {
    fn from(value: CoreTemporalDifferenceSnapshot) -> Self {
        Self {
            mode: value.mode.code().to_owned(),
            episode_count: value.episode_count,
            total_steps: value.total_steps,
            values: value.values,
            action_values: value.action_values,
            policy: value.policy,
            policy_probabilities: value.policy_probabilities,
            last_state: value.last_state,
            last_action: value.last_action,
            last_target: value.last_target,
            last_td_error: value.last_td_error,
            last_update: value.last_update.map(Into::into),
            episode_return_mean: value.episode_return_mean,
            episode_return_variance: value.episode_return_variance,
            converged: value.converged,
            truncated: value.truncated,
            exhausted: value.exhausted,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TdOutcomePayload {
    snapshot: TdSnapshotPayload,
    transition: TdTransitionPayload,
    updates: Vec<TdUpdatePayload>,
    episode: Option<TdEpisodePayload>,
}

impl From<CoreTemporalDifferenceOutcome> for TdOutcomePayload {
    fn from(value: CoreTemporalDifferenceOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            transition: value.transition.into(),
            updates: value.updates.into_iter().map(Into::into).collect(),
            episode: value.episode.map(Into::into),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TdAdvancePayload {
    snapshot: TdSnapshotPayload,
    transitions: Vec<TdTransitionPayload>,
    updates: Vec<TdUpdatePayload>,
    episodes: Vec<TdEpisodePayload>,
}

impl From<CoreTemporalDifferenceAdvanceOutcome> for TdAdvancePayload {
    fn from(value: CoreTemporalDifferenceAdvanceOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            transitions: value.transitions.into_iter().map(Into::into).collect(),
            updates: value.updates.into_iter().map(Into::into).collect(),
            episodes: value.episodes.into_iter().map(Into::into).collect(),
        }
    }
}

#[wasm_bindgen]
pub struct TemporalDifferenceEvaluator {
    inner: CoreTemporalDifferenceEvaluator,
}

#[wasm_bindgen]
impl TemporalDifferenceEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mode: String,
        discount: f64,
        slip_probability: f64,
        epsilon: f64,
        alpha: f64,
        n_step: u32,
        max_episodes: u32,
        max_steps: u32,
        seed_hex_value: &str,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let mode = CoreTemporalDifferenceMode::try_from(mode.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CoreTemporalDifferenceConfig {
            mode,
            discount,
            slip_probability,
            epsilon,
            alpha,
            n_step,
            max_episodes,
            max_steps,
            seed: parse_seed(seed_hex_value)?,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
        };
        let inner = CoreTemporalDifferenceEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&TdSnapshotPayload::from(self.inner.snapshot()))
    }

    pub fn step(&mut self) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .step()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&TdOutcomePayload::from(value))
    }

    #[wasm_bindgen(js_name = iteration)]
    pub fn iteration_alias(&mut self) -> Result<JsValue, JsValue> {
        self.step()
    }

    #[wasm_bindgen(js_name = episode)]
    pub fn episode_alias(&mut self) -> Result<JsValue, JsValue> {
        self.step()
    }

    pub fn advance(&mut self, transitions: u32) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .advance(transitions)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&TdAdvancePayload::from(value))
    }

    #[wasm_bindgen(js_name = runIterations)]
    pub fn run_iterations_alias(&mut self, transitions: u32) -> Result<JsValue, JsValue> {
        self.advance(transitions)
    }

    pub fn run_to_completion(&mut self) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .run_to_completion()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&TdAdvancePayload::from(value))
    }

    #[wasm_bindgen(js_name = runToCompletion)]
    pub fn run_to_completion_alias(&mut self) -> Result<JsValue, JsValue> {
        self.run_to_completion()
    }

    pub fn reset(&mut self, seed_hex_value: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex_value.as_deref().map(parse_seed).transpose()?;
        serialize(&TdSnapshotPayload::from(self.inner.reset(seed)))
    }

    #[wasm_bindgen(js_name = episodeCount)]
    pub fn episode_count(&self) -> u32 {
        self.inner.episode_count()
    }
}

// ---------------------------------------------------------------------------
// Chapter 8: value-function approximation and deep-Q teaching surrogate

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VfTransitionPayload {
    episode_step: u32,
    state: u16,
    action: u8,
    actual_action: u8,
    next_state: u16,
    reward: f64,
    done: bool,
    truncated: bool,
}

impl From<CoreValueFunctionTransition> for VfTransitionPayload {
    fn from(value: CoreValueFunctionTransition) -> Self {
        Self {
            episode_step: value.episode_step,
            state: value.state,
            action: action_code(value.action),
            actual_action: action_code(value.actual_action),
            next_state: value.next_state,
            reward: value.reward,
            done: value.done,
            truncated: value.truncated,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VfUpdatePayload {
    episode: u32,
    index: u32,
    state: u16,
    action: u8,
    features: [f64; 16],
    feature_count: u8,
    prediction: f64,
    target: f64,
    td_error: f64,
    loss: f64,
    gradient_norm: f64,
    update_norm: f64,
    replay_size: u32,
    target_synced: bool,
}

impl From<CoreValueFunctionUpdate> for VfUpdatePayload {
    fn from(value: CoreValueFunctionUpdate) -> Self {
        Self {
            episode: value.episode,
            index: value.index,
            state: value.state,
            action: value.action,
            features: value.features,
            feature_count: value.feature_count,
            prediction: value.prediction,
            target: value.target,
            td_error: value.td_error,
            loss: value.loss,
            gradient_norm: value.gradient_norm,
            update_norm: value.update_norm,
            replay_size: value.replay_size,
            target_synced: value.target_synced,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VfEpisodePayload {
    number: u32,
    steps: Vec<VfTransitionPayload>,
    updates: Vec<VfUpdatePayload>,
    total_return: f64,
    discounted_return: f64,
    length: u32,
    done: bool,
    truncated: bool,
}

impl From<CoreValueFunctionEpisode> for VfEpisodePayload {
    fn from(value: CoreValueFunctionEpisode) -> Self {
        Self {
            number: value.number,
            steps: value.steps.into_iter().map(Into::into).collect(),
            updates: value.updates.into_iter().map(Into::into).collect(),
            total_return: value.total_return,
            discounted_return: value.discounted_return,
            length: value.length,
            done: value.done,
            truncated: value.truncated,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VfSnapshotPayload {
    mode: String,
    feature_map: String,
    feature_count: u8,
    weights: [f64; 16],
    action_weights: [[f64; 16]; 5],
    target_action_weights: [[f64; 16]; 5],
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    policy: [u8; 16],
    policy_probabilities: [[f64; 5]; 16],
    last_features: [f64; 16],
    last_state: u16,
    last_action: u8,
    last_prediction: f64,
    last_target: f64,
    last_td_error: f64,
    last_loss: f64,
    last_gradient_norm: f64,
    last_update_norm: f64,
    replay_size: u32,
    update_count: u32,
    target_sync_count: u32,
    episode_count: u32,
    total_steps: u64,
    episode_return_mean: f64,
    episode_return_variance: f64,
    converged: bool,
    truncated: bool,
    exhausted: bool,
}

impl From<CoreValueFunctionSnapshot> for VfSnapshotPayload {
    fn from(value: CoreValueFunctionSnapshot) -> Self {
        Self {
            mode: value.mode.code().to_owned(),
            feature_map: value.feature_map.code().to_owned(),
            feature_count: value.feature_count,
            weights: value.weights,
            action_weights: value.action_weights,
            target_action_weights: value.target_action_weights,
            values: value.values,
            action_values: value.action_values,
            policy: value.policy,
            policy_probabilities: value.policy_probabilities,
            last_features: value.last_features,
            last_state: value.last_state,
            last_action: value.last_action,
            last_prediction: value.last_prediction,
            last_target: value.last_target,
            last_td_error: value.last_td_error,
            last_loss: value.last_loss,
            last_gradient_norm: value.last_gradient_norm,
            last_update_norm: value.last_update_norm,
            replay_size: value.replay_size,
            update_count: value.update_count,
            target_sync_count: value.target_sync_count,
            episode_count: value.episode_count,
            total_steps: value.total_steps,
            episode_return_mean: value.episode_return_mean,
            episode_return_variance: value.episode_return_variance,
            converged: value.converged,
            truncated: value.truncated,
            exhausted: value.exhausted,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VfOutcomePayload {
    snapshot: VfSnapshotPayload,
    transition: VfTransitionPayload,
    updates: Vec<VfUpdatePayload>,
    episode: Option<VfEpisodePayload>,
}

impl From<CoreValueFunctionOutcome> for VfOutcomePayload {
    fn from(value: CoreValueFunctionOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            transition: value.transition.into(),
            updates: value.updates.into_iter().map(Into::into).collect(),
            episode: value.episode.map(Into::into),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VfAdvancePayload {
    snapshot: VfSnapshotPayload,
    transitions: Vec<VfTransitionPayload>,
    updates: Vec<VfUpdatePayload>,
    episodes: Vec<VfEpisodePayload>,
}

impl From<CoreValueFunctionAdvanceOutcome> for VfAdvancePayload {
    fn from(value: CoreValueFunctionAdvanceOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            transitions: value.transitions.into_iter().map(Into::into).collect(),
            updates: value.updates.into_iter().map(Into::into).collect(),
            episodes: value.episodes.into_iter().map(Into::into).collect(),
        }
    }
}

#[wasm_bindgen]
pub struct ValueFunctionEvaluator {
    inner: CoreValueFunctionEvaluator,
}

#[wasm_bindgen]
impl ValueFunctionEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mode: String,
        feature_map: String,
        discount: f64,
        slip_probability: f64,
        epsilon: f64,
        alpha: f64,
        replay_capacity: u32,
        batch_size: u32,
        target_update_interval: u32,
        max_episodes: u32,
        max_steps: u32,
        seed_hex_value: &str,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let mode = CoreValueFunctionMode::try_from(mode.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let feature_map = CoreFeatureMap::try_from(feature_map.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CoreValueFunctionConfig {
            mode,
            feature_map,
            discount,
            slip_probability,
            epsilon,
            alpha,
            replay_capacity,
            batch_size,
            target_update_interval,
            max_episodes,
            max_steps,
            seed: parse_seed(seed_hex_value)?,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
        };
        let inner = CoreValueFunctionEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&VfSnapshotPayload::from(self.inner.snapshot()))
    }

    pub fn feature_vector(&self, state: u16) -> Result<JsValue, JsValue> {
        serialize(&self.inner.feature_vector(state))
    }

    pub fn step(&mut self) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .step()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&VfOutcomePayload::from(value))
    }

    #[wasm_bindgen(js_name = iteration)]
    pub fn iteration_alias(&mut self) -> Result<JsValue, JsValue> {
        self.step()
    }

    pub fn advance(&mut self, transitions: u32) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .advance(transitions)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&VfAdvancePayload::from(value))
    }

    pub fn run_to_completion(&mut self) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .run_to_completion()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&VfAdvancePayload::from(value))
    }

    #[wasm_bindgen(js_name = runToCompletion)]
    pub fn run_to_completion_alias(&mut self) -> Result<JsValue, JsValue> {
        self.run_to_completion()
    }

    pub fn reset(&mut self, seed_hex_value: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex_value.as_deref().map(parse_seed).transpose()?;
        serialize(&VfSnapshotPayload::from(self.inner.reset(seed)))
    }

    #[wasm_bindgen(js_name = episodeCount)]
    pub fn episode_count(&self) -> u32 {
        self.inner.episode_count()
    }
}

// ---------------------------------------------------------------------------
// Chapter 9: REINFORCE and a state-baseline variant

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PgStepPayload {
    episode: u32,
    state: u8,
    action: u8,
    reward_mean: f64,
    noise: f64,
    reward: f64,
    return_value: f64,
    baseline: f64,
    advantage: f64,
    probabilities: [f64; 3],
    score_gradient: [f64; 3],
    parameter_update: [f64; 3],
    logits: [f64; 3],
    objective: f64,
    entropy: f64,
    gradient_norm: f64,
}

impl From<CorePolicyGradientStep> for PgStepPayload {
    fn from(value: CorePolicyGradientStep) -> Self {
        Self {
            episode: value.episode,
            state: value.state,
            action: value.action,
            reward_mean: value.reward_mean,
            noise: value.noise,
            reward: value.reward,
            return_value: value.return_value,
            baseline: value.baseline,
            advantage: value.advantage,
            probabilities: value.probabilities,
            score_gradient: value.score_gradient,
            parameter_update: value.parameter_update,
            logits: value.logits,
            objective: value.objective,
            entropy: value.entropy,
            gradient_norm: value.gradient_norm,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PgSnapshotPayload {
    mode: String,
    alpha: f64,
    discount: f64,
    noise_std: f64,
    max_episodes: u32,
    seed_hex: String,
    episode_count: u32,
    logits: [[f64; 3]; 3],
    probabilities: [[f64; 3]; 3],
    baseline_values: [f64; 3],
    baseline_counts: [u32; 3],
    objective: f64,
    entropy: f64,
    gradient_norm: f64,
    return_mean: f64,
    return_variance: f64,
    advantage_variance: f64,
    converged: bool,
    truncated: bool,
    exhausted: bool,
    last_step: Option<PgStepPayload>,
    history: Vec<PgStepPayload>,
}

impl From<CorePolicyGradientSnapshot> for PgSnapshotPayload {
    fn from(value: CorePolicyGradientSnapshot) -> Self {
        Self {
            mode: value.mode.as_str().to_owned(),
            alpha: value.alpha,
            discount: value.discount,
            noise_std: value.noise_std,
            max_episodes: value.max_episodes,
            seed_hex: seed_hex(value.seed),
            episode_count: value.episode_count,
            logits: value.logits,
            probabilities: value.probabilities,
            baseline_values: value.baseline_values,
            baseline_counts: value.baseline_counts,
            objective: value.objective,
            entropy: value.entropy,
            gradient_norm: value.gradient_norm,
            return_mean: value.return_mean,
            return_variance: value.return_variance,
            advantage_variance: value.advantage_variance,
            converged: value.converged,
            truncated: value.truncated,
            exhausted: value.exhausted,
            last_step: value.last_step.map(Into::into),
            history: value.history.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PgOutcomePayload {
    snapshot: PgSnapshotPayload,
    step: PgStepPayload,
}

impl From<CorePolicyGradientOutcome> for PgOutcomePayload {
    fn from(value: CorePolicyGradientOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            step: value.step.into(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PgAdvancePayload {
    snapshot: PgSnapshotPayload,
    steps: Vec<PgStepPayload>,
}

impl From<CorePolicyGradientAdvanceOutcome> for PgAdvancePayload {
    fn from(value: CorePolicyGradientAdvanceOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            steps: value.steps.into_iter().map(Into::into).collect(),
        }
    }
}

#[wasm_bindgen]
pub struct PolicyGradientEvaluator {
    inner: CorePolicyGradientEvaluator,
}

#[wasm_bindgen]
impl PolicyGradientEvaluator {
    #[wasm_bindgen(constructor)]
    pub fn new(
        mode: String,
        alpha: f64,
        discount: f64,
        noise_std: f64,
        max_episodes: u32,
        seed_hex_value: &str,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let mode = CorePolicyGradientMode::try_from(mode.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CorePolicyGradientConfig {
            mode,
            alpha,
            discount,
            noise_std,
            max_episodes,
            seed: parse_seed(seed_hex_value)?,
        };
        let inner = CorePolicyGradientEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&PgSnapshotPayload::from(self.inner.snapshot()))
    }

    pub fn step(&mut self) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .step()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&PgOutcomePayload::from(value))
    }

    #[wasm_bindgen(js_name = iteration)]
    pub fn iteration_alias(&mut self) -> Result<JsValue, JsValue> {
        self.step()
    }

    pub fn advance(&mut self, episodes: u32) -> Result<JsValue, JsValue> {
        serialize(&PgAdvancePayload::from(self.inner.advance(episodes)))
    }

    pub fn run_to_completion(&mut self) -> Result<JsValue, JsValue> {
        serialize(&PgAdvancePayload::from(self.inner.run_to_completion()))
    }

    #[wasm_bindgen(js_name = runToCompletion)]
    pub fn run_to_completion_alias(&mut self) -> Result<JsValue, JsValue> {
        self.run_to_completion()
    }

    pub fn reset(&mut self, seed_hex_value: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex_value.as_deref().map(parse_seed).transpose()?;
        serialize(&PgSnapshotPayload::from(self.inner.reset(seed)))
    }

    #[wasm_bindgen(js_name = episodeCount)]
    pub fn episode_count(&self) -> u32 {
        self.inner.episode_count()
    }
}

// ---------------------------------------------------------------------------
// Chapter 10: QAC, A2C, off-policy and deterministic actor–critic traces

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AcStepPayload {
    episode: u32,
    time: u32,
    state: u8,
    action: u8,
    next_state: u8,
    reward: f64,
    done: bool,
    truncated: bool,
    target_probability: f64,
    behavior_probability: f64,
    importance_ratio: f64,
    actor_probability: [f64; 2],
    score_gradient: [f64; 2],
    q_value: f64,
    critic_value: f64,
    bootstrap: f64,
    td_target: f64,
    td_error: f64,
    advantage: f64,
    actor_update: [f64; 2],
    critic_update: f64,
    actor_logits: [f64; 2],
    critic_values: [f64; 3],
    q_values: [[f64; 2]; 3],
}

impl From<CoreActorCriticStep> for AcStepPayload {
    fn from(value: CoreActorCriticStep) -> Self {
        Self {
            episode: value.episode,
            time: value.time,
            state: value.state,
            action: value.action,
            next_state: value.next_state,
            reward: value.reward,
            done: value.done,
            truncated: value.truncated,
            target_probability: value.target_probability,
            behavior_probability: value.behavior_probability,
            importance_ratio: value.importance_ratio,
            actor_probability: value.actor_probability,
            score_gradient: value.score_gradient,
            q_value: value.q_value,
            critic_value: value.critic_value,
            bootstrap: value.bootstrap,
            td_target: value.td_target,
            td_error: value.td_error,
            advantage: value.advantage,
            actor_update: value.actor_update,
            critic_update: value.critic_update,
            actor_logits: value.actor_logits,
            critic_values: value.critic_values,
            q_values: value.q_values,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AcSnapshotPayload {
    mode: String,
    actor_alpha: f64,
    critic_alpha: f64,
    discount: f64,
    epsilon: f64,
    max_episodes: u32,
    max_steps: u32,
    seed_hex: String,
    episode_count: u32,
    total_steps: u64,
    actor_logits: [[f64; 2]; 2],
    actor_probabilities: [[f64; 2]; 2],
    critic_values: [f64; 3],
    q_values: [[f64; 2]; 3],
    average_return: f64,
    return_variance: f64,
    average_td_error: f64,
    average_advantage: f64,
    average_importance_ratio: f64,
    entropy: f64,
    converged: bool,
    truncated: bool,
    exhausted: bool,
    last_episode_return: f64,
    last_step: Option<AcStepPayload>,
    history: Vec<AcStepPayload>,
}

impl From<CoreActorCriticSnapshot> for AcSnapshotPayload {
    fn from(value: CoreActorCriticSnapshot) -> Self {
        Self {
            mode: value.mode.as_str().to_owned(),
            actor_alpha: value.actor_alpha,
            critic_alpha: value.critic_alpha,
            discount: value.discount,
            epsilon: value.epsilon,
            max_episodes: value.max_episodes,
            max_steps: value.max_steps,
            seed_hex: seed_hex(value.seed),
            episode_count: value.episode_count,
            total_steps: value.total_steps,
            actor_logits: value.actor_logits,
            actor_probabilities: value.actor_probabilities,
            critic_values: value.critic_values,
            q_values: value.q_values,
            average_return: value.average_return,
            return_variance: value.return_variance,
            average_td_error: value.average_td_error,
            average_advantage: value.average_advantage,
            average_importance_ratio: value.average_importance_ratio,
            entropy: value.entropy,
            converged: value.converged,
            truncated: value.truncated,
            exhausted: value.exhausted,
            last_episode_return: value.last_episode_return,
            last_step: value.last_step.map(Into::into),
            history: value.history.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AcOutcomePayload {
    snapshot: AcSnapshotPayload,
    steps: Vec<AcStepPayload>,
}

impl From<CoreActorCriticOutcome> for AcOutcomePayload {
    fn from(value: CoreActorCriticOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            steps: value.steps.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AcAdvancePayload {
    snapshot: AcSnapshotPayload,
    episodes: Vec<AcOutcomePayload>,
}

impl From<CoreActorCriticAdvanceOutcome> for AcAdvancePayload {
    fn from(value: CoreActorCriticAdvanceOutcome) -> Self {
        Self {
            snapshot: value.snapshot.into(),
            episodes: value.episodes.into_iter().map(Into::into).collect(),
        }
    }
}

#[wasm_bindgen]
pub struct ActorCriticEvaluator {
    inner: CoreActorCriticEvaluator,
}

#[wasm_bindgen]
impl ActorCriticEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mode: String,
        actor_alpha: f64,
        critic_alpha: f64,
        discount: f64,
        epsilon: f64,
        max_episodes: u32,
        max_steps: u32,
        seed_hex_value: &str,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let mode = CoreActorCriticMode::try_from(mode.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CoreActorCriticConfig {
            mode,
            actor_alpha,
            critic_alpha,
            discount,
            epsilon,
            max_episodes,
            max_steps,
            seed: parse_seed(seed_hex_value)?,
        };
        let inner = CoreActorCriticEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&AcSnapshotPayload::from(self.inner.snapshot()))
    }

    pub fn episode(&mut self) -> Result<JsValue, JsValue> {
        let value = self
            .inner
            .episode()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&AcOutcomePayload::from(value))
    }

    #[wasm_bindgen(js_name = step)]
    pub fn step_alias(&mut self) -> Result<JsValue, JsValue> {
        self.episode()
    }

    pub fn advance(&mut self, episodes: u32) -> Result<JsValue, JsValue> {
        serialize(&AcAdvancePayload::from(self.inner.advance(episodes)))
    }

    pub fn run_to_completion(&mut self) -> Result<JsValue, JsValue> {
        serialize(&AcAdvancePayload::from(self.inner.run_to_completion()))
    }

    #[wasm_bindgen(js_name = runToCompletion)]
    pub fn run_to_completion_alias(&mut self) -> Result<JsValue, JsValue> {
        self.run_to_completion()
    }

    pub fn reset(&mut self, seed_hex_value: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex_value.as_deref().map(parse_seed).transpose()?;
        serialize(&AcSnapshotPayload::from(self.inner.reset(seed)))
    }

    #[wasm_bindgen(js_name = episodeCount)]
    pub fn episode_count(&self) -> u32 {
        self.inner.episode_count()
    }
}
