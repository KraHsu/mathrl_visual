//! Wasm boundary for Chapter 2's shared 4×4 fixed-policy evaluator.
//!
//! The adapter is intentionally separate from the older four-state Bellman
//! class.  Existing links remain valid while the new chapter-scale Worker can
//! migrate independently.

use mathrl_core::{
    GridPolicyAdvanceOutcome as CoreAdvanceOutcome, GridPolicyEvaluationConfig as CoreConfig,
    GridPolicyEvaluationEvaluator as CoreEvaluator, GridPolicyEvaluationReference as CoreReference,
    GridPolicyEvaluationSnapshot as CoreSnapshot, GridPolicyKind as CorePolicyKind,
    GridPolicySweepOutcome as CoreSweepOutcome, GridPolicyTerm as CoreTerm,
    GridPolicyTransition as CoreTransition, GridPolicyUpdate as CoreUpdate, Rewards,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

use super::{engine_version, error_value, parse_seed, serialize};

fn action_code(action: mathrl_core::Action) -> u8 {
    action.code()
}

fn seed_hex(seed: u64) -> String {
    format!("{seed:016x}")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TransitionPayload {
    state: u16,
    requested_action: u8,
    actual_action: u8,
    next_state: u16,
    probability: f64,
    reward: f64,
    boundary_collision: bool,
}

impl From<CoreTransition> for TransitionPayload {
    fn from(value: CoreTransition) -> Self {
        Self {
            state: value.state,
            requested_action: action_code(value.requested_action),
            actual_action: action_code(value.actual_action),
            next_state: value.next_state,
            probability: value.probability,
            reward: value.reward,
            boundary_collision: value.boundary_collision,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TermPayload {
    requested_action: u8,
    actual_action: u8,
    next_state: u16,
    policy_probability: f64,
    transition_probability: f64,
    probability: f64,
    reward: f64,
    next_value: f64,
    discounted_next_value: f64,
    contribution: f64,
    boundary_collision: bool,
}

impl From<CoreTerm> for TermPayload {
    fn from(value: CoreTerm) -> Self {
        Self {
            requested_action: action_code(value.requested_action),
            actual_action: action_code(value.actual_action),
            next_state: value.next_state,
            policy_probability: value.policy_probability,
            transition_probability: value.transition_probability,
            probability: value.probability,
            reward: value.reward,
            next_value: value.next_value,
            discounted_next_value: value.discounted_next_value,
            contribution: value.contribution,
            boundary_collision: value.boundary_collision,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdatePayload {
    state: u16,
    old_value: f64,
    new_value: f64,
    delta: f64,
    terms: Vec<TermPayload>,
}

impl From<CoreUpdate> for UpdatePayload {
    fn from(value: CoreUpdate) -> Self {
        Self {
            state: value.state,
            old_value: value.old_value,
            new_value: value.new_value,
            delta: value.delta,
            terms: value.terms.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotPayload {
    policy: String,
    seed_hex: String,
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    policy_probabilities: [[f64; 5]; 16],
    expected_rewards: [f64; 16],
    transition_matrix: [[f64; 16]; 16],
    sweep_count: u32,
    residual: f64,
    converged: bool,
    truncated: bool,
}

fn snapshot_payload(evaluator: &CoreEvaluator, value: CoreSnapshot) -> SnapshotPayload {
    SnapshotPayload {
        policy: evaluator.config().policy.code().to_owned(),
        seed_hex: seed_hex(evaluator.seed()),
        values: value.values,
        action_values: value.action_values,
        policy_probabilities: value.policy_probabilities,
        expected_rewards: value.expected_rewards,
        transition_matrix: value.transition_matrix,
        sweep_count: value.sweep_count,
        residual: value.residual,
        converged: value.converged,
        truncated: value.truncated,
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReferencePayload {
    values: [f64; 16],
    residual: f64,
}

impl From<CoreReference> for ReferencePayload {
    fn from(value: CoreReference) -> Self {
        Self {
            values: value.values,
            residual: value.residual,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SweepPayload {
    snapshot: SnapshotPayload,
    updates: Vec<UpdatePayload>,
    max_update: f64,
}

fn sweep_payload(evaluator: &CoreEvaluator, value: CoreSweepOutcome) -> SweepPayload {
    SweepPayload {
        snapshot: snapshot_payload(evaluator, value.snapshot),
        updates: value.updates.into_iter().map(Into::into).collect(),
        max_update: value.max_update,
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdvancePayload {
    snapshot: SnapshotPayload,
    residual_history: Vec<f64>,
}

fn advance_payload(evaluator: &CoreEvaluator, value: CoreAdvanceOutcome) -> AdvancePayload {
    AdvancePayload {
        snapshot: snapshot_payload(evaluator, value.snapshot),
        residual_history: value.residual_history,
    }
}

/// Wasm-bindgen class consumed by `grid-policy.worker.ts`.
#[wasm_bindgen]
pub struct GridPolicyEvaluationEvaluator {
    inner: CoreEvaluator,
}

#[wasm_bindgen]
impl GridPolicyEvaluationEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        policy: String,
        discount: f64,
        slip_probability: f64,
        tolerance: f64,
        max_sweeps: u32,
        seed_hex_value: &str,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let policy = CorePolicyKind::try_from(policy.trim())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CoreConfig {
            policy,
            discount,
            slip_probability,
            tolerance,
            max_sweeps,
            seed: parse_seed(seed_hex_value)?,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
        };
        let inner = CoreEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&snapshot_payload(&self.inner, self.inner.snapshot()))
    }

    #[wasm_bindgen(js_name = transitionModel)]
    pub fn transition_model(&self) -> Result<JsValue, JsValue> {
        let rows: Vec<TransitionPayload> = self
            .inner
            .transition_model()
            .into_iter()
            .map(Into::into)
            .collect();
        serialize(&rows)
    }

    #[wasm_bindgen(js_name = policyTerms)]
    pub fn policy_terms(&self, state: u16) -> Result<JsValue, JsValue> {
        let rows: Vec<TermPayload> = self
            .inner
            .policy_terms(state)
            .map_err(|error| error_value(error.code(), error.to_string()))?
            .into_iter()
            .map(Into::into)
            .collect();
        serialize(&rows)
    }

    #[wasm_bindgen(js_name = bellmanUpdate)]
    pub fn bellman_update(&self, state: u16) -> Result<JsValue, JsValue> {
        serialize(&UpdatePayload::from(
            self.inner
                .bellman_update(state)
                .map_err(|error| error_value(error.code(), error.to_string()))?,
        ))
    }

    #[wasm_bindgen(js_name = exactValues)]
    pub fn exact_values(&self) -> Result<JsValue, JsValue> {
        serialize(
            &self
                .inner
                .exact_values()
                .map_err(|error| error_value(error.code(), error.to_string()))?,
        )
    }

    #[wasm_bindgen(js_name = referenceSolution)]
    pub fn reference_solution(&self) -> Result<JsValue, JsValue> {
        serialize(&ReferencePayload::from(
            self.inner
                .reference_solution()
                .map_err(|error| error_value(error.code(), error.to_string()))?,
        ))
    }

    pub fn sweep(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self.inner.sweep();
        serialize(&sweep_payload(&self.inner, outcome))
    }

    pub fn advance(&mut self, sweeps: u32) -> Result<JsValue, JsValue> {
        let outcome = self.inner.advance(sweeps);
        serialize(&advance_payload(&self.inner, outcome))
    }

    #[wasm_bindgen(js_name = runToConvergence)]
    pub fn run_to_convergence(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self.inner.run_to_convergence();
        serialize(&advance_payload(&self.inner, outcome))
    }

    pub fn reset(&mut self, seed_hex_value: Option<String>) -> Result<JsValue, JsValue> {
        if let Some(seed_hex_value) = seed_hex_value {
            let seed = parse_seed(&seed_hex_value)?;
            let mut config = self.inner.config();
            config.seed = seed;
            self.inner = CoreEvaluator::new(config)
                .map_err(|error| error_value(error.code(), error.to_string()))?;
        } else {
            self.inner.reset();
        }
        serialize(&snapshot_payload(&self.inner, self.inner.snapshot()))
    }

    #[wasm_bindgen(js_name = episodeCount)]
    pub fn sweep_count(&self) -> u32 {
        self.inner.snapshot().sweep_count
    }

    #[wasm_bindgen(js_name = engineVersion)]
    pub fn engine_version(&self) -> String {
        engine_version()
    }
}
