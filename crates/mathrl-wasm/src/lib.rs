use mathrl_core::{
    Action, AdvanceOutcome as CoreAdvanceOutcome, BellmanEvaluator as CoreBellmanEvaluator,
    BellmanTerm as CoreBellmanTerm, BellmanUpdate as CoreBellmanUpdate, EvaluationConfig,
    EvaluationSnapshot as CoreEvaluationSnapshot, GoalMode, GridWorldConfig,
    GridWorldSession as CoreSession, MeanEstimationConfig as CoreMeanEstimationConfig,
    MeanEstimator as CoreMeanEstimator, MonteCarloConfig as CoreMonteCarloConfig,
    MonteCarloEpisode as CoreMonteCarloEpisode,
    MonteCarloEpisodeOutcome as CoreMonteCarloEpisodeOutcome,
    MonteCarloEvaluator as CoreMonteCarloEvaluator, MonteCarloMode as CoreMonteCarloMode,
    MonteCarloObjective as CoreMonteCarloObjective, MonteCarloSnapshot as CoreMonteCarloSnapshot,
    MonteCarloVisitStrategy as CoreMonteCarloVisitStrategy,
    OptimalityAdvanceOutcome as CoreOptimalityAdvanceOutcome, OptimalityConfig,
    OptimalityEvaluator as CoreOptimalityEvaluator, OptimalityReference as CoreOptimalityReference,
    OptimalitySnapshot as CoreOptimalitySnapshot,
    OptimalitySweepOutcome as CoreOptimalitySweepOutcome,
    OptimalityTransition as CoreOptimalityTransition, OptimalityUpdate as CoreOptimalityUpdate,
    PlanningAdvanceOutcome as CorePlanningAdvanceOutcome, PlanningConfig as CorePlanningConfig,
    PlanningEvaluator as CorePlanningEvaluator, PlanningMode as CorePlanningMode,
    PlanningPhase as CorePlanningPhase, PlanningReference as CorePlanningReference,
    PlanningSnapshot as CorePlanningSnapshot, PlanningStepOutcome as CorePlanningStepOutcome,
    PlanningTransition as CorePlanningTransition, PlanningUpdate as CorePlanningUpdate, Policy,
    Rewards, StochasticApproximationAdvanceOutcome as CoreStochasticApproximationAdvanceOutcome,
    StochasticApproximationConfig as CoreStochasticApproximationConfig,
    StochasticApproximationEvaluator as CoreStochasticApproximationEvaluator,
    StochasticApproximationIteration as CoreStochasticApproximationIteration,
    StochasticApproximationMode as CoreStochasticApproximationMode,
    StochasticApproximationOutcome as CoreStochasticApproximationOutcome,
    StochasticApproximationRootFunction as CoreStochasticApproximationRootFunction,
    StochasticApproximationSchedule as CoreStochasticApproximationSchedule,
    SweepOutcome as CoreSweepOutcome, Transition as CoreEvaluationTransition, TransitionOutcome,
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
struct PlanningCostPayload {
    backups: u64,
    policy_evaluations: u64,
    improvement_steps: u64,
    /// Fixed-size action-evaluation slots, including terminal no-op slots.
    action_evaluations: u64,
}

impl From<mathrl_core::PlanningCost> for PlanningCostPayload {
    fn from(cost: mathrl_core::PlanningCost) -> Self {
        Self {
            backups: cost.backups,
            policy_evaluations: cost.policy_evaluation_sweeps,
            improvement_steps: cost.policy_improvement_steps,
            action_evaluations: cost.action_evaluations,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanningSnapshotPayload {
    mode: String,
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    greedy_masks: [u8; 16],
    policy_masks: [u8; 16],
    /// `-1` represents the terminal state; action codes are 0..4 elsewhere.
    policy: [i16; 16],
    outer_iteration: u32,
    evaluation_sweep: u32,
    residual: f64,
    value_residual: f64,
    evaluation_residual: f64,
    policy_stable: bool,
    converged: bool,
    truncated: bool,
    /// True when the most recent exact PI evaluation stopped at its safety
    /// cap before reaching the requested inner tolerance.
    evaluation_truncated: bool,
    cost: PlanningCostPayload,
}

impl From<CorePlanningSnapshot> for PlanningSnapshotPayload {
    fn from(snapshot: CorePlanningSnapshot) -> Self {
        Self {
            mode: snapshot.mode.code().to_owned(),
            values: snapshot.values,
            action_values: snapshot.action_values,
            greedy_masks: snapshot.greedy_masks,
            policy_masks: snapshot.policy_masks,
            policy: snapshot
                .policy
                .map(|action| if action == u8::MAX { -1 } else { action as i16 }),
            outer_iteration: snapshot.outer_iteration,
            evaluation_sweep: snapshot.evaluation_sweeps,
            residual: snapshot.residual,
            value_residual: snapshot.value_residual,
            evaluation_residual: snapshot.evaluation_residual,
            policy_stable: snapshot.policy_stable,
            converged: snapshot.converged,
            truncated: snapshot.truncated,
            evaluation_truncated: snapshot.evaluation_truncated,
            cost: snapshot.cost.into(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanningReferencePayload {
    values: [f64; 16],
    action_values: [[f64; 5]; 16],
    greedy_masks: [u8; 16],
    residual: f64,
}

impl From<CorePlanningReference> for PlanningReferencePayload {
    fn from(reference: CorePlanningReference) -> Self {
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
struct PlanningTransitionPayload {
    state: u16,
    requested_action: u8,
    actual_action: u8,
    next_state: u16,
    probability: f64,
    reward: f64,
    boundary_collision: bool,
}

impl From<CorePlanningTransition> for PlanningTransitionPayload {
    fn from(transition: CorePlanningTransition) -> Self {
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
struct PlanningUpdatePayload {
    state: u16,
    old_value: f64,
    new_value: f64,
    delta: f64,
    action_values: [f64; 5],
    greedy_mask: u8,
    policy_mask: u8,
    policy: i16,
    policy_before: i16,
    policy_after: i16,
}

fn action_code_payload(action: u8) -> i16 {
    if action == u8::MAX { -1 } else { action as i16 }
}

impl From<CorePlanningUpdate> for PlanningUpdatePayload {
    fn from(update: CorePlanningUpdate) -> Self {
        let policy_before = action_code_payload(update.policy_before);
        let policy_after = action_code_payload(update.policy_after);
        let policy = policy_after;
        let policy_mask = if policy < 0 { 0 } else { 1_u8 << policy };
        Self {
            state: update.state,
            old_value: update.old_value,
            new_value: update.new_value,
            delta: update.delta,
            action_values: update.action_values,
            greedy_mask: update.greedy_mask,
            policy_mask,
            policy,
            policy_before,
            policy_after,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanningPhasePayload {
    kind: String,
    sweeps: u32,
    changed_states: u16,
    residual: f64,
    outer_iteration: u32,
    max_update: f64,
    policy_stable: bool,
}

impl From<CorePlanningPhase> for PlanningPhasePayload {
    fn from(phase: CorePlanningPhase) -> Self {
        Self {
            kind: match phase.kind {
                mathrl_core::PlanningPhaseKind::ValueBackup => "backup",
                mathrl_core::PlanningPhaseKind::PolicyEvaluation => "evaluation",
                mathrl_core::PlanningPhaseKind::PolicyImprovement => "improvement",
            }
            .to_owned(),
            sweeps: phase.sweeps,
            changed_states: phase.changed_states,
            residual: phase.residual,
            outer_iteration: phase.outer_iteration,
            max_update: phase.max_update,
            policy_stable: phase.policy_stable,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanningStepPayload {
    snapshot: PlanningSnapshotPayload,
    updates: Vec<PlanningUpdatePayload>,
    residual_history: Vec<f64>,
    phases: Vec<PlanningPhasePayload>,
    max_update: f64,
}

impl From<CorePlanningStepOutcome> for PlanningStepPayload {
    fn from(outcome: CorePlanningStepOutcome) -> Self {
        Self {
            snapshot: outcome.snapshot.into(),
            updates: outcome.updates.into_iter().map(Into::into).collect(),
            residual_history: outcome.residual_history,
            phases: outcome.phases.into_iter().map(Into::into).collect(),
            max_update: outcome.max_update,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanningAdvancePayload {
    snapshot: PlanningSnapshotPayload,
    updates: Vec<PlanningUpdatePayload>,
    residual_history: Vec<f64>,
    phases: Vec<PlanningPhasePayload>,
}

impl From<CorePlanningAdvanceOutcome> for PlanningAdvancePayload {
    fn from(outcome: CorePlanningAdvanceOutcome) -> Self {
        Self {
            snapshot: outcome.snapshot.into(),
            updates: Vec::new(),
            residual_history: outcome.residual_history,
            phases: outcome.phases.into_iter().map(Into::into).collect(),
        }
    }
}

// Chapter 5 payloads intentionally mirror `monteCarloProtocol.ts`.  The
// adapter exposes realised trajectories and running estimates only; it does
// not export a transition table or any other model-side rows.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloStepPayload {
    state: u16,
    action: u8,
    /// The action sampled by the environment after wind/slip.  `action`
    /// remains the requested policy action used for the MC state--action key.
    actual_action: u8,
    next_state: u16,
    reward: f64,
    discount_weight: f64,
    discounted_reward: f64,
    done: bool,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloReturnPayload {
    time: u32,
    state: u16,
    action: u8,
    #[serde(rename = "return")]
    r#return: f64,
    included: bool,
    count: u32,
    estimate: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloEpisodePayload {
    number: u32,
    start_state: u16,
    start_action: u8,
    steps: Vec<MonteCarloStepPayload>,
    returns: Vec<MonteCarloReturnPayload>,
    total_return: f64,
    length: u32,
    done: bool,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloSnapshotPayload {
    mode: String,
    visit_strategy: String,
    epsilon: f64,
    episode_count: u32,
    total_steps: u64,
    values: Vec<f64>,
    action_values: Vec<Vec<f64>>,
    visit_counts: Vec<Vec<u32>>,
    return_sums: Vec<Vec<f64>>,
    variances: Vec<Vec<f64>>,
    policy_probabilities: Vec<Vec<f64>>,
    policy: Vec<i16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_episode: Option<MonteCarloEpisodePayload>,
    seed_hex: String,
    wind_probability: f64,
    truncated: bool,
    episode_return_mean: f64,
    episode_return_variance: f64,
    policy_changes: u32,
    covered_pairs: u32,
    exhausted: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloAuditPayload {
    model_free: bool,
    model_rows: u32,
    observed_steps: u64,
    credited_returns: u32,
    unvisited_pairs: u32,
    finite: bool,
    message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloOutcomePayload {
    snapshot: MonteCarloSnapshotPayload,
    episode: MonteCarloEpisodePayload,
    audit: MonteCarloAuditPayload,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MeanEstimationSnapshotPayload {
    seed_hex: String,
    sample_count: u32,
    samples: Vec<f64>,
    mean: f64,
    variance: f64,
    expected_mean: f64,
    exhausted: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MeanEstimationOutcomePayload {
    snapshot: MeanEstimationSnapshotPayload,
    new_samples: Vec<f64>,
}

// Chapter 6 payloads mirror `stochasticApproximationProtocol.ts`.  The
// scalar trace intentionally carries both the noisy observation and the
// effective update signal so a reader can audit `w_{k+1}=w_k-a_k g_hat`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StochasticApproximationIterationPayload {
    index: u32,
    /// Alias for consumers that label the horizontal axis `k`.
    k: u32,
    w_before: f64,
    w_after: f64,
    /// Alias for the current iterate used by compact chart code.
    w: f64,
    alpha: f64,
    alpha_squared: f64,
    observation: f64,
    gradient: f64,
    noise: f64,
    target: f64,
    error: f64,
    absolute_error: f64,
    objective: f64,
    /// Alias commonly called `loss` in SGD views.
    loss: f64,
    update: f64,
    batch_size: u32,
    batch_indices: Vec<u32>,
    projected: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StochasticApproximationSnapshotPayload {
    mode: String,
    schedule: String,
    root_function: String,
    target: f64,
    root: f64,
    initial_w: f64,
    current_w: f64,
    w: f64,
    alpha: f64,
    polynomial_power: f64,
    noise_std: f64,
    sample_count: u32,
    batch_size: u32,
    dataset_size: u32,
    tolerance: f64,
    seed_hex: String,
    iteration_count: u32,
    alpha_sum: f64,
    alpha_squared_sum: f64,
    noise_sum: f64,
    noise_mean: f64,
    noise_variance: f64,
    error: f64,
    root_residual: f64,
    absolute_error: f64,
    objective: f64,
    loss: f64,
    step_size_conditions: bool,
    converged: bool,
    truncated: bool,
    exhausted: bool,
    last_iteration: Option<StochasticApproximationIterationPayload>,
    history: Vec<StochasticApproximationIterationPayload>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StochasticApproximationDiagnosticsPayload {
    alpha_sum: f64,
    alpha_squared_sum: f64,
    noise_sum: f64,
    noise_mean: f64,
    noise_variance: f64,
    error: f64,
    root_residual: f64,
    objective: f64,
    converged: bool,
    truncated: bool,
    exhausted: bool,
    step_size_conditions: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StochasticApproximationOutcomePayload {
    snapshot: StochasticApproximationSnapshotPayload,
    iteration: StochasticApproximationIterationPayload,
    diagnostics: StochasticApproximationDiagnosticsPayload,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StochasticApproximationAdvancePayload {
    snapshot: StochasticApproximationSnapshotPayload,
    iterations: Vec<StochasticApproximationIterationPayload>,
    diagnostics: StochasticApproximationDiagnosticsPayload,
}

fn monte_carlo_seed_hex(seed: u64) -> String {
    format!("{seed:016x}")
}

fn monte_carlo_return_rows(
    episode: &CoreMonteCarloEpisode,
    snapshot: &CoreMonteCarloSnapshot,
) -> Vec<MonteCarloReturnPayload> {
    let mut first_pair_seen = [[false; 5]; 16];
    episode
        .steps
        .iter()
        .enumerate()
        .map(|(index, step)| {
            let state = step.state as usize;
            let action = step.requested_action as usize;
            let pair_first = state < 16 && action < 5 && !first_pair_seen[state][action];
            if state < 16 && action < 5 {
                first_pair_seen[state][action] = true;
            }
            let included = match snapshot.visit_strategy {
                CoreMonteCarloVisitStrategy::Initial => index == 0,
                CoreMonteCarloVisitStrategy::First => pair_first,
                CoreMonteCarloVisitStrategy::Every => true,
            };
            let count = snapshot
                .visits
                .get(state)
                .and_then(|row| row.get(action))
                .copied()
                .unwrap_or(0);
            let estimate = snapshot
                .q_values
                .get(state)
                .and_then(|row| row.get(action))
                .copied()
                .unwrap_or(0.0);
            MonteCarloReturnPayload {
                time: index as u32,
                state: step.state,
                action: step.requested_action.code(),
                r#return: step.return_value,
                included,
                count,
                estimate,
            }
        })
        .collect()
}

fn monte_carlo_episode_payload(
    episode: &CoreMonteCarloEpisode,
    snapshot: &CoreMonteCarloSnapshot,
) -> MonteCarloEpisodePayload {
    let last_index = episode.steps.len().saturating_sub(1);
    let steps = episode
        .steps
        .iter()
        .enumerate()
        .map(|(index, step)| MonteCarloStepPayload {
            state: step.state,
            action: step.requested_action.code(),
            actual_action: step.actual_action.code(),
            next_state: step.next_state,
            reward: step.reward,
            discount_weight: step.discount_weight,
            discounted_reward: step.discounted_contribution,
            done: episode.terminated && index == last_index,
            truncated: episode.truncated && index == last_index,
        })
        .collect();
    MonteCarloEpisodePayload {
        // Core episode indices are zero based; the public trace is numbered
        // from one so it reads naturally in the browser.
        number: episode.index.saturating_add(1),
        start_state: episode.start_state,
        start_action: episode.start_action.code(),
        steps,
        returns: monte_carlo_return_rows(episode, snapshot),
        total_return: episode.discounted_return,
        length: episode.steps.len() as u32,
        done: episode.terminated,
        truncated: episode.truncated,
    }
}

fn monte_carlo_snapshot_payload(
    snapshot: &CoreMonteCarloSnapshot,
    last_episode: Option<&CoreMonteCarloEpisode>,
    epsilon: f64,
    wind_probability: f64,
) -> MonteCarloSnapshotPayload {
    MonteCarloSnapshotPayload {
        mode: snapshot.mode.as_str().to_owned(),
        visit_strategy: snapshot.visit_strategy.as_str().to_owned(),
        epsilon,
        episode_count: snapshot.episode_count,
        total_steps: snapshot.total_steps,
        values: snapshot.values.to_vec(),
        action_values: snapshot.q_values.iter().map(|row| row.to_vec()).collect(),
        visit_counts: snapshot.visits.iter().map(|row| row.to_vec()).collect(),
        return_sums: snapshot.returns.iter().map(|row| row.to_vec()).collect(),
        variances: snapshot.variances.iter().map(|row| row.to_vec()).collect(),
        policy_probabilities: snapshot
            .policy_probabilities
            .iter()
            .map(|row| row.to_vec())
            .collect(),
        policy: snapshot
            .policy
            .iter()
            .map(|action| {
                if *action == u8::MAX {
                    -1
                } else {
                    *action as i16
                }
            })
            .collect(),
        last_episode: last_episode.map(|episode| monte_carlo_episode_payload(episode, snapshot)),
        seed_hex: monte_carlo_seed_hex(snapshot.seed),
        wind_probability,
        truncated: snapshot.last_episode_truncated,
        episode_return_mean: snapshot.episode_return_mean,
        episode_return_variance: snapshot.episode_return_variance,
        policy_changes: snapshot.last_policy_changes,
        covered_pairs: snapshot.covered_state_actions,
        exhausted: snapshot.exhausted,
    }
}

fn monte_carlo_audit_payload(
    snapshot: &CoreMonteCarloSnapshot,
    episode: &CoreMonteCarloEpisode,
) -> MonteCarloAuditPayload {
    let finite = snapshot.values.iter().all(|value| value.is_finite())
        && snapshot
            .q_values
            .iter()
            .flatten()
            .all(|value| value.is_finite())
        && snapshot
            .returns
            .iter()
            .flatten()
            .all(|value| value.is_finite())
        && snapshot
            .variances
            .iter()
            .flatten()
            .all(|value| value.is_finite())
        && snapshot
            .policy_probabilities
            .iter()
            .flatten()
            .all(|value| value.is_finite());
    let covered = snapshot.covered_state_actions.min(15 * 5);
    let credited_returns = monte_carlo_return_rows(episode, snapshot)
        .iter()
        .filter(|row| row.included)
        .count() as u32;
    MonteCarloAuditPayload {
        model_free: true,
        model_rows: 0,
        observed_steps: snapshot.total_steps,
        credited_returns,
        unvisited_pairs: 15 * 5 - covered,
        finite,
        message: Some(
            "Updates use realised episodic returns; no transition model is read.".to_owned(),
        ),
    }
}

fn monte_carlo_empty_episode() -> CoreMonteCarloEpisode {
    CoreMonteCarloEpisode {
        index: 0,
        start_state: 0,
        start_action: Action::Stay,
        steps: Vec::new(),
        return_value: 0.0,
        discounted_return: 0.0,
        undiscounted_return: 0.0,
        terminated: false,
        truncated: false,
        updates: Vec::new(),
    }
}

fn mean_snapshot_payload(
    snapshot: mathrl_core::MeanEstimationSnapshot,
) -> MeanEstimationSnapshotPayload {
    MeanEstimationSnapshotPayload {
        seed_hex: monte_carlo_seed_hex(snapshot.seed),
        sample_count: snapshot.sample_count,
        samples: snapshot.samples,
        mean: snapshot.mean,
        variance: snapshot.variance,
        expected_mean: snapshot.expected_mean,
        exhausted: snapshot.exhausted,
    }
}

fn stochastic_iteration_payload(
    iteration: &CoreStochasticApproximationIteration,
) -> StochasticApproximationIterationPayload {
    StochasticApproximationIterationPayload {
        index: iteration.index,
        k: iteration.index,
        w_before: iteration.w_before,
        w_after: iteration.w_after,
        w: iteration.w_after,
        alpha: iteration.alpha,
        alpha_squared: iteration.alpha_squared,
        observation: iteration.observation,
        gradient: iteration.gradient,
        noise: iteration.noise,
        target: iteration.target,
        error: iteration.error,
        absolute_error: iteration.absolute_error,
        objective: iteration.objective,
        loss: iteration.objective,
        update: iteration.update,
        batch_size: iteration.batch_size,
        batch_indices: iteration.batch_indices.clone(),
        projected: iteration.projected,
    }
}

fn stochastic_snapshot_payload(
    snapshot: &mathrl_core::StochasticApproximationSnapshot,
) -> StochasticApproximationSnapshotPayload {
    StochasticApproximationSnapshotPayload {
        mode: snapshot.mode.as_str().to_owned(),
        schedule: snapshot.schedule.as_str().to_owned(),
        root_function: snapshot.root_function.as_str().to_owned(),
        target: snapshot.target,
        root: snapshot.root,
        initial_w: snapshot.initial_w,
        current_w: snapshot.current_w,
        w: snapshot.current_w,
        alpha: snapshot.alpha,
        polynomial_power: snapshot.polynomial_power,
        noise_std: snapshot.noise_std,
        sample_count: snapshot.sample_count,
        batch_size: snapshot.batch_size,
        dataset_size: snapshot.dataset_size,
        tolerance: snapshot.tolerance,
        seed_hex: monte_carlo_seed_hex(snapshot.seed),
        iteration_count: snapshot.iteration_count,
        alpha_sum: snapshot.alpha_sum,
        alpha_squared_sum: snapshot.alpha_squared_sum,
        noise_sum: snapshot.noise_sum,
        noise_mean: snapshot.noise_mean,
        noise_variance: snapshot.noise_variance,
        error: snapshot.error,
        root_residual: snapshot.root_residual,
        absolute_error: snapshot.absolute_error,
        objective: snapshot.objective,
        loss: snapshot.objective,
        step_size_conditions: snapshot.step_size_conditions,
        converged: snapshot.converged,
        truncated: snapshot.truncated,
        exhausted: snapshot.exhausted,
        last_iteration: snapshot
            .last_iteration
            .as_ref()
            .map(stochastic_iteration_payload),
        history: snapshot
            .history
            .iter()
            .map(stochastic_iteration_payload)
            .collect(),
    }
}

fn stochastic_diagnostics_payload(
    snapshot: &mathrl_core::StochasticApproximationSnapshot,
) -> StochasticApproximationDiagnosticsPayload {
    StochasticApproximationDiagnosticsPayload {
        alpha_sum: snapshot.alpha_sum,
        alpha_squared_sum: snapshot.alpha_squared_sum,
        noise_sum: snapshot.noise_sum,
        noise_mean: snapshot.noise_mean,
        noise_variance: snapshot.noise_variance,
        error: snapshot.error,
        root_residual: snapshot.root_residual,
        objective: snapshot.objective,
        converged: snapshot.converged,
        truncated: snapshot.truncated,
        exhausted: snapshot.exhausted,
        step_size_conditions: snapshot.step_size_conditions,
    }
}

fn stochastic_outcome_payload(
    outcome: CoreStochasticApproximationOutcome,
) -> StochasticApproximationOutcomePayload {
    let snapshot = outcome.snapshot;
    StochasticApproximationOutcomePayload {
        diagnostics: stochastic_diagnostics_payload(&snapshot),
        snapshot: stochastic_snapshot_payload(&snapshot),
        iteration: stochastic_iteration_payload(&outcome.iteration),
    }
}

fn stochastic_advance_payload(
    outcome: CoreStochasticApproximationAdvanceOutcome,
) -> StochasticApproximationAdvancePayload {
    let snapshot = outcome.snapshot;
    StochasticApproximationAdvancePayload {
        diagnostics: stochastic_diagnostics_payload(&snapshot),
        snapshot: stochastic_snapshot_payload(&snapshot),
        iterations: outcome
            .iterations
            .iter()
            .map(stochastic_iteration_payload)
            .collect(),
    }
}

/// Wasm adapter for the Chapter 6 scalar stochastic-approximation laboratory.
///
/// The final `root_function` argument is optional so callers from the first
/// linear-only build remain source compatible; omitted/`undefined` means
/// `linear`.  The worker normally supplies `linear`, `tanh`, or `cubic`.
#[wasm_bindgen]
pub struct StochasticApproximationEvaluator {
    inner: CoreStochasticApproximationEvaluator,
}

#[wasm_bindgen]
impl StochasticApproximationEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mode: String,
        schedule: String,
        target: f64,
        initial_w: f64,
        alpha: f64,
        polynomial_power: f64,
        noise_std: f64,
        sample_count: u32,
        batch_size: u32,
        tolerance: f64,
        seed_hex: &str,
        root_function: Option<String>,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let mode = CoreStochasticApproximationMode::try_from(mode.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let schedule = CoreStochasticApproximationSchedule::try_from(schedule.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let root_function = CoreStochasticApproximationRootFunction::try_from(
            root_function.as_deref().unwrap_or("linear"),
        )
        .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CoreStochasticApproximationConfig {
            mode,
            schedule,
            root_function,
            target,
            initial_w,
            alpha,
            polynomial_power,
            noise_std,
            sample_count,
            batch_size,
            tolerance,
            seed: parse_stochastic_approximation_seed(seed_hex)?,
        };
        let inner = CoreStochasticApproximationEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    /// Explicit factory alias useful to code that wants to make the
    /// optional root-function argument obvious.
    #[wasm_bindgen(js_name = newWithRootFunction)]
    #[allow(clippy::too_many_arguments)]
    pub fn new_with_root_function(
        mode: String,
        schedule: String,
        target: f64,
        initial_w: f64,
        alpha: f64,
        polynomial_power: f64,
        noise_std: f64,
        sample_count: u32,
        batch_size: u32,
        tolerance: f64,
        seed_hex: &str,
        root_function: String,
    ) -> Result<Self, JsValue> {
        Self::new(
            mode,
            schedule,
            target,
            initial_w,
            alpha,
            polynomial_power,
            noise_std,
            sample_count,
            batch_size,
            tolerance,
            seed_hex,
            Some(root_function),
        )
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&stochastic_snapshot_payload(&self.inner.snapshot()))
    }

    pub fn iteration(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .iteration()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&stochastic_outcome_payload(outcome))
    }

    #[wasm_bindgen(js_name = step)]
    pub fn step_alias(&mut self) -> Result<JsValue, JsValue> {
        self.iteration()
    }

    #[wasm_bindgen(js_name = update)]
    pub fn update(&mut self) -> Result<JsValue, JsValue> {
        self.iteration()
    }

    pub fn advance(&mut self, iterations: u32) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .advance(iterations)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&stochastic_advance_payload(outcome))
    }

    #[wasm_bindgen(js_name = runIterations)]
    pub fn run_iterations(&mut self, iterations: u32) -> Result<JsValue, JsValue> {
        self.advance(iterations)
    }

    /// Drain the configured finite update budget.  The browser worker uses
    /// bounded `advance` calls for normal animation and keeps this method as a
    /// convenience for native/diagnostic callers.
    pub fn run_to_completion(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .run_to_completion()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        serialize(&stochastic_advance_payload(outcome))
    }

    #[wasm_bindgen(js_name = runToCompletion)]
    pub fn run_to_completion_alias(&mut self) -> Result<JsValue, JsValue> {
        self.run_to_completion()
    }

    pub fn reset(&mut self, seed_hex: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex
            .as_deref()
            .map(parse_stochastic_approximation_seed)
            .transpose()?;
        serialize(&stochastic_snapshot_payload(&self.inner.reset(seed)))
    }

    #[wasm_bindgen(js_name = iterationCount)]
    pub fn iteration_count(&self) -> u32 {
        self.inner.iteration_count()
    }

    #[wasm_bindgen(js_name = lastIteration)]
    pub fn last_iteration(&self) -> Result<JsValue, JsValue> {
        let payload = self
            .inner
            .last_iteration()
            .map(stochastic_iteration_payload);
        serialize(&payload)
    }

    #[wasm_bindgen(js_name = stepSize)]
    pub fn step_size(&self, index: u32) -> f64 {
        self.inner.step_size(index)
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

/// Wasm adapter for the Chapter 5 episodic Monte Carlo laboratory.
///
/// Constructor arguments intentionally follow the worker's positional ABI:
/// mode, visit strategy, objective, numeric controls, hexadecimal seed, then
/// the four reward values.  All learning remains in the model-free core; the
/// browser receives only realised episodes and estimate snapshots.
#[wasm_bindgen]
pub struct MonteCarloEvaluator {
    inner: CoreMonteCarloEvaluator,
}

#[wasm_bindgen]
impl MonteCarloEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mode: String,
        visit_strategy: String,
        objective: String,
        discount: f64,
        slip_probability: f64,
        epsilon: f64,
        episodes_per_step: u32,
        max_episodes: u32,
        max_steps: u32,
        seed_hex: &str,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let mode = CoreMonteCarloMode::try_from(mode.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let visit_strategy = CoreMonteCarloVisitStrategy::try_from(visit_strategy.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let objective = CoreMonteCarloObjective::try_from(objective.as_str())
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = CoreMonteCarloConfig {
            mode,
            visit_strategy,
            objective,
            discount,
            slip_probability,
            epsilon,
            episodes_per_step,
            max_episodes,
            max_steps,
            seed: parse_monte_carlo_seed(seed_hex)?,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
        };
        let inner = CoreMonteCarloEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        let snapshot = self.inner.snapshot();
        let config = self.inner.config();
        serialize(&monte_carlo_snapshot_payload(
            &snapshot,
            self.inner.last_episode(),
            config.epsilon,
            config.slip_probability,
        ))
    }

    pub fn episode(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .episode()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = self.inner.config();
        serialize(&monte_carlo_outcome_payload(
            outcome,
            config.epsilon,
            config.slip_probability,
        ))
    }

    /// Compatibility aliases used by early worker builds.
    #[wasm_bindgen(js_name = sampleEpisode)]
    pub fn sample_episode(&mut self) -> Result<JsValue, JsValue> {
        self.episode()
    }

    #[wasm_bindgen(js_name = sample_episode)]
    pub fn sample_episode_snake(&mut self) -> Result<JsValue, JsValue> {
        self.episode()
    }

    #[wasm_bindgen(js_name = startEpisode)]
    pub fn start_episode(&mut self) -> Result<JsValue, JsValue> {
        self.episode()
    }

    #[wasm_bindgen(js_name = stepEpisode)]
    pub fn step_episode(&mut self) -> Result<JsValue, JsValue> {
        self.episode()
    }

    pub fn advance(&mut self, episodes: u32) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .advance(episodes)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = self.inner.config();
        serialize(&monte_carlo_advance_as_outcome(
            outcome,
            self.inner.last_episode(),
            config.epsilon,
            config.slip_probability,
        ))
    }

    #[wasm_bindgen(js_name = runEpisodes)]
    pub fn run_episodes(&mut self, episodes: u32) -> Result<JsValue, JsValue> {
        self.advance(episodes)
    }

    #[wasm_bindgen(js_name = run_episodes)]
    pub fn run_episodes_snake(&mut self, episodes: u32) -> Result<JsValue, JsValue> {
        self.advance(episodes)
    }

    #[wasm_bindgen(js_name = run)]
    pub fn run(&mut self, episodes: u32) -> Result<JsValue, JsValue> {
        self.advance(episodes)
    }

    /// Advance by the configured `episodesPerStep` batch.
    pub fn step(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .step()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = self.inner.config();
        serialize(&monte_carlo_advance_as_outcome(
            outcome,
            self.inner.last_episode(),
            config.epsilon,
            config.slip_probability,
        ))
    }

    /// Run the complete configured episode budget and return its final trace.
    pub fn run_to_completion(&mut self) -> Result<JsValue, JsValue> {
        let outcome = self
            .inner
            .run_to_completion()
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        let config = self.inner.config();
        serialize(&monte_carlo_advance_as_outcome(
            outcome,
            self.inner.last_episode(),
            config.epsilon,
            config.slip_probability,
        ))
    }

    #[wasm_bindgen(js_name = runToCompletion)]
    pub fn run_to_completion_alias(&mut self) -> Result<JsValue, JsValue> {
        self.run_to_completion()
    }

    pub fn reset(&mut self, seed_hex: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex
            .as_deref()
            .map(parse_monte_carlo_seed)
            .transpose()?;
        let snapshot = self.inner.reset(seed);
        let config = self.inner.config();
        serialize(&monte_carlo_snapshot_payload(
            &snapshot,
            None,
            config.epsilon,
            config.slip_probability,
        ))
    }

    #[wasm_bindgen(js_name = lastEpisode)]
    pub fn last_episode(&self) -> Result<JsValue, JsValue> {
        let snapshot = self.inner.snapshot();
        let payload = self
            .inner
            .last_episode()
            .map(|episode| monte_carlo_episode_payload(episode, &snapshot));
        serialize(&payload)
    }

    #[wasm_bindgen(js_name = episodeCount)]
    pub fn episode_count(&self) -> u32 {
        self.inner.episode_count()
    }
}

fn monte_carlo_outcome_payload(
    outcome: CoreMonteCarloEpisodeOutcome,
    epsilon: f64,
    wind_probability: f64,
) -> MonteCarloOutcomePayload {
    let snapshot = outcome.snapshot;
    let episode = outcome.episode;
    let audit = monte_carlo_audit_payload(&snapshot, &episode);
    let snapshot_payload =
        monte_carlo_snapshot_payload(&snapshot, Some(&episode), epsilon, wind_probability);
    let episode_payload = monte_carlo_episode_payload(&episode, &snapshot);
    MonteCarloOutcomePayload {
        snapshot: snapshot_payload,
        episode: episode_payload,
        audit,
    }
}

fn monte_carlo_advance_as_outcome(
    outcome: mathrl_core::MonteCarloAdvanceOutcome,
    previous_episode: Option<&CoreMonteCarloEpisode>,
    epsilon: f64,
    wind_probability: f64,
) -> MonteCarloOutcomePayload {
    let snapshot = outcome.snapshot;
    let episode = outcome
        .episodes
        .last()
        .cloned()
        .or_else(|| previous_episode.cloned())
        .unwrap_or_else(monte_carlo_empty_episode);
    let audit = monte_carlo_audit_payload(&snapshot, &episode);
    let snapshot_payload = monte_carlo_snapshot_payload(
        &snapshot,
        if episode.steps.is_empty() {
            None
        } else {
            Some(&episode)
        },
        epsilon,
        wind_probability,
    );
    let episode_payload = monte_carlo_episode_payload(&episode, &snapshot);
    MonteCarloOutcomePayload {
        snapshot: snapshot_payload,
        episode: episode_payload,
        audit,
    }
}

/// Wasm adapter for the mean/LLN motivating example in §5.1.
#[wasm_bindgen]
pub struct MeanEstimator {
    inner: CoreMeanEstimator,
}

#[wasm_bindgen]
impl MeanEstimator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed_hex: &str, max_samples: u32) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let config = CoreMeanEstimationConfig {
            seed: parse_mean_seed(seed_hex)?,
            max_samples,
        };
        let inner = CoreMeanEstimator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        serialize(&mean_snapshot_payload(self.inner.snapshot()))
    }

    pub fn advance(&mut self, samples: u32) -> Result<JsValue, JsValue> {
        let outcome = self.inner.advance(samples);
        serialize(&MeanEstimationOutcomePayload {
            snapshot: mean_snapshot_payload(outcome.snapshot),
            new_samples: outcome.new_samples,
        })
    }

    pub fn sample(&mut self) -> Result<JsValue, JsValue> {
        self.advance(1)
    }

    pub fn reset(&mut self, seed_hex: Option<String>) -> Result<JsValue, JsValue> {
        let seed = seed_hex.as_deref().map(parse_mean_seed).transpose()?;
        serialize(&mean_snapshot_payload(self.inner.reset(seed)))
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
        .or_else(|| seed_hex.trim().strip_prefix("0X"))
        .unwrap_or(seed_hex.trim());
    u64::from_str_radix(normalized, 16)
        .map_err(|_| error_value("invalid_seed", "seed must be a hexadecimal u64"))
}

fn parse_monte_carlo_seed(seed_hex: &str) -> Result<u64, JsValue> {
    parse_seed(seed_hex).map_err(|_| {
        error_value(
            "monte_carlo_seed",
            "seed must be a hexadecimal u64, for example 5eed",
        )
    })
}

fn parse_mean_seed(seed_hex: &str) -> Result<u64, JsValue> {
    parse_seed(seed_hex).map_err(|_| {
        error_value(
            "mean_seed",
            "seed must be a hexadecimal u64, for example 5eed",
        )
    })
}

fn parse_stochastic_approximation_seed(seed_hex: &str) -> Result<u64, JsValue> {
    parse_seed(seed_hex).map_err(|_| {
        error_value(
            "stochastic_approximation_seed",
            "seed must be a hexadecimal u64, for example 5eed",
        )
    })
}

fn parse_planning_mode(mode: &str) -> Result<CorePlanningMode, JsValue> {
    CorePlanningMode::try_from(mode.trim())
        .map_err(|error| error_value(error.code(), error.to_string()))
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

/// Wasm adapter for the Chapter 4 value/policy-iteration laboratory.
///
/// The underlying core object keeps an independent state for each mode, so a
/// browser can compare the three algorithms without accidentally sharing a
/// value vector.  Mode arguments use the stable strings from
/// `planningProtocol.ts`.
#[wasm_bindgen]
pub struct PlanningEvaluator {
    inner: CorePlanningEvaluator,
}

#[wasm_bindgen]
impl PlanningEvaluator {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        discount: f64,
        slip_probability: f64,
        tolerance: f64,
        max_outer_iterations: u32,
        evaluation_sweeps: u32,
        max_evaluation_sweeps: u32,
        default_reward: f64,
        boundary_reward: f64,
        hazard_reward: f64,
        goal_reward: f64,
    ) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let config = CorePlanningConfig {
            discount,
            slip_probability,
            tolerance,
            max_outer_iterations,
            evaluation_sweeps,
            max_evaluation_sweeps,
            rewards: Rewards {
                default: default_reward,
                boundary: boundary_reward,
                hazard: hazard_reward,
                goal: goal_reward,
            },
        };
        let inner = CorePlanningEvaluator::new(config)
            .map_err(|error| error_value(error.code(), error.to_string()))?;
        Ok(Self { inner })
    }

    /// Return one mode's current snapshot.  Omitting the mode returns all
    /// three snapshots as an array, which is useful during worker startup.
    pub fn snapshot(&self, mode: Option<String>) -> Result<JsValue, JsValue> {
        match mode {
            Some(mode) => {
                let mode = parse_planning_mode(&mode)?;
                serialize(&PlanningSnapshotPayload::from(self.inner.snapshot(mode)))
            }
            None => {
                let snapshots: Vec<_> = self
                    .inner
                    .snapshots()
                    .into_iter()
                    .map(PlanningSnapshotPayload::from)
                    .collect();
                serialize(&snapshots)
            }
        }
    }

    pub fn snapshots(&self) -> Result<JsValue, JsValue> {
        let snapshots: Vec<_> = self
            .inner
            .snapshots()
            .into_iter()
            .map(PlanningSnapshotPayload::from)
            .collect();
        serialize(&snapshots)
    }

    /// Reset one mode; omitting the mode resets all modes and returns an
    /// array.  This optional argument keeps the generated JS API compatible
    /// with both the single-mode and side-by-side worker paths.
    pub fn reset(&mut self, mode: Option<String>) -> Result<JsValue, JsValue> {
        match mode {
            Some(mode) => {
                let mode = parse_planning_mode(&mode)?;
                serialize(&PlanningSnapshotPayload::from(self.inner.reset(mode)))
            }
            None => {
                let snapshots: Vec<_> = self
                    .inner
                    .reset_all()
                    .into_iter()
                    .map(PlanningSnapshotPayload::from)
                    .collect();
                serialize(&snapshots)
            }
        }
    }

    pub fn reset_all(&mut self) -> Result<JsValue, JsValue> {
        let snapshots: Vec<_> = self
            .inner
            .reset_all()
            .into_iter()
            .map(PlanningSnapshotPayload::from)
            .collect();
        serialize(&snapshots)
    }

    pub fn transition_model(&self) -> Result<JsValue, JsValue> {
        let transitions: Vec<_> = self
            .inner
            .transition_model()
            .into_iter()
            .map(PlanningTransitionPayload::from)
            .collect();
        serialize(&transitions)
    }

    pub fn reference_solution(&self) -> Result<JsValue, JsValue> {
        serialize(&PlanningReferencePayload::from(
            self.inner.reference_solution(),
        ))
    }

    pub fn step(&mut self, mode: String) -> Result<JsValue, JsValue> {
        let mode = parse_planning_mode(&mode)?;
        serialize(&PlanningStepPayload::from(self.inner.step(mode)))
    }

    /// `sweep` is retained as a compatibility alias for early worker builds.
    pub fn sweep(&mut self, mode: String) -> Result<JsValue, JsValue> {
        self.step(mode)
    }

    pub fn advance(&mut self, mode: String, outer_steps: u32) -> Result<JsValue, JsValue> {
        let mode = parse_planning_mode(&mode)?;
        serialize(&PlanningAdvancePayload::from(
            self.inner.advance(mode, outer_steps),
        ))
    }

    pub fn run_to_convergence(&mut self, mode: String) -> Result<JsValue, JsValue> {
        let mode = parse_planning_mode(&mode)?;
        serialize(&PlanningAdvancePayload::from(
            self.inner.run_to_convergence(mode),
        ))
    }

    /// Camel-case aliases are intentionally explicit because some consumers
    /// import the generated module without the TypeScript worker wrapper.
    #[wasm_bindgen(js_name = runToConvergence)]
    pub fn run_to_convergence_alias(&mut self, mode: String) -> Result<JsValue, JsValue> {
        self.run_to_convergence(mode)
    }

    #[wasm_bindgen(js_name = transitionModel)]
    pub fn transition_model_alias(&self) -> Result<JsValue, JsValue> {
        self.transition_model()
    }

    #[wasm_bindgen(js_name = referenceSolution)]
    pub fn reference_solution_alias(&self) -> Result<JsValue, JsValue> {
        self.reference_solution()
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

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestPlanningCost {
        backups: u64,
        policy_evaluations: u64,
        improvement_steps: u64,
        action_evaluations: u64,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestPlanningSnapshot {
        mode: String,
        values: Vec<f64>,
        action_values: Vec<Vec<f64>>,
        greedy_masks: Vec<u8>,
        policy_masks: Vec<u8>,
        policy: Vec<i16>,
        outer_iteration: u32,
        evaluation_sweep: u32,
        residual: f64,
        value_residual: f64,
        evaluation_residual: f64,
        policy_stable: bool,
        converged: bool,
        truncated: bool,
        evaluation_truncated: bool,
        cost: TestPlanningCost,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestPlanningPhase {
        kind: String,
        sweeps: u32,
        changed_states: u16,
        residual: f64,
        outer_iteration: u32,
        max_update: f64,
        policy_stable: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestPlanningUpdate {
        state: u16,
        old_value: f64,
        new_value: f64,
        delta: f64,
        action_values: Vec<f64>,
        greedy_mask: u8,
        policy_mask: u8,
        policy: i16,
        policy_before: i16,
        policy_after: i16,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestPlanningOutcome {
        snapshot: TestPlanningSnapshot,
        updates: Vec<TestPlanningUpdate>,
        residual_history: Vec<f64>,
        phases: Vec<TestPlanningPhase>,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestPlanningReference {
        values: Vec<f64>,
        action_values: Vec<Vec<f64>>,
        greedy_masks: Vec<u8>,
        residual: f64,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMonteCarloStep {
        state: u16,
        action: u8,
        actual_action: u8,
        next_state: u16,
        reward: f64,
        discount_weight: f64,
        discounted_reward: f64,
        done: bool,
        truncated: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMonteCarloReturn {
        time: u32,
        state: u16,
        action: u8,
        #[serde(rename = "return")]
        r#return: f64,
        included: bool,
        count: u32,
        estimate: f64,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMonteCarloEpisode {
        number: u32,
        start_state: u16,
        start_action: u8,
        steps: Vec<TestMonteCarloStep>,
        returns: Vec<TestMonteCarloReturn>,
        total_return: f64,
        length: u32,
        done: bool,
        truncated: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMonteCarloSnapshot {
        mode: String,
        visit_strategy: String,
        epsilon: f64,
        episode_count: u32,
        total_steps: u64,
        values: Vec<f64>,
        action_values: Vec<Vec<f64>>,
        visit_counts: Vec<Vec<u32>>,
        return_sums: Vec<Vec<f64>>,
        variances: Vec<Vec<f64>>,
        policy_probabilities: Vec<Vec<f64>>,
        policy: Vec<i16>,
        last_episode: Option<TestMonteCarloEpisode>,
        seed_hex: String,
        wind_probability: f64,
        truncated: bool,
        episode_return_mean: f64,
        episode_return_variance: f64,
        policy_changes: u32,
        covered_pairs: u32,
        exhausted: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMonteCarloAudit {
        model_free: bool,
        model_rows: u32,
        observed_steps: u64,
        credited_returns: u32,
        unvisited_pairs: u32,
        finite: bool,
        message: Option<String>,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMonteCarloOutcome {
        snapshot: TestMonteCarloSnapshot,
        episode: TestMonteCarloEpisode,
        audit: TestMonteCarloAudit,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMeanSnapshot {
        seed_hex: String,
        sample_count: u32,
        samples: Vec<f64>,
        mean: f64,
        variance: f64,
        expected_mean: f64,
        exhausted: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestMeanOutcome {
        snapshot: TestMeanSnapshot,
        new_samples: Vec<f64>,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize, PartialEq)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestStochasticIteration {
        index: u32,
        k: u32,
        w_before: f64,
        w_after: f64,
        w: f64,
        alpha: f64,
        alpha_squared: f64,
        observation: f64,
        gradient: f64,
        noise: f64,
        target: f64,
        error: f64,
        absolute_error: f64,
        objective: f64,
        loss: f64,
        update: f64,
        batch_size: u32,
        batch_indices: Vec<u32>,
        projected: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestStochasticSnapshot {
        mode: String,
        schedule: String,
        root_function: String,
        target: f64,
        root: f64,
        initial_w: f64,
        current_w: f64,
        w: f64,
        alpha: f64,
        polynomial_power: f64,
        noise_std: f64,
        sample_count: u32,
        batch_size: u32,
        dataset_size: u32,
        tolerance: f64,
        seed_hex: String,
        iteration_count: u32,
        alpha_sum: f64,
        alpha_squared_sum: f64,
        noise_sum: f64,
        noise_mean: f64,
        noise_variance: f64,
        error: f64,
        root_residual: f64,
        absolute_error: f64,
        objective: f64,
        loss: f64,
        step_size_conditions: bool,
        converged: bool,
        truncated: bool,
        exhausted: bool,
        last_iteration: Option<TestStochasticIteration>,
        history: Vec<TestStochasticIteration>,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestStochasticDiagnostics {
        alpha_sum: f64,
        alpha_squared_sum: f64,
        noise_sum: f64,
        noise_mean: f64,
        noise_variance: f64,
        error: f64,
        root_residual: f64,
        objective: f64,
        converged: bool,
        truncated: bool,
        exhausted: bool,
        step_size_conditions: bool,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestStochasticOutcome {
        snapshot: TestStochasticSnapshot,
        iteration: TestStochasticIteration,
        diagnostics: TestStochasticDiagnostics,
    }

    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct TestStochasticAdvance {
        snapshot: TestStochasticSnapshot,
        iterations: Vec<TestStochasticIteration>,
        diagnostics: TestStochasticDiagnostics,
    }

    fn from_js<T: for<'de> Deserialize<'de>>(value: JsValue) -> T {
        serde_wasm_bindgen::from_value(value).expect("payload follows the documented JS contract")
    }

    #[wasm_bindgen_test]
    fn stochastic_approximation_payload_exposes_root_and_step_diagnostics() {
        let mut evaluator = StochasticApproximationEvaluator::new(
            "robbins-monro".to_owned(),
            "harmonic".to_owned(),
            1.0,
            3.0,
            0.5,
            1.0,
            0.0,
            8,
            5,
            1e-8,
            "5eed",
            Some("tanh".to_owned()),
        )
        .expect("valid stochastic approximation evaluator");
        let initial: TestStochasticSnapshot = from_js(evaluator.snapshot().expect("snapshot"));
        assert_eq!(initial.mode, "robbins_monro");
        assert_eq!(initial.root_function, "tanh");
        assert_eq!(initial.iteration_count, 0);
        assert_eq!(initial.history.len(), 0);
        let outcome: TestStochasticOutcome = from_js(evaluator.iteration().expect("iteration"));
        assert_eq!(outcome.snapshot.iteration_count, 1);
        assert_eq!(outcome.iteration.index, 1);
        assert_eq!(outcome.iteration.batch_size, 1);
        assert!(outcome.iteration.observation < 0.0);
        assert_eq!(outcome.diagnostics.alpha_sum, outcome.snapshot.alpha_sum);
    }

    #[wasm_bindgen_test]
    fn stochastic_approximation_reset_replays_seeded_batch_trajectory() {
        let mut evaluator = StochasticApproximationEvaluator::new(
            "mini_batch".to_owned(),
            "polynomial".to_owned(),
            2.0,
            -1.0,
            0.4,
            0.75,
            0.3,
            16,
            3,
            1e-6,
            "1234",
            None,
        )
        .expect("valid stochastic approximation evaluator");
        let first: TestStochasticAdvance = from_js(evaluator.advance(4).expect("advance"));
        evaluator.reset(None).expect("reset");
        let second: TestStochasticAdvance = from_js(evaluator.advance(4).expect("replay"));
        assert_eq!(first.snapshot.current_w, second.snapshot.current_w);
        assert_eq!(first.snapshot.alpha_sum, second.snapshot.alpha_sum);
        assert_eq!(first.iterations, second.iterations);
    }

    #[wasm_bindgen_test]
    fn monte_carlo_payload_reports_realised_model_free_returns() {
        let mut evaluator = MonteCarloEvaluator::new(
            "mc-basic".to_owned(),
            "initial-visit".to_owned(),
            "control".to_owned(),
            0.9,
            0.0,
            0.2,
            1,
            8,
            20,
            "5eed",
            -0.04,
            -1.0,
            -1.0,
            1.0,
        )
        .expect("valid Monte Carlo evaluator");
        let initial: TestMonteCarloSnapshot = from_js(evaluator.snapshot().expect("snapshot"));
        assert_eq!(initial.mode, "mc_basic");
        assert_eq!(initial.visit_strategy, "initial");
        assert_eq!(initial.episode_count, 0);
        assert_eq!(initial.values.len(), 16);
        assert_eq!(initial.action_values.len(), 16);
        assert_eq!(initial.action_values[0].len(), 5);
        assert_eq!(initial.policy[15], -1);

        let outcome: TestMonteCarloOutcome = from_js(evaluator.episode().expect("episode"));
        assert!(outcome.audit.model_free);
        assert_eq!(outcome.audit.model_rows, 0);
        assert!(outcome.audit.finite);
        assert_eq!(outcome.snapshot.episode_count, 1);
        assert_eq!(outcome.episode.steps.len(), outcome.episode.returns.len());
        assert!(outcome.episode.returns.iter().any(|row| row.included));
        assert_eq!(
            outcome
                .episode
                .steps
                .last()
                .map(|step| step.done)
                .unwrap_or(false),
            outcome.episode.done,
        );
    }

    #[wasm_bindgen_test]
    fn monte_carlo_and_mean_reset_replay_seeded_samples() {
        let mut evaluator = MonteCarloEvaluator::new(
            "epsilon_greedy".to_owned(),
            "every".to_owned(),
            "prediction".to_owned(),
            0.9,
            0.1,
            0.2,
            2,
            8,
            12,
            "1234",
            -0.04,
            -1.0,
            -1.0,
            1.0,
        )
        .expect("valid Monte Carlo evaluator");
        let first: TestMonteCarloOutcome = from_js(evaluator.advance(2).expect("advance"));
        evaluator.reset(None).expect("reset");
        let second: TestMonteCarloOutcome = from_js(evaluator.advance(2).expect("advance"));
        assert_eq!(first.snapshot.episode_count, second.snapshot.episode_count);
        assert_eq!(first.snapshot.values, second.snapshot.values);
        assert_eq!(first.episode.steps.len(), second.episode.steps.len());
        assert_eq!(first.episode.total_return, second.episode.total_return);

        let mut mean = MeanEstimator::new("1234", 8).expect("valid mean estimator");
        let first_mean: TestMeanOutcome = from_js(mean.advance(4).expect("mean advance"));
        mean.reset(None).expect("mean reset");
        let second_mean: TestMeanOutcome = from_js(mean.advance(4).expect("mean advance"));
        assert_eq!(first_mean.new_samples, second_mean.new_samples);
        assert_eq!(first_mean.snapshot.samples, second_mean.snapshot.samples);
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

    #[wasm_bindgen_test]
    fn compares_all_three_chapter_four_algorithms() {
        let mut evaluator =
            PlanningEvaluator::new(0.9, 0.0, 1e-12, 1_000, 1, 1_000, -0.04, -1.0, -1.0, 1.0)
                .expect("valid planning evaluator");

        let initial: TestPlanningSnapshot = from_js(
            evaluator
                .snapshot(Some("value_iteration".to_owned()))
                .expect("snapshot serializes"),
        );
        assert_eq!(initial.mode, "value_iteration");
        assert_eq!(initial.values, vec![0.0; 16]);
        assert_eq!(initial.action_values.len(), 16);
        assert!(initial.action_values.iter().all(|row| row.len() == 5));
        assert_eq!(initial.greedy_masks[0], 22);
        assert_eq!(initial.policy[15], -1);
        assert_eq!(initial.policy_masks[15], 0);
        assert!(!initial.evaluation_truncated);
        assert_eq!(initial.outer_iteration, 0);
        assert_eq!(initial.evaluation_sweep, 0);
        assert_eq!(initial.cost.backups, 0);
        assert_eq!(initial.cost.policy_evaluations, 0);
        assert_eq!(initial.cost.improvement_steps, 0);
        assert_eq!(initial.cost.action_evaluations, 0);

        let first: TestPlanningOutcome = from_js(
            evaluator
                .step("value_iteration".to_owned())
                .expect("step serializes"),
        );
        assert_eq!(first.snapshot.outer_iteration, 1);
        assert_eq!(first.snapshot.values[11], 1.0);
        assert_eq!(first.updates.len(), 16);
        assert!(first.phases.iter().any(|phase| phase.kind == "backup"));
        assert!(first.phases.iter().any(|phase| phase.kind == "improvement"));
        assert!(first.phases.iter().all(|phase| phase.outer_iteration == 1));
        let backup_phase = first
            .phases
            .iter()
            .find(|phase| phase.kind == "backup")
            .expect("backup phase");
        assert!(backup_phase.changed_states > 0);
        assert!(backup_phase.max_update > 0.0);
        assert!(
            first
                .updates
                .iter()
                .all(|update| update.action_values.len() == 5)
        );
        assert_eq!(first.updates[15].policy, -1);
        assert_eq!(first.updates[15].policy_mask, 0);
        assert_eq!(first.updates[15].policy_before, -1);
        assert_eq!(first.updates[15].policy_after, -1);

        let tpi_first: TestPlanningOutcome = from_js(
            evaluator
                .step("truncated_policy_iteration".to_owned())
                .expect("TPI step serializes"),
        );
        assert_eq!(tpi_first.snapshot.outer_iteration, 1);
        assert_eq!(tpi_first.snapshot.values[11], 1.0);
        assert!(
            tpi_first
                .phases
                .iter()
                .any(|phase| phase.kind == "evaluation" && phase.sweeps == 1)
        );

        let pi: TestPlanningOutcome = from_js(
            evaluator
                .run_to_convergence("policy_iteration".to_owned())
                .expect("PI run serializes"),
        );
        assert!(pi.snapshot.converged);
        assert!(pi.snapshot.cost.policy_evaluations > 0);
        assert!(pi.snapshot.cost.improvement_steps > 0);
        assert!(pi.snapshot.evaluation_residual <= 1e-12);
        assert!(!pi.snapshot.evaluation_truncated);

        let all: Vec<TestPlanningSnapshot> =
            from_js(evaluator.snapshot(None).expect("all snapshots serialize"));
        assert_eq!(all.len(), 3);

        let reference: TestPlanningReference = from_js(
            evaluator
                .reference_solution()
                .expect("reference serializes"),
        );
        assert_eq!(reference.values.len(), 16);
        assert!((reference.values[0] - 0.426_686).abs() <= 1e-12);

        let reset: TestPlanningSnapshot = from_js(
            evaluator
                .reset(Some("value_iteration".to_owned()))
                .expect("reset serializes"),
        );
        assert_eq!(reset.outer_iteration, 0);
        assert_eq!(reset.values, vec![0.0; 16]);
    }

    #[wasm_bindgen_test]
    fn exposes_policy_evaluation_cap_and_phase_metadata() {
        let mut evaluator =
            PlanningEvaluator::new(0.9, 0.0, 1e-12, 1_000, 1, 1, -0.04, -1.0, -1.0, 1.0)
                .expect("valid planning evaluator");
        let outcome: TestPlanningOutcome = from_js(
            evaluator
                .step("policy_iteration".to_owned())
                .expect("step serializes"),
        );
        assert!(outcome.snapshot.evaluation_truncated);
        assert!(!outcome.snapshot.converged);
        let evaluation = outcome
            .phases
            .iter()
            .find(|phase| phase.kind == "evaluation")
            .expect("evaluation phase");
        assert_eq!(evaluation.sweeps, 1);
        assert!(evaluation.changed_states > 0);
        assert_eq!(evaluation.outer_iteration, 1);
        assert!(evaluation.residual > 1e-12);
        assert!(evaluation.max_update > 0.0);
        assert!(!evaluation.policy_stable);
        let first_update = outcome.updates.first().expect("state update");
        assert_eq!(first_update.state, 0);
        assert!(first_update.old_value.is_finite());
        assert!(first_update.new_value.is_finite());
        assert!(first_update.delta.is_finite());
        assert!(first_update.greedy_mask > 0);
        assert_eq!(first_update.policy_before, first_update.policy_after);
    }
}
