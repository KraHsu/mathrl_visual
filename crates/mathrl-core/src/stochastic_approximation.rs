//! Bounded, seeded stochastic-approximation examples for Chapter 6.
//!
//! The evaluator deliberately keeps the examples scalar.  This makes the
//! Robbins--Monro recursion visible in a table while retaining the same
//! reproducibility and model/worker boundary as the earlier laboratories:
//!
//! * mean estimation uses `w <- w + a (x - w)`;
//! * Robbins--Monro uses `w <- w - a g_hat` for a selectable black-box root
//!   function (`linear`, `tanh`, or `cubic`);
//! * SGD uses the quadratic objective `1/2 (w-target)^2`;
//! * mini-batch SGD averages several independent noisy gradients before one
//!   update.
//!
//! Noise is a bounded uniform random variable whose standard deviation is
//! `noise_std`.  A bounded source is intentional here: a browser experiment
//! must remain finite even when a user selects an aggressive step size.  The
//! seeded stream is owned by Rust and reset replays it exactly.

use std::fmt;

use rand::Rng;
use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;

/// Maximum number of scalar updates retained/accepted by one evaluator.
pub const MAX_STOCHASTIC_APPROXIMATION_ITERATIONS: u32 = 100_000;
/// Maximum number of updates produced by one `advance` call.
pub const MAX_STOCHASTIC_APPROXIMATION_ADVANCE: u32 = 2_000;
/// Maximum mini-batch size.  The cap keeps payloads and worker work bounded.
pub const MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE: u32 = 256;
/// Maximum number of recent scalar-observation slots retained in a snapshot.
/// Batch modes divide this budget by their batch size, so a snapshot remains
/// bounded even when every row carries many source indices. The iteration
/// counter and aggregate diagnostics still cover the full budget.
pub const MAX_STOCHASTIC_APPROXIMATION_HISTORY: usize = 4_096;
/// Numeric projection bound used to keep browser-facing values finite.
pub const MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE: f64 = 1_000_000.0;
/// Maximum accepted absolute noise standard deviation.
pub const MAX_STOCHASTIC_APPROXIMATION_NOISE_STD: f64 = 1_000_000.0;
/// Maximum accepted base step size.
pub const MAX_STOCHASTIC_APPROXIMATION_ALPHA: f64 = 10.0;
/// Maximum accepted polynomial exponent.
pub const MAX_STOCHASTIC_APPROXIMATION_POWER: f64 = 4.0;

const DEFAULT_TARGET: f64 = 1.0;
const DEFAULT_INITIAL_W: f64 = 0.0;
const DEFAULT_ALPHA: f64 = 0.8;
const DEFAULT_POWER: f64 = 1.0;
const DEFAULT_NOISE_STD: f64 = 0.25;
const DEFAULT_SAMPLE_COUNT: u32 = 200;
const DEFAULT_BATCH_SIZE: u32 = 1;
const DEFAULT_TOLERANCE: f64 = 1e-3;

/// Scalar experiment mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum StochasticApproximationMode {
    /// Estimate the mean of noisy observations of `target`.
    Mean = 0,
    /// Solve the noisy root equation `w - target + η = 0`.
    RobbinsMonro = 1,
    /// Minimize `1/2 (w - target)^2` with one noisy gradient per update.
    Sgd = 2,
    /// Minimize the same objective after averaging `batch_size` gradients.
    MiniBatch = 3,
    /// Batch gradient descent over one fixed finite synthetic data set.
    BatchGradient = 4,
}

impl StochasticApproximationMode {
    pub const ALL: [Self; 5] = [
        Self::Mean,
        Self::RobbinsMonro,
        Self::Sgd,
        Self::MiniBatch,
        Self::BatchGradient,
    ];

    pub const fn code(self) -> u8 {
        self as u8
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Mean => "mean",
            Self::RobbinsMonro => "robbins_monro",
            Self::Sgd => "sgd",
            Self::MiniBatch => "mini_batch",
            Self::BatchGradient => "batch_gradient",
        }
    }
}

impl TryFrom<&str> for StochasticApproximationMode {
    type Error = StochasticApproximationModeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "mean" | "mean-estimation" | "mean_estimation" | "average" => Ok(Self::Mean),
            "rm" | "robbins-monro" | "robbins_monro" | "robbinsmonro" => Ok(Self::RobbinsMonro),
            "sgd" | "stochastic-gradient" | "stochastic_gradient" => Ok(Self::Sgd),
            "mb" | "mini-batch" | "mini_batch" | "minibatch" | "mbgd" => Ok(Self::MiniBatch),
            "bgd" | "batch-gradient" | "batch_gradient" | "batchgradient" => {
                Ok(Self::BatchGradient)
            }
            _ => Err(StochasticApproximationModeError::Unknown(value.to_owned())),
        }
    }
}

impl TryFrom<String> for StochasticApproximationMode {
    type Error = StochasticApproximationModeError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StochasticApproximationModeError {
    Unknown(String),
}

impl StochasticApproximationModeError {
    pub const fn code(&self) -> &'static str {
        "stochastic_approximation_mode"
    }
}

