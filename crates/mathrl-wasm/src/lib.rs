use mathrl_core::{
    Action, AdvanceOutcome as CoreAdvanceOutcome, BellmanEvaluator as CoreBellmanEvaluator,
    BellmanTerm as CoreBellmanTerm, BellmanUpdate as CoreBellmanUpdate, EvaluationConfig,
    EvaluationSnapshot as CoreEvaluationSnapshot, GoalMode, GridWorldConfig,
    GridWorldSession as CoreSession, Policy, Rewards, SweepOutcome as CoreSweepOutcome,
    Transition as CoreEvaluationTransition, TransitionOutcome,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorPayload<'a> {
    code: &'a str,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotPayload {
    state: u16,
    step_count: u32,
    cumulative_return: f64,
    discounted_return: f64,
    done: bool,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StepPayload {
    previous_state: u16,
    requested_action: u8,
    actual_action: u8,
    next_state: u16,
    reward: f64,
    discount_weight: f64,
    discounted_contribution: f64,
    cumulative_return: f64,
    discounted_return: f64,
    step_count: u32,
    boundary_collision: bool,
    slipped: bool,
    done: bool,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TransitionPayload {
    requested_action: u8,
    actual_action: u8,
    next_state: u16,
    probability: f64,
    reward: f64,
    boundary_collision: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EvaluationSnapshotPayload {
    values: [f64; 4],
    sweep_count: u32,
    residual: f64,
    converged: bool,
    truncated: bool,
}

impl From<CoreEvaluationSnapshot> for EvaluationSnapshotPayload {
    fn from(snapshot: CoreEvaluationSnapshot) -> Self {
        Self {
            values: snapshot.values,
            sweep_count: snapshot.sweep_count,
            residual: snapshot.residual,
            converged: snapshot.converged,
            truncated: snapshot.truncated,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EvaluationTransitionPayload {
    state: u8,
    next_state: u8,
    probability: f64,
    reward: f64,
}

impl From<CoreEvaluationTransition> for EvaluationTransitionPayload {
    fn from(transition: CoreEvaluationTransition) -> Self {
        Self {
            state: transition.state,
            next_state: transition.next_state,
            probability: transition.probability,
            reward: transition.reward,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BellmanTermPayload {
    next_state: u8,
    probability: f64,
    reward: f64,
    next_value: f64,
    discounted_next_value: f64,
    contribution: f64,
}

impl From<CoreBellmanTerm> for BellmanTermPayload {
    fn from(term: CoreBellmanTerm) -> Self {
        Self {
            next_state: term.next_state,
            probability: term.probability,
            reward: term.reward,
            next_value: term.next_value,
            discounted_next_value: term.discounted_next_value,
            contribution: term.contribution,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BellmanUpdatePayload {
    state: u8,
    old_value: f64,
    new_value: f64,
    delta: f64,
    terms: Vec<BellmanTermPayload>,
}

impl From<CoreBellmanUpdate> for BellmanUpdatePayload {
    fn from(update: CoreBellmanUpdate) -> Self {
        Self {
            state: update.state,
            old_value: update.old_value,
            new_value: update.new_value,
            delta: update.delta,
            terms: update.terms.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SweepPayload {
    snapshot: EvaluationSnapshotPayload,
    updates: Vec<BellmanUpdatePayload>,
    max_update: f64,
}

impl From<CoreSweepOutcome> for SweepPayload {
    fn from(outcome: CoreSweepOutcome) -> Self {
        Self {
            snapshot: outcome.snapshot.into(),
            updates: outcome.updates.into_iter().map(Into::into).collect(),
            max_update: outcome.max_update,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AdvancePayload {
    snapshot: EvaluationSnapshotPayload,
    residual_history: Vec<f64>,
}

impl From<CoreAdvanceOutcome> for AdvancePayload {
    fn from(outcome: CoreAdvanceOutcome) -> Self {
        Self {
            snapshot: outcome.snapshot.into(),
            residual_history: outcome.residual_history,
        }
    }
}

impl From<TransitionOutcome> for TransitionPayload {
    fn from(outcome: TransitionOutcome) -> Self {
        Self {
            requested_action: outcome.requested_action.code(),
            actual_action: outcome.actual_action.code(),
            next_state: outcome.next_state,
            probability: outcome.probability,
            reward: outcome.reward,
            boundary_collision: outcome.boundary_collision,
        }
    }
}

fn serialize<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(value).map_err(|error| JsValue::from_str(&error.to_string()))
}

fn error_value(code: &str, message: impl Into<String>) -> JsValue {
    let payload = ErrorPayload {
        code,
        message: message.into(),
    };
    serialize(&payload).unwrap_or_else(|_| JsValue::from_str(code))
}

fn parse_seed(seed_hex: &str) -> Result<u64, JsValue> {
    let normalized = seed_hex
        .trim()
        .strip_prefix("0x")
        .unwrap_or(seed_hex.trim());
    u64::from_str_radix(normalized, 16)
        .map_err(|_| error_value("invalid_seed", "seed must be a hexadecimal u64"))
}

#[wasm_bindgen]
pub fn engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_owned()
}

#[wasm_bindgen]
pub struct BellmanEvaluator {
    inner: CoreBellmanEvaluator,
}

#[wasm_bindgen]
impl BellmanEvaluator {
    #[wasm_bindgen(constructor)]
    pub fn new(discount: f64, tolerance: f64, max_sweeps: u32) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let config = EvaluationConfig {
            discount,
            tolerance,
            max_sweeps,
        };
        let inner = CoreBellmanEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&EvaluationSnapshotPayload::from(self.inner.snapshot()))
    }

    pub fn reset(&mut self) -> Result<JsValue, JsValue> {
        let snapshot = self.inner.reset();
        serialize(&EvaluationSnapshotPayload::from(snapshot))
    }

    pub fn transition_model(&self) -> Result<JsValue, JsValue> {
        let transitions: Vec<_> = self
            .inner
            .transition_model()
            .iter()
            .copied()
            .map(EvaluationTransitionPayload::from)
            .collect();
        serialize(&transitions)
    }

    pub fn bellman_update(&self, state: u8) -> Result<JsValue, JsValue> {
        let update = self
            .inner
            .bellman_update(state)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&BellmanUpdatePayload::from(update))
    }

    pub fn exact_values(&self) -> Result<JsValue, JsValue> {
        let values = self
            .inner
            .exact_values()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&values)
    }

    pub fn sweep(&mut self) -> Result<JsValue, JsValue> {
        serialize(&SweepPayload::from(self.inner.sweep()))
    }

    pub fn advance(&mut self, sweeps: u32) -> Result<JsValue, JsValue> {
        serialize(&AdvancePayload::from(self.inner.advance(sweeps)))
    }

    pub fn run_to_convergence(&mut self) -> Result<JsValue, JsValue> {
        serialize(&AdvancePayload::from(self.inner.run_to_convergence()))
    }
}

#[wasm_bindgen]
pub struct GridWorldSession {
    inner: CoreSession,
}

#[wasm_bindgen]
impl GridWorldSession {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        width: u8,
        height: u8,
        start: u16,
        goal: u16,
        goal_mode: u8,
        hazards: Vec<u16>,
        slip_probability: f64,
        discount: f64,
        seed_hex: &str,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let config = GridWorldConfig {
            width,
            height,
            start,
            goal,
            goal_mode: GoalMode::try_from(goal_mode)
                .map_err(|error| error_value(error.code(), error.to_string()))?,
            hazards,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
            slip_probability,
            discount,
            seed: parse_seed(seed_hex)?,
        };
        let inner = CoreSession::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        let snapshot = self.inner.snapshot();
        serialize(&SnapshotPayload {
            state: snapshot.state,
            step_count: snapshot.step_count,
            cumulative_return: snapshot.cumulative_return,
            discounted_return: snapshot.discounted_return,
            done: snapshot.done,
            truncated: snapshot.truncated,
        })
    }

    pub fn reset(&mut self, seed_hex: &str) -> Result<JsValue, JsValue> {
        let snapshot = self.inner.reset(parse_seed(seed_hex)?);
        serialize(&SnapshotPayload {
            state: snapshot.state,
            step_count: snapshot.step_count,
            cumulative_return: snapshot.cumulative_return,
            discounted_return: snapshot.discounted_return,
            done: snapshot.done,
            truncated: snapshot.truncated,
        })
    }

    pub fn step(&mut self, action_code: u8) -> Result<JsValue, JsValue> {
        let action = Action::try_from(action_code)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let outcome = self
            .inner
            .step(action)
            .map_err(|error| error_value(error.code(), error.to_string()))?;

        serialize(&StepPayload {
            previous_state: outcome.previous_state,
            requested_action: outcome.requested_action.code(),
            actual_action: outcome.actual_action.code(),
            next_state: outcome.next_state,
            reward: outcome.reward,
            discount_weight: outcome.discount_weight,
            discounted_contribution: outcome.discounted_contribution,
            cumulative_return: outcome.cumulative_return,
            discounted_return: outcome.discounted_return,
            step_count: outcome.step_count,
            boundary_collision: outcome.boundary_collision,
            slipped: outcome.slipped,
            done: outcome.done,
            truncated: outcome.truncated,
        })
    }

    pub fn step_policy(&mut self, probabilities: Vec<f64>) -> Result<JsValue, JsValue> {
        let values: [f64; 5] = probabilities.try_into().map_err(|values: Vec<f64>| {
            error_value(
                "policy_length",
                format!("policy requires 5 probabilities, received {}", values.len()),
            )
        })?;
        let policy =
            Policy::new(values).map_err(|error| error_value(error.code(), error.to_string()))?;
        let outcome = self
            .inner
            .step_policy(&policy)
            .map_err(|error| error_value(error.code(), error.to_string()))?;

        serialize(&StepPayload {
            previous_state: outcome.previous_state,
            requested_action: outcome.requested_action.code(),
            actual_action: outcome.actual_action.code(),
            next_state: outcome.next_state,
            reward: outcome.reward,
            discount_weight: outcome.discount_weight,
            discounted_contribution: outcome.discounted_contribution,
            cumulative_return: outcome.cumulative_return,
            discounted_return: outcome.discounted_return,
            step_count: outcome.step_count,
            boundary_collision: outcome.boundary_collision,
            slipped: outcome.slipped,
            done: outcome.done,
            truncated: outcome.truncated,
        })
    }

    pub fn transition_model(&self) -> Result<JsValue, JsValue> {
        let outcomes: Vec<_> = self
            .inner
            .transition_model()
            .into_iter()
            .map(TransitionPayload::from)
            .collect();
        serialize(&outcomes)
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn creates_a_session_and_returns_a_snapshot() {
        let session = GridWorldSession::new(
            4,
            4,
            0,
            15,
            0,
            vec![6, 9],
            0.0,
            0.9,
            "5eed",
            -0.04,
            -1.0,
            -1.0,
            1.0,
        )
        .expect("valid session");
        assert!(session.snapshot().is_ok());
        assert!(session.transition_model().is_ok());
    }

    #[wasm_bindgen_test]
    fn evaluates_the_fixed_four_state_model() {
        let mut evaluator = BellmanEvaluator::new(0.9, 1e-8, 1_000).expect("valid evaluator");
        assert!(evaluator.snapshot().is_ok());
        assert!(evaluator.transition_model().is_ok());
        assert!(evaluator.bellman_update(0).is_ok());
        assert!(evaluator.exact_values().is_ok());
        assert!(evaluator.sweep().is_ok());
        assert!(evaluator.advance(3).is_ok());
        assert!(evaluator.run_to_convergence().is_ok());
        assert!(evaluator.reset().is_ok());
    }
}
