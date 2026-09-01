use mathrl_core::{
    Action, AdvanceOutcome as CoreAdvanceOutcome, BellmanEvaluator as CoreBellmanEvaluator,
    BellmanTerm as CoreBellmanTerm, BellmanUpdate as CoreBellmanUpdate, EvaluationConfig,
    EvaluationSnapshot as CoreEvaluationSnapshot, GoalMode, GridWorldConfig,
    GridWorldSession as CoreSession, OptimalityAdvanceOutcome as CoreOptimalityAdvanceOutcome,
    OptimalityConfig, OptimalityEvaluator as CoreOptimalityEvaluator,
    OptimalityReference as CoreOptimalityReference, OptimalitySnapshot as CoreOptimalitySnapshot,
    OptimalitySweepOutcome as CoreOptimalitySweepOutcome,
    OptimalityTransition as CoreOptimalityTransition, OptimalityUpdate as CoreOptimalityUpdate,
    Policy, Rewards, SweepOutcome as CoreSweepOutcome, Transition as CoreEvaluationTransition,
    TransitionOutcome,
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
struct OptimalitySnapshotPayload {
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    greedy_masks: [u8; 16],
    sweep_count: u32,
    residual: f64,
    converged: bool,
    truncated: bool,
}

impl From<CoreOptimalitySnapshot> for OptimalitySnapshotPayload {
    fn from(snapshot: CoreOptimalitySnapshot) -> Self {
        Self {
            values: snapshot.values,
            action_values: snapshot.action_values,
            greedy_masks: snapshot.greedy_masks,
            sweep_count: snapshot.sweep_count,
            residual: snapshot.residual,
            converged: snapshot.converged,
            truncated: snapshot.truncated,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimalityReferencePayload {
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    greedy_masks: [u8; 16],
    residual: f64,
}

impl From<CoreOptimalityReference> for OptimalityReferencePayload {
    fn from(reference: CoreOptimalityReference) -> Self {
        Self {
            values: reference.values,
            action_values: reference.action_values,
            greedy_masks: reference.greedy_masks,
            residual: reference.residual,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimalityTransitionPayload {
    state: u16,
    requested_action: u8,
    actual_action: u8,
    next_state: u16,
    probability: f64,
    reward: f64,
    boundary_collision: bool,
}

impl From<CoreOptimalityTransition> for OptimalityTransitionPayload {
    fn from(transition: CoreOptimalityTransition) -> Self {
        Self {
            state: transition.state,
            requested_action: transition.requested_action.code(),
            actual_action: transition.actual_action.code(),
            next_state: transition.next_state,
            probability: transition.probability,
            reward: transition.reward,
            boundary_collision: transition.boundary_collision,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimalityUpdatePayload {
    state: u16,
    old_value: f64,
    new_value: f64,
    delta: f64,
    action_values: [f64; 5],
    greedy_mask: u8,
}

impl From<CoreOptimalityUpdate> for OptimalityUpdatePayload {
    fn from(update: CoreOptimalityUpdate) -> Self {
        Self {
            state: update.state,
            old_value: update.old_value,
            new_value: update.new_value,
            delta: update.delta,
            action_values: update.action_values,
            greedy_mask: update.greedy_mask,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimalitySweepPayload {
    snapshot: OptimalitySnapshotPayload,
    updates: Vec<OptimalityUpdatePayload>,
    max_update: f64,
}

impl From<CoreOptimalitySweepOutcome> for OptimalitySweepPayload {
    fn from(outcome: CoreOptimalitySweepOutcome) -> Self {
        Self {
            snapshot: outcome.snapshot.into(),
            updates: outcome.updates.into_iter().map(Into::into).collect(),
            max_update: outcome.max_update,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OptimalityAdvancePayload {
    snapshot: OptimalitySnapshotPayload,
    residual_history: Vec<f64>,
}

impl From<CoreOptimalityAdvanceOutcome> for OptimalityAdvancePayload {
    fn from(outcome: CoreOptimalityAdvanceOutcome) -> Self {
        Self {
            snapshot: outcome.snapshot.into(),
            residual_history: outcome.residual_history,
        }
    }
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
pub struct OptimalityEvaluator {
    inner: CoreOptimalityEvaluator,
}

#[wasm_bindgen]
impl OptimalityEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        discount: f64,
        slip_probability: f64,
        tolerance: f64,
        max_sweeps: u32,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let config = OptimalityConfig {
            discount,
            slip_probability,
            tolerance,
            max_sweeps,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
        };
        let inner = CoreOptimalityEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&OptimalitySnapshotPayload::from(self.inner.snapshot()))
    }

    pub fn reset(&mut self) -> Result<JsValue, JsValue> {
        serialize(&OptimalitySnapshotPayload::from(self.inner.reset()))
    }

    pub fn transition_model(&self) -> Result<JsValue, JsValue> {
        let transitions: Vec<_> = self
            .inner
            .transition_model()
            .into_iter()
            .map(OptimalityTransitionPayload::from)
            .collect();
        serialize(&transitions)
    }

    pub fn reference_solution(&self) -> Result<JsValue, JsValue> {
        serialize(&OptimalityReferencePayload::from(
            self.inner.reference_solution(),
        ))
    }

    pub fn sweep(&mut self) -> Result<JsValue, JsValue> {
        serialize(&OptimalitySweepPayload::from(self.inner.sweep()))
    }

    pub fn advance(&mut self, sweeps: u32) -> Result<JsValue, JsValue> {
        serialize(&OptimalityAdvancePayload::from(self.inner.advance(sweeps)))
    }

    pub fn run_to_convergence(&mut self) -> Result<JsValue, JsValue> {
        serialize(&OptimalityAdvancePayload::from(
            self.inner.run_to_convergence(),
        ))
    }
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
    use serde::Deserialize;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestOptimalitySnapshot {
        values: Vec<f64>,
        action_values: Vec<Vec<f64>>,
        greedy_masks: Vec<u8>,
        sweep_count: u32,
        residual: f64,
        converged: bool,
        truncated: bool,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestOptimalityReference {
        values: Vec<f64>,
        action_values: Vec<Vec<f64>>,
        greedy_masks: Vec<u8>,
        residual: f64,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestOptimalityTransition {
        state: u16,
        requested_action: u8,
        actual_action: u8,
        next_state: u16,
        probability: f64,
        reward: f64,
        boundary_collision: bool,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestOptimalityUpdate {
        state: u16,
        old_value: f64,
        new_value: f64,
        delta: f64,
        action_values: Vec<f64>,
        greedy_mask: u8,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestOptimalitySweep {
        snapshot: TestOptimalitySnapshot,
        updates: Vec<TestOptimalityUpdate>,
        max_update: f64,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestOptimalityAdvance {
        snapshot: TestOptimalitySnapshot,
        residual_history: Vec<f64>,
    }

    fn from_js<T: for<'de> Deserialize<'de>>(value: JsValue) -> T {
        serde_wasm_bindgen::from_value(value).expect("payload follows the documented JS contract")
    }

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

    #[wasm_bindgen_test]
    fn solves_bellman_optimality_on_the_shared_grid() {
        let mut evaluator =
            OptimalityEvaluator::new(0.9, 0.0, 1e-12, 1_000, -0.04, -1.0, -1.0, 1.0)
                .expect("valid evaluator");

        let initial: TestOptimalitySnapshot =
            from_js(evaluator.snapshot().expect("snapshot serializes"));
        assert_eq!(initial.values, vec![0.0; 16]);
        assert_eq!(initial.action_values.len(), 16);
        assert!(initial.action_values.iter().all(|row| row.len() == 5));
        assert_eq!(initial.greedy_masks.len(), 16);
        assert_eq!(initial.sweep_count, 0);
        assert_eq!(initial.residual, 1.0);
        assert!(!initial.converged);
        assert!(!initial.truncated);

        let model: Vec<TestOptimalityTransition> =
            from_js(evaluator.transition_model().expect("model serializes"));
        assert_eq!(model.len(), 75);
        let hazard_entry = model
            .iter()
            .find(|transition| {
                transition.state == 5
                    && transition.requested_action == Action::Right.code()
                    && transition.actual_action == Action::Right.code()
            })
            .expect("shared Grid World hazard entry is exposed");
        assert_eq!(hazard_entry.next_state, 6);
        assert_eq!(hazard_entry.probability, 1.0);
        assert_eq!(hazard_entry.reward, -1.0);
        assert!(!hazard_entry.boundary_collision);

        let reference: TestOptimalityReference = from_js(
            evaluator
                .reference_solution()
                .expect("reference serializes"),
        );
        assert_eq!(reference.values.len(), 16);
        assert_eq!(reference.action_values.len(), 16);
        assert!(reference.action_values.iter().all(|row| row.len() == 5));
        assert_eq!(reference.greedy_masks.len(), 16);
        assert!((reference.values[0] - 0.426_686).abs() <= 1e-12);
        assert_eq!(reference.greedy_masks[0], 0b00110);
        assert!(reference.residual <= 1e-12);

        let first: TestOptimalitySweep = from_js(evaluator.sweep().expect("sweep serializes"));
        assert_eq!(first.snapshot.sweep_count, 1);
        assert_eq!(first.snapshot.values[11], 1.0);
        assert_eq!(first.snapshot.residual, 0.9);
        assert_eq!(first.updates.len(), 16);
        assert_eq!(first.max_update, 1.0);
        let state_ten = &first.updates[10];
        assert_eq!(state_ten.state, 10);
        assert_eq!(state_ten.old_value, 0.0);
        assert_eq!(state_ten.new_value, -0.04);
        assert_eq!(state_ten.delta, -0.04);
        assert_eq!(state_ten.action_values.len(), 5);
        assert_ne!(state_ten.greedy_mask, 0);

        let advanced: TestOptimalityAdvance =
            from_js(evaluator.advance(2).expect("advance serializes"));
        assert_eq!(advanced.snapshot.sweep_count, 3);
        assert_eq!(advanced.residual_history.len(), 3);
        assert_eq!(advanced.residual_history[0], 0.9);

        let converged: TestOptimalityAdvance = from_js(
            evaluator
                .run_to_convergence()
                .expect("converged run serializes"),
        );
        assert_eq!(converged.snapshot.sweep_count, 6);
        assert!(converged.snapshot.converged);
        assert!(!converged.snapshot.truncated);

        let reset: TestOptimalitySnapshot = from_js(evaluator.reset().expect("reset serializes"));
        assert_eq!(reset.sweep_count, 0);
        assert_eq!(reset.values, vec![0.0; 16]);
    }
}