impl fmt::Display for StochasticApproximationModeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => {
                write!(formatter, "unknown stochastic approximation mode {value}")
            }
        }
    }
}

impl std::error::Error for StochasticApproximationModeError {}

/// Black-box function used by the Robbins--Monro root-finding example.
/// `target` is always the root; the nonlinear variants are centered so that
/// `g(target) = 0` and remain well behaved over the bounded display range.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum StochasticApproximationRootFunction {
    Linear = 0,
    Tanh = 1,
    Cubic = 2,
}

impl StochasticApproximationRootFunction {
    pub const ALL: [Self; 3] = [Self::Linear, Self::Tanh, Self::Cubic];

    pub const fn code(self) -> u8 {
        self as u8
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Linear => "linear",
            Self::Tanh => "tanh",
            Self::Cubic => "cubic",
        }
    }

    fn evaluate(self, w: f64, target: f64) -> f64 {
        let offset = w - target;
        match self {
            Self::Linear => offset,
            Self::Tanh => offset.tanh(),
            Self::Cubic => offset * offset * offset,
        }
    }
}

impl TryFrom<&str> for StochasticApproximationRootFunction {
    type Error = StochasticApproximationRootFunctionError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "linear" | "line" | "identity" => Ok(Self::Linear),
            "tanh" | "hyperbolic-tangent" | "hyperbolic_tangent" => Ok(Self::Tanh),
            "cubic" | "cube" => Ok(Self::Cubic),
            _ => Err(StochasticApproximationRootFunctionError::Unknown(
                value.to_owned(),
            )),
        }
    }
}

impl TryFrom<String> for StochasticApproximationRootFunction {
    type Error = StochasticApproximationRootFunctionError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StochasticApproximationRootFunctionError {
    Unknown(String),
}

impl StochasticApproximationRootFunctionError {
    pub const fn code(&self) -> &'static str {
        "stochastic_approximation_root_function"
    }
}

impl fmt::Display for StochasticApproximationRootFunctionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => {
                write!(formatter, "unknown Robbins--Monro root function {value}")
            }
        }
    }
}

impl std::error::Error for StochasticApproximationRootFunctionError {}

/// Step-size schedule `a_k` (with `k` starting at one).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum StochasticApproximationSchedule {
    /// `a_k = alpha / k`.
    Harmonic = 0,
    /// `a_k = alpha`.
    Constant = 1,
    /// `a_k = alpha / k^power`.
    Polynomial = 2,
}

impl StochasticApproximationSchedule {
    pub const ALL: [Self; 3] = [Self::Harmonic, Self::Constant, Self::Polynomial];

    pub const fn code(self) -> u8 {
        self as u8
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Harmonic => "harmonic",
            Self::Constant => "constant",
            Self::Polynomial => "polynomial",
        }
    }
}

impl TryFrom<&str> for StochasticApproximationSchedule {
    type Error = StochasticApproximationScheduleError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "harmonic" | "harmonic-steps" | "harmonic_steps" | "1/k" => Ok(Self::Harmonic),
            "constant" | "fixed" | "constant-step" | "constant_step" => Ok(Self::Constant),
            "polynomial" | "power" | "power-law" | "power_law" => Ok(Self::Polynomial),
            _ => Err(StochasticApproximationScheduleError::Unknown(
                value.to_owned(),
            )),
        }
    }
}

impl TryFrom<String> for StochasticApproximationSchedule {
    type Error = StochasticApproximationScheduleError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::try_from(value.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StochasticApproximationScheduleError {
    Unknown(String),
}

impl StochasticApproximationScheduleError {
    pub const fn code(&self) -> &'static str {
        "stochastic_approximation_schedule"
    }
}

impl fmt::Display for StochasticApproximationScheduleError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown(value) => write!(
                formatter,
                "unknown stochastic approximation schedule {value}"
            ),
        }
    }
}

impl std::error::Error for StochasticApproximationScheduleError {}

/// Configuration shared by all five scalar examples.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StochasticApproximationConfig {
    pub mode: StochasticApproximationMode,
    pub schedule: StochasticApproximationSchedule,
    /// Root function used when `mode` is `RobbinsMonro`; other modes use the
    /// quadratic/mean signal and ignore this selector.
    pub root_function: StochasticApproximationRootFunction,
    /// Mean/root of the synthetic problem.
    pub target: f64,
    pub initial_w: f64,
    /// Base step size `alpha`.
    pub alpha: f64,
    /// Exponent used only by the polynomial schedule.
    pub polynomial_power: f64,
    /// Standard deviation of the bounded observation/gradient noise.
    pub noise_std: f64,
    /// Maximum number of scalar updates.
    pub sample_count: u32,
    /// Number of gradients averaged in `MiniBatch` mode.
    pub batch_size: u32,
    /// Absolute-error threshold used for the pedagogical convergence flag.
    pub tolerance: f64,
    pub seed: u64,
}

impl Default for StochasticApproximationConfig {
    fn default() -> Self {
        Self {
            mode: StochasticApproximationMode::Mean,
            schedule: StochasticApproximationSchedule::Harmonic,
            root_function: StochasticApproximationRootFunction::Linear,
            target: DEFAULT_TARGET,
            initial_w: DEFAULT_INITIAL_W,
            alpha: DEFAULT_ALPHA,
            polynomial_power: DEFAULT_POWER,
            noise_std: DEFAULT_NOISE_STD,
            sample_count: DEFAULT_SAMPLE_COUNT,
            batch_size: DEFAULT_BATCH_SIZE,
            tolerance: DEFAULT_TOLERANCE,
            seed: 0x5eed,
        }
    }
}

impl StochasticApproximationConfig {
    pub fn validate(&self) -> Result<(), StochasticApproximationConfigError> {
        if !self.target.is_finite() || self.target.abs() > MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE {
            return Err(StochasticApproximationConfigError::Target);
        }
        if !self.initial_w.is_finite()
            || self.initial_w.abs() > MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE
        {
            return Err(StochasticApproximationConfigError::InitialW);
        }
        if !self.alpha.is_finite()
            || !(0.0..=MAX_STOCHASTIC_APPROXIMATION_ALPHA).contains(&self.alpha)
            || self.alpha <= 0.0
        {
            return Err(StochasticApproximationConfigError::Alpha);
        }
        if !self.polynomial_power.is_finite()
            || !(0.0..=MAX_STOCHASTIC_APPROXIMATION_POWER).contains(&self.polynomial_power)
            || self.polynomial_power <= 0.0
        {
            return Err(StochasticApproximationConfigError::PolynomialPower);
        }
        if !self.noise_std.is_finite()
            || !(0.0..=MAX_STOCHASTIC_APPROXIMATION_NOISE_STD).contains(&self.noise_std)
        {
            return Err(StochasticApproximationConfigError::NoiseStd);
        }
        if !(1..=MAX_STOCHASTIC_APPROXIMATION_ITERATIONS).contains(&self.sample_count) {
            return Err(StochasticApproximationConfigError::SampleCount);
        }
        if !(1..=MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE).contains(&self.batch_size) {
            return Err(StochasticApproximationConfigError::BatchSize);
        }
        if !self.tolerance.is_finite()
            || self.tolerance <= 0.0
            || self.tolerance > MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE
        {
            return Err(StochasticApproximationConfigError::Tolerance);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StochasticApproximationConfigError {
    Target,
    InitialW,
    Alpha,
    PolynomialPower,
    NoiseStd,
    SampleCount,
    BatchSize,
    Tolerance,
}

impl StochasticApproximationConfigError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Target => "stochastic_approximation_target_range",
            Self::InitialW => "stochastic_approximation_initial_w_range",
            Self::Alpha => "stochastic_approximation_alpha_range",
            Self::PolynomialPower => "stochastic_approximation_power_range",
            Self::NoiseStd => "stochastic_approximation_noise_range",
            Self::SampleCount => "stochastic_approximation_sample_count_range",
            Self::BatchSize => "stochastic_approximation_batch_size_range",
            Self::Tolerance => "stochastic_approximation_tolerance_range",
        }
    }
}

impl fmt::Display for StochasticApproximationConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Target => write!(formatter, "target must be finite with bounded magnitude"),
            Self::InitialW => write!(formatter, "initial_w must be finite with bounded magnitude"),
            Self::Alpha => write!(
                formatter,
                "alpha must be finite and in (0, {MAX_STOCHASTIC_APPROXIMATION_ALPHA}]"
            ),
            Self::PolynomialPower => write!(
                formatter,
                "polynomial_power must be finite and in (0, {MAX_STOCHASTIC_APPROXIMATION_POWER}]"
            ),
            Self::NoiseStd => write!(formatter, "noise_std must be finite and non-negative"),
            Self::SampleCount => write!(
                formatter,
                "sample_count must be between 1 and {MAX_STOCHASTIC_APPROXIMATION_ITERATIONS}"
            ),
            Self::BatchSize => write!(
                formatter,
                "batch_size must be between 1 and {MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE}"
            ),
            Self::Tolerance => write!(formatter, "tolerance must be finite and positive"),
        }
    }
}

impl std::error::Error for StochasticApproximationConfigError {}

#[derive(Debug, Clone, PartialEq)]
pub enum StochasticApproximationError {
    Config(StochasticApproximationConfigError),
    IterationUnavailable,
}

impl StochasticApproximationError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Config(error) => error.code(),
            Self::IterationUnavailable => "stochastic_approximation_iteration_unavailable",
        }
    }
}

impl fmt::Display for StochasticApproximationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Config(error) => error.fmt(formatter),
            Self::IterationUnavailable => {
                write!(formatter, "the configured iteration budget is exhausted")
            }
        }
    }
}

impl std::error::Error for StochasticApproximationError {}

impl From<StochasticApproximationConfigError> for StochasticApproximationError {
    fn from(error: StochasticApproximationConfigError) -> Self {
        Self::Config(error)
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct RunningStats {
    count: u32,
    sum: f64,
    mean: f64,
    m2: f64,
}

impl RunningStats {
    const fn new() -> Self {
        Self {
            count: 0,
            sum: 0.0,
            mean: 0.0,
            m2: 0.0,
        }
    }

    fn update(&mut self, value: f64) {
        if !value.is_finite() {
            return;
        }
        self.count = self.count.saturating_add(1);
        if self.count == 0 {
            return;
        }
        self.sum += value;
        let delta = value - self.mean;
        self.mean += delta / self.count as f64;
        self.m2 += delta * (value - self.mean);
    }

    const fn variance(self) -> f64 {
        if self.count == 0 {
            0.0
        } else {
            let variance = self.m2 / self.count as f64;
            if variance.is_sign_negative() {
                0.0
            } else {
                variance
            }
        }
    }
}

/// One stochastic-approximation update.  `index` is one-based for readable
/// formulas (`a_1`, `a_2`, ...).
#[derive(Debug, Clone, PartialEq)]
pub struct StochasticApproximationIteration {
    pub index: u32,
    pub w_before: f64,
    pub w_after: f64,
    pub alpha: f64,
    pub alpha_squared: f64,
    /// Noisy observation.  For mean/SGD modes this is `target + noise`; for
    /// Robbins--Monro it is the black-box signal `g(w) + noise`.
    pub observation: f64,
    /// Effective noisy gradient/root signal used by the update.
    pub gradient: f64,
    pub noise: f64,
    pub target: f64,
    /// Signed post-update error `w_after - target`.
    pub error: f64,
    pub absolute_error: f64,
    /// `1/2 * error^2` evaluated after the update.
    pub objective: f64,
    /// Additive update `w_after - w_before`.
    pub update: f64,
    pub batch_size: u32,
    /// Consecutive source indices contributing to this update.
    pub batch_indices: Vec<u32>,
    /// Whether the safety projection at ±MAX... was applied.
    pub projected: bool,
}

/// A copyable summary plus a bounded trajectory for the browser.
#[derive(Debug, Clone, PartialEq)]
pub struct StochasticApproximationSnapshot {
    pub mode: StochasticApproximationMode,
    pub schedule: StochasticApproximationSchedule,
    pub root_function: StochasticApproximationRootFunction,
    pub target: f64,
    /// Alias for UIs that use the Robbins--Monro term.
    pub root: f64,
    pub initial_w: f64,
    pub current_w: f64,
    pub alpha: f64,
    pub polynomial_power: f64,
    pub noise_std: f64,
    pub sample_count: u32,
    pub batch_size: u32,
    /// Fixed data-set size in BGD mode (zero for other modes).
    pub dataset_size: u32,
    pub tolerance: f64,
    pub seed: u64,
    pub iteration_count: u32,
    pub alpha_sum: f64,
    pub alpha_squared_sum: f64,
    pub noise_sum: f64,
    pub noise_mean: f64,
    pub noise_variance: f64,
    pub error: f64,
    /// Signed noiseless root residual at `current_w`.
    pub root_residual: f64,
    pub absolute_error: f64,
    pub objective: f64,
    /// A schedule-level diagnostic: harmonic, or polynomial with p in
    /// (0.5, 1], has the textbook Robbins--Monro sums asymptotically.
    pub step_size_conditions: bool,
    pub converged: bool,
    pub truncated: bool,
    pub exhausted: bool,
    pub last_iteration: Option<StochasticApproximationIteration>,
    pub history: Vec<StochasticApproximationIteration>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct StochasticApproximationOutcome {
    pub snapshot: StochasticApproximationSnapshot,
    pub iteration: StochasticApproximationIteration,
}

#[derive(Debug, Clone, PartialEq)]
pub struct StochasticApproximationAdvanceOutcome {
    pub snapshot: StochasticApproximationSnapshot,
    pub iterations: Vec<StochasticApproximationIteration>,
}

/// Deterministic scalar stochastic-approximation engine.
#[derive(Debug, Clone)]
pub struct StochasticApproximationEvaluator {
    config: StochasticApproximationConfig,
    rng: ChaCha8Rng,
    current_w: f64,
    iteration_count: u32,
    alpha_sum: f64,
    alpha_squared_sum: f64,
    noise_stats: RunningStats,
    history: Vec<StochasticApproximationIteration>,
    last_iteration: Option<StochasticApproximationIteration>,
    source_index: u32,
    /// Fixed finite data set used by BGD.  Entries store additive noise around
    /// the target, so the displayed batch gradient remains auditable.
    batch_dataset: Vec<f64>,
}

impl StochasticApproximationEvaluator {
    pub fn new(
        config: StochasticApproximationConfig,
    ) -> Result<Self, StochasticApproximationConfigError> {
        config.validate()?;
        Ok(Self::from_valid_config(config))
    }

    fn from_valid_config(config: StochasticApproximationConfig) -> Self {
        let mut evaluator = Self {
            current_w: config.initial_w,
            rng: ChaCha8Rng::seed_from_u64(config.seed),
            config,
            iteration_count: 0,
            alpha_sum: 0.0,
            alpha_squared_sum: 0.0,
            noise_stats: RunningStats::new(),
            history: Vec::new(),
            last_iteration: None,
            source_index: 0,
            batch_dataset: Vec::new(),
        };
        evaluator.initialize_batch_dataset();
        evaluator
    }

    pub const fn config(&self) -> StochasticApproximationConfig {
        self.config
    }

    pub const fn iteration_count(&self) -> u32 {
        self.iteration_count
    }

    pub const fn current_w(&self) -> f64 {
        self.current_w
    }

    pub fn last_iteration(&self) -> Option<&StochasticApproximationIteration> {
        self.last_iteration.as_ref()
    }

    /// Return the step size for one-based iteration `index`.
    pub fn step_size(&self, index: u32) -> f64 {
        let k = index.max(1) as f64;
        match self.config.schedule {
            StochasticApproximationSchedule::Harmonic => self.config.alpha / k,
            StochasticApproximationSchedule::Constant => self.config.alpha,
            StochasticApproximationSchedule::Polynomial => {
                self.config.alpha / k.powf(self.config.polynomial_power)
            }
        }
    }

    pub fn snapshot(&self) -> StochasticApproximationSnapshot {
        let error = self.current_w - self.config.target;
        let absolute_error = error.abs();
        let root_residual = self
            .config
            .root_function
            .evaluate(self.current_w, self.config.target);
        let residual_for_objective =
            if self.config.mode == StochasticApproximationMode::RobbinsMonro {
                root_residual
            } else {
                error
            };
        StochasticApproximationSnapshot {
            mode: self.config.mode,
            schedule: self.config.schedule,
            root_function: self.config.root_function,
            target: self.config.target,
            root: self.config.target,
            initial_w: self.config.initial_w,
            current_w: self.current_w,
            alpha: self.config.alpha,
            polynomial_power: self.config.polynomial_power,
            noise_std: self.config.noise_std,
            sample_count: self.config.sample_count,
            batch_size: self.config.batch_size,
            dataset_size: if self.config.mode == StochasticApproximationMode::BatchGradient {
                self.batch_dataset.len() as u32
            } else {
                0
            },
            tolerance: self.config.tolerance,
            seed: self.config.seed,
            iteration_count: self.iteration_count,
            alpha_sum: self.alpha_sum,
            alpha_squared_sum: self.alpha_squared_sum,
            noise_sum: self.noise_stats.sum,
            noise_mean: self.noise_stats.mean,
            noise_variance: self.noise_stats.variance(),
            error,
            root_residual,
            absolute_error,
            objective: 0.5 * residual_for_objective * residual_for_objective,
            step_size_conditions: self.step_size_conditions(),
            converged: if self.config.mode == StochasticApproximationMode::RobbinsMonro {
                root_residual.abs() <= self.config.tolerance
            } else {
                absolute_error <= self.config.tolerance
            },
            truncated: self.iteration_count >= self.config.sample_count
                && if self.config.mode == StochasticApproximationMode::RobbinsMonro {
                    root_residual.abs() > self.config.tolerance
                } else {
                    absolute_error > self.config.tolerance
                },
            exhausted: self.iteration_count >= self.config.sample_count,
            last_iteration: self.last_iteration.clone(),
            history: self.history.clone(),
        }
    }

    /// Whether the selected schedule has the standard asymptotic SA shape.
    /// This is a diagnostic, not a finite-sample convergence proof.
    pub fn step_size_conditions(&self) -> bool {
        match self.config.schedule {
            StochasticApproximationSchedule::Harmonic => true,
            StochasticApproximationSchedule::Polynomial => {
                self.config.polynomial_power > 0.5 && self.config.polynomial_power <= 1.0
            }
            StochasticApproximationSchedule::Constant => false,
        }
    }

    /// Generate and apply one update.
    pub fn iteration(
        &mut self,
    ) -> Result<StochasticApproximationOutcome, StochasticApproximationError> {
        let iteration = self.apply_iteration()?;
        Ok(StochasticApproximationOutcome {
            snapshot: self.snapshot(),
            iteration,
        })
    }

    /// Apply one update without taking the expensive full snapshot.  Batched
    /// callers use this path so advancing `n` rows stays linear in `n` rather
    /// than cloning the complete history after every row.
    fn apply_iteration(
        &mut self,
    ) -> Result<StochasticApproximationIteration, StochasticApproximationError> {
        if self.iteration_count >= self.config.sample_count {
            return Err(StochasticApproximationError::IterationUnavailable);
        }
        let index = self.iteration_count.saturating_add(1);
        let alpha = self.step_size(index);
        let w_before = self.current_w;
        let batch_size = match self.config.mode {
            StochasticApproximationMode::MiniBatch | StochasticApproximationMode::BatchGradient => {
                self.config.batch_size
            }
            _ => 1,
        };
        let mut noises = Vec::with_capacity(batch_size as usize);
        let mut observations = Vec::with_capacity(batch_size as usize);
        let mut batch_indices = Vec::with_capacity(batch_size as usize);
        for batch_offset in 0..batch_size {
            let (noise, source_index) =
                if self.config.mode == StochasticApproximationMode::BatchGradient {
                    (
                        self.batch_dataset
                            .get(batch_offset as usize)
                            .copied()
                            .unwrap_or(0.0),
                        batch_offset,
                    )
                } else {
                    let source_index = self.source_index;
                    self.source_index = self.source_index.saturating_add(1);
                    (self.sample_noise(), source_index)
                };
            noises.push(noise);
            let observation = if self.config.mode == StochasticApproximationMode::RobbinsMonro {
                self.config
                    .root_function
                    .evaluate(w_before, self.config.target)
                    + noise
            } else {
                self.config.target + noise
            };
            observations.push(observation);
            batch_indices.push(source_index);
        }
        let noise = noises.iter().copied().sum::<f64>() / batch_size as f64;
        let observation = observations.iter().copied().sum::<f64>() / batch_size as f64;

        let gradient = match self.config.mode {
            StochasticApproximationMode::RobbinsMonro => observation,
            StochasticApproximationMode::Mean
            | StochasticApproximationMode::Sgd
            | StochasticApproximationMode::MiniBatch
            | StochasticApproximationMode::BatchGradient => w_before - observation,
        };
        let update = -alpha * gradient;
        let raw_after = w_before + update;
        let (w_after, projected) = project(raw_after);
        self.current_w = w_after;
        self.iteration_count = index;
        self.alpha_sum += alpha;
        self.alpha_squared_sum += alpha * alpha;
        self.noise_stats.update(noise);
        let error = w_after - self.config.target;
        let row = StochasticApproximationIteration {
            index,
            w_before,
            w_after,
            alpha,
            alpha_squared: alpha * alpha,
            observation,
            gradient,
            noise,
            target: self.config.target,
            error,
            absolute_error: error.abs(),
            objective: if self.config.mode == StochasticApproximationMode::RobbinsMonro {
                0.5 * self
                    .config
                    .root_function
                    .evaluate(w_after, self.config.target)
                    .powi(2)
            } else {
                0.5 * error * error
            },
            update: w_after - w_before,
            batch_size,
            batch_indices,
            projected,
        };
        let history_capacity = self.history_capacity();
        if self.history.len() >= history_capacity {
            // Drop half the old window at a time to keep the amortized cost
            // bounded while ensuring snapshots always describe the recent
            // trajectory rather than an unrelated initial prefix.
            let drop_count = (history_capacity / 2).max(1).min(self.history.len());
            self.history.drain(..drop_count);
        }
        self.history.push(row.clone());
        self.last_iteration = Some(row.clone());
        Ok(row)
    }

    /// Apply up to `count` updates, capped for worker safety.
    pub fn advance(
        &mut self,
        count: u32,
    ) -> Result<StochasticApproximationAdvanceOutcome, StochasticApproximationError> {
        let requested = count.min(MAX_STOCHASTIC_APPROXIMATION_ADVANCE);
        let remaining = self
            .config
            .sample_count
            .saturating_sub(self.iteration_count);
        let amount = requested.min(remaining);
        let mut iterations = Vec::with_capacity(amount as usize);
        for _ in 0..amount {
            iterations.push(self.apply_iteration()?);
        }
        Ok(StochasticApproximationAdvanceOutcome {
            snapshot: self.snapshot(),
            iterations,
        })
    }

    pub fn step(&mut self) -> Result<StochasticApproximationOutcome, StochasticApproximationError> {
        self.iteration()
    }

    /// Drain the finite configured budget.  Browser workers should normally
    /// call `advance` repeatedly so one message stays small.
    pub fn run_to_completion(
        &mut self,
    ) -> Result<StochasticApproximationAdvanceOutcome, StochasticApproximationError> {
        let mut iterations = Vec::new();
        while self.iteration_count < self.config.sample_count {
            let remaining = self
                .config
                .sample_count
                .saturating_sub(self.iteration_count);
            let chunk = remaining.min(MAX_STOCHASTIC_APPROXIMATION_ADVANCE);
            let outcome = self.advance(chunk)?;
            if outcome.iterations.is_empty() {
                break;
            }
            iterations.extend(outcome.iterations);
        }
        Ok(StochasticApproximationAdvanceOutcome {
            snapshot: self.snapshot(),
            iterations,
        })
    }

    /// Reset estimates and replay the same seeded stream unless a new seed is
    /// supplied.
    pub fn reset(&mut self, seed: Option<u64>) -> StochasticApproximationSnapshot {
        if let Some(seed) = seed {
            self.config.seed = seed;
        }
        self.rng = ChaCha8Rng::seed_from_u64(self.config.seed);
        self.current_w = self.config.initial_w;
        self.iteration_count = 0;
        self.alpha_sum = 0.0;
        self.alpha_squared_sum = 0.0;
        self.noise_stats = RunningStats::new();
        self.history.clear();
        self.last_iteration = None;
        self.source_index = 0;
        self.initialize_batch_dataset();
        self.snapshot()
    }

    fn sample_noise(&mut self) -> f64 {
        if self.config.noise_std == 0.0 {
            return 0.0;
        }
        // U[-sqrt(3) σ, sqrt(3) σ] has variance σ².  Keeping the support
        // bounded makes the projection a last-resort guard rather than a
        // routine part of ordinary settings.
        let draw = self.rng.random::<f64>();
        (2.0 * draw - 1.0) * 3.0_f64.sqrt() * self.config.noise_std
    }

    fn initialize_batch_dataset(&mut self) {
        self.batch_dataset.clear();
        if self.config.mode != StochasticApproximationMode::BatchGradient {
            return;
        }
        self.batch_dataset = (0..self.config.batch_size)
            .map(|_| self.sample_noise())
            .collect();
    }

    fn history_capacity(&self) -> usize {
        let batch_size = match self.config.mode {
            StochasticApproximationMode::MiniBatch | StochasticApproximationMode::BatchGradient => {
                self.config.batch_size as usize
            }
            _ => 1,
        };
        (MAX_STOCHASTIC_APPROXIMATION_HISTORY / batch_size.max(1)).max(1)
    }
}

fn project(value: f64) -> (f64, bool) {
    if !value.is_finite() {
        return (
            if value.is_sign_negative() {
                -MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE
            } else {
                MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE
            },
            true,
        );
    }
    let projected = value.clamp(
        -MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE,
        MAX_STOCHASTIC_APPROXIMATION_MAGNITUDE,
    );
    (projected, (projected - value).abs() > f64::EPSILON)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> StochasticApproximationConfig {
        StochasticApproximationConfig {
            mode: StochasticApproximationMode::Mean,
            schedule: StochasticApproximationSchedule::Harmonic,
            root_function: StochasticApproximationRootFunction::Linear,
            target: 2.0,
            initial_w: 0.0,
            alpha: 1.0,
            polynomial_power: 1.0,
            noise_std: 0.0,
            sample_count: 32,
            batch_size: 4,
            tolerance: 1e-9,
            seed: 0x5eed,
        }
    }

    #[test]
    fn parses_mode_and_schedule_aliases() {
        assert_eq!(
            StochasticApproximationMode::try_from("Robbins-Monro"),
            Ok(StochasticApproximationMode::RobbinsMonro)
        );
        assert_eq!(
            StochasticApproximationMode::try_from("mbgd"),
            Ok(StochasticApproximationMode::MiniBatch)
        );
        assert_eq!(
            StochasticApproximationSchedule::try_from("1/k"),
            Ok(StochasticApproximationSchedule::Harmonic)
        );
        assert_eq!(
            StochasticApproximationSchedule::try_from("power-law"),
            Ok(StochasticApproximationSchedule::Polynomial)
        );
    }

    #[test]
    fn harmonic_mean_without_noise_is_the_running_mean() {
        let mut evaluator = StochasticApproximationEvaluator::new(config()).expect("valid config");
        let first = evaluator.iteration().expect("first update").iteration;
        assert_eq!(first.index, 1);
        assert_eq!(first.alpha, 1.0);
        assert_eq!(first.w_after, 2.0);
        let second = evaluator.iteration().expect("second update").iteration;
        assert_eq!(second.alpha, 0.5);
        assert!((second.w_after - 2.0).abs() < f64::EPSILON);
        assert!((evaluator.snapshot().alpha_sum - 1.5).abs() < f64::EPSILON);
    }

    #[test]
    fn linear_robbins_monro_and_sgd_have_same_zero_noise_recursion() {
        let mut rm_config = config();
        rm_config.mode = StochasticApproximationMode::RobbinsMonro;
        rm_config.target = 3.0;
        rm_config.initial_w = -1.0;
        rm_config.schedule = StochasticApproximationSchedule::Constant;
        rm_config.alpha = 0.25;
        let mut sgd_config = rm_config;
        sgd_config.mode = StochasticApproximationMode::Sgd;
        let mut rm = StochasticApproximationEvaluator::new(rm_config).expect("rm");
        let mut sgd = StochasticApproximationEvaluator::new(sgd_config).expect("sgd");
        let rm_out = rm.advance(8).expect("rm advance");
        let sgd_out = sgd.advance(8).expect("sgd advance");
        assert_eq!(
            rm_out
                .iterations
                .iter()
                .map(|row| row.w_after)
                .collect::<Vec<_>>(),
            sgd_out
                .iterations
                .iter()
                .map(|row| row.w_after)
                .collect::<Vec<_>>()
        );
        assert_eq!(rm.snapshot().current_w, sgd.snapshot().current_w);
    }

    #[test]
    fn minibatch_reports_contiguous_indices_and_averaged_noise() {
        let mut cfg = config();
        cfg.mode = StochasticApproximationMode::MiniBatch;
        cfg.batch_size = 3;
        cfg.noise_std = 0.5;
        let mut evaluator = StochasticApproximationEvaluator::new(cfg).expect("valid config");
        let out = evaluator.iteration().expect("batch update");
        assert_eq!(out.iteration.batch_size, 3);
        assert_eq!(out.iteration.batch_indices, vec![0, 1, 2]);
        assert!(out.iteration.noise.abs() <= 3.0_f64.sqrt() * cfg.noise_std);
        assert_eq!(evaluator.snapshot().noise_mean, out.iteration.noise);
    }

    #[test]
    fn seeded_reset_replays_identical_trajectory() {
        let mut evaluator = StochasticApproximationEvaluator::new({
            let mut cfg = config();
            cfg.noise_std = 0.3;
            cfg.mode = StochasticApproximationMode::MiniBatch;
            cfg.batch_size = 2;
            cfg
        })
        .expect("valid config");
        let first = evaluator.advance(6).expect("advance");
        evaluator.reset(None);
        let second = evaluator.advance(6).expect("replay");
        assert_eq!(first, second);
    }

    #[test]
    fn schedule_diagnostic_distinguishes_constant_and_polynomial_conditions() {
        let mut cfg = config();
        cfg.schedule = StochasticApproximationSchedule::Constant;
        let constant = StochasticApproximationEvaluator::new(cfg).expect("constant");
        assert!(!constant.step_size_conditions());
        cfg.schedule = StochasticApproximationSchedule::Polynomial;
        cfg.polynomial_power = 0.75;
        let valid = StochasticApproximationEvaluator::new(cfg).expect("polynomial");
        assert!(valid.step_size_conditions());
        cfg.polynomial_power = 0.25;
        let slow = StochasticApproximationEvaluator::new(cfg).expect("polynomial");
        assert!(!slow.step_size_conditions());
    }

    #[test]
    fn nonlinear_roots_are_centered_on_the_target() {
        for function in StochasticApproximationRootFunction::ALL {
            assert_eq!(function.evaluate(2.0, 2.0), 0.0);
        }
        let mut cfg = config();
        cfg.mode = StochasticApproximationMode::RobbinsMonro;
        cfg.root_function = StochasticApproximationRootFunction::Tanh;
        cfg.target = 1.5;
        cfg.initial_w = 0.0;
        cfg.alpha = 0.5;
        cfg.noise_std = 0.0;
        let mut evaluator = StochasticApproximationEvaluator::new(cfg).expect("valid RM");
        let row = evaluator.iteration().expect("RM update").iteration;
        assert!(row.observation < 0.0);
        assert!(row.w_after > row.w_before);
        assert!(row.gradient < 0.0);
    }

    #[test]
    fn batch_gradient_reuses_one_fixed_dataset() {
        let mut cfg = config();
        cfg.mode = StochasticApproximationMode::BatchGradient;
        cfg.batch_size = 5;
        cfg.noise_std = 0.4;
        cfg.schedule = StochasticApproximationSchedule::Constant;
        cfg.alpha = 0.2;
        let mut evaluator = StochasticApproximationEvaluator::new(cfg).expect("valid BGD");
        let first = evaluator.iteration().expect("first").iteration;
        let second = evaluator.iteration().expect("second").iteration;
        assert_eq!(first.batch_indices, (0..5).collect::<Vec<_>>());
        assert_eq!(second.batch_indices, first.batch_indices);
        assert_eq!(evaluator.snapshot().dataset_size, 5);
        // The fixed data set means the aggregate noisy observation is stable;
        // only w changes between updates.
        assert_eq!(first.noise, second.noise);
    }

    #[test]
    fn batch_history_budget_scales_with_batch_size() {
        let mut cfg = config();
        cfg.mode = StochasticApproximationMode::MiniBatch;
        cfg.batch_size = MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE;
        cfg.sample_count = 64;
        let mut evaluator = StochasticApproximationEvaluator::new(cfg).expect("valid batch");
        evaluator.advance(32).expect("advance");
        assert!(
            evaluator.snapshot().history.len()
                <= MAX_STOCHASTIC_APPROXIMATION_HISTORY
                    / MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE as usize
        );
    }

    #[test]
    fn finite_budget_sets_exhausted_and_truncated_flags() {
        let mut cfg = config();
        cfg.sample_count = 2;
        cfg.target = 100.0;
        cfg.alpha = 0.5;
        cfg.tolerance = 1e-12;
        let mut evaluator = StochasticApproximationEvaluator::new(cfg).expect("valid config");
        evaluator.run_to_completion().expect("run");
        let snapshot = evaluator.snapshot();
        assert!(snapshot.exhausted);
        assert!(snapshot.truncated);
        assert!(!snapshot.converged);
        assert_eq!(snapshot.history.len(), 2);
        assert!(evaluator.iteration().is_err());
    }

    #[test]
    fn validates_bounds() {
        let mut cfg = config();
        cfg.alpha = 0.0;
        assert_eq!(
            cfg.validate(),
            Err(StochasticApproximationConfigError::Alpha)
        );
        cfg = config();
        cfg.batch_size = MAX_STOCHASTIC_APPROXIMATION_BATCH_SIZE + 1;
        assert_eq!(
            cfg.validate(),
            Err(StochasticApproximationConfigError::BatchSize)
        );
        cfg = config();
        cfg.sample_count = 0;
        assert_eq!(
            cfg.validate(),
            Err(StochasticApproximationConfigError::SampleCount)
        );
    }
}
