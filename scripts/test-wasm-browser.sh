#!/usr/bin/env bash
set -euo pipefail

# Keep version comparisons and cache selection deterministic across machines.
export LC_ALL=C

# Run wasm-bindgen browser tests with a WebDriver compatible with the browser
# installed on the machine.  In normal mode the wrapper resolves a matching
# Chrome for Testing driver before invoking wasm-pack; this avoids the common
# failure where wasm-pack downloads a driver newer than a pinned/older Chrome.

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

usage() {
  cat <<'EOF'
Usage: scripts/test-wasm-browser.sh [OPTIONS] [-- CARGO_TEST_ARGS...]

Run wasm-bindgen browser tests for the MathRL Wasm crate.

Options:
  -b, --browser NAME           chrome (default) or firefox
  -p, --crate PATH             crate to test (default: crates/mathrl-wasm)
  -d, --chromedriver PATH      explicit ChromeDriver path (chrome only)
      --geckodriver PATH       explicit geckodriver path (firefox only)
      --driver-search-dir DIR  search DIR for a local driver (repeatable)
      --mode MODE               wasm-pack mode: normal or no-install
      --release                 pass --release to wasm-pack
      --no-headless              run with a visible browser
      --no-driver-download       fail instead of allowing a driver download
      --check-only               validate tools and driver selection only
  -h, --help                    show this help

Environment variables:
  WASM_BROWSER, WASM_TEST_CRATE, CHROMEDRIVER, GECKODRIVER
  WASM_CHROMEDRIVER_SEARCH_DIRS (colon-separated directories)
  WASM_CHROMEDRIVER_VERSION (optional exact four-part version)
  WASM_CHROMEDRIVER_SHA256 (optional SHA-256 pin for the executable)
  WASM_PACK_MODE (normal|no-install), WASM_NO_DRIVER_DOWNLOAD=1
  CHROME_BIN/CHROME_PATH/GOOGLE_CHROME or FIREFOX_BIN

Relative paths are resolved from the repository root. For Chrome, local
drivers are ranked exact version > same build (first three components) > same
major version; ties are resolved by version and then path. An explicit
mismatched driver is an error. Automatic Chrome for Testing downloads support
Linux x64/arm64 and macOS x64/arm64.
For security, world-writable temporary directories are not searched implicitly;
pass a temporary unpack directory with --driver-search-dir when needed.
With normal mode and no local match, the wrapper downloads and caches a
same-major Chrome for Testing driver.  Pass --no-driver-download or set
WASM_NO_DRIVER_DOWNLOAD=1 for a hermetic run; that mode requires an explicit
or already-cached matching driver and never lets wasm-pack fetch one.
WASM_CHROMEDRIVER_VERSION can pin the exact four-part Chrome for Testing
version; pair it with WASM_CHROMEDRIVER_SHA256 for a reproducible release.
--check-only never downloads or writes a driver; it reports whether a normal
run would need the network.
EOF
}

die() {
  echo "test-wasm-browser: $*" >&2
  exit 1
}

warn() {
  echo "test-wasm-browser: warning: $*" >&2
}

# Chrome and ChromeDriver versions are four-part release numbers in the
# Chrome-for-Testing metadata.  Some distro builds omit the final patch part,
# so accept a validated three-part value when comparing local executables.
chrome_version_is_valid() {
  local value="$1"
  [[ "$value" =~ ^[0-9]{1,10}\.[0-9]{1,10}\.[0-9]{1,10}(\.[0-9]{1,10})?$ ]]
}

chrome_build_prefix() {
  local value="$1"
  local first second third
  IFS='.' read -r first second third _ <<< "$value"
  printf '%s.%s.%s\n' "$first" "$second" "$third"
}

# Return success when the first version is numerically newer than the second.
# Callers validate both values before entering this helper; limiting each
# component to ten digits keeps the arithmetic bounded on 64-bit Bash.
chrome_version_is_newer() {
  local left="$1"
  local right="$2"
  local index
  local left_part
  local right_part
  local -a left_parts=()
  local -a right_parts=()
  IFS='.' read -r -a left_parts <<< "$left"
  IFS='.' read -r -a right_parts <<< "$right"
  for ((index = 0; index < 4; index += 1)); do
    left_part="${left_parts[index]:-0}"
    right_part="${right_parts[index]:-0}"
    if ((10#$left_part > 10#$right_part)); then
      return 0
    fi
    if ((10#$left_part < 10#$right_part)); then
      return 1
    fi
  done
  return 1
}

zip_entry_is_safe() {
  local entry="$1"
  local component
  local -a components=()

  # ZIP names are slash-separated even on Unix.  Reject names that could be
  # interpreted as absolute paths, drive/ADS paths, or traversal components.
  [[ -n "$entry" ]] || return 1
  [[ "$entry" != /* ]] || return 1
  [[ "$entry" != *\\* ]] || return 1
  [[ "$entry" != *:* ]] || return 1
  [[ "$entry" != *$'\r'* && "$entry" != *$'\n'* ]] || return 1
  IFS='/' read -r -a components <<< "$entry"
  for component in "${components[@]}"; do
    [[ "$component" != '..' && "$component" != '.' ]] || return 1
  done
  return 0
}

path_is_absolute_non_root() {
  local value="$1"
  [[ "$value" == /* && "$value" != '/' ]]
}

browser="${WASM_BROWSER:-chrome}"
crate_path="${WASM_TEST_CRATE:-crates/mathrl-wasm}"
chromedriver_path="${CHROMEDRIVER:-}"
geckodriver_path="${GECKODRIVER:-}"
mode="${WASM_PACK_MODE:-normal}"
release=0
headless=1
check_only=0
no_driver_download="${WASM_NO_DRIVER_DOWNLOAD:-0}"
chromedriver_version_pin="${WASM_CHROMEDRIVER_VERSION:-}"
chromedriver_sha256_pin="${WASM_CHROMEDRIVER_SHA256:-}"
driver_search_dirs=()
driver_search_dir_explicit=()
extra_args=()

if [[ -n "${WASM_CHROMEDRIVER_SEARCH_DIRS:-}" ]]; then
  IFS=':' read -r -a env_driver_search_dirs <<< "$WASM_CHROMEDRIVER_SEARCH_DIRS"
  for env_driver_search_dir in "${env_driver_search_dirs[@]}"; do
    if [[ -n "$env_driver_search_dir" ]]; then
      driver_search_dirs+=("$env_driver_search_dir")
      driver_search_dir_explicit+=(1)
    fi
  done
fi

resolve_from_root() {
  local value="$1"
  if [[ "$value" == /* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s/%s\n' "$project_root" "$value"
  fi
}

resolve_driver_arg() {
  local value="$1"
  local resolved
  if [[ "$value" != */* ]]; then
    resolved="$(command -v "$value" 2>/dev/null || true)"
    if [[ -n "$resolved" ]]; then
      printf '%s\n' "$resolved"
      return 0
    fi
  fi
  resolve_from_root "$value"
}

while (($# > 0)); do
  case "$1" in
    -b|--browser)
      (($# >= 2)) || die "$1 requires a value"
      browser="$2"
      shift 2
      ;;
    -p|--crate)
      (($# >= 2)) || die "$1 requires a value"
      crate_path="$2"
      shift 2
      ;;
    -d|--chromedriver)
      (($# >= 2)) || die "$1 requires a value"
      chromedriver_path="$2"
      shift 2
      ;;
    --geckodriver)
      (($# >= 2)) || die "$1 requires a value"
      geckodriver_path="$2"
      shift 2
      ;;
    --driver-search-dir)
      (($# >= 2)) || die "$1 requires a value"
      driver_search_dirs+=("$2")
      driver_search_dir_explicit+=(1)
      shift 2
      ;;
    --mode)
      (($# >= 2)) || die "$1 requires a value"
      mode="$2"
      shift 2
      ;;
    --release)
      release=1
      shift
      ;;
    --no-headless)
      headless=0
      shift
      ;;
    --no-driver-download)
      no_driver_download=1
      shift
      ;;
    --check-only)
      check_only=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      extra_args+=("$@")
      break
      ;;
    -* )
      die "unknown option: $1 (use -- to pass cargo test arguments)"
      ;;
    *)
      die "unexpected argument: $1 (use -- to pass cargo test arguments)"
      ;;
  esac
done

case "$browser" in
  chrome|firefox) ;;
  *) die "unsupported browser '$browser'; choose chrome or firefox" ;;
esac

case "$mode" in
  normal|no-install) ;;
  *) die "invalid --mode '$mode'; choose normal or no-install" ;;
esac

case "$no_driver_download" in
  0|1|true|false) ;;
  *) die "WASM_NO_DRIVER_DOWNLOAD must be 0/1/true/false" ;;
esac

if [[ -n "$chromedriver_sha256_pin" && ! "$chromedriver_sha256_pin" =~ ^[0-9a-fA-F]{64}$ ]]; then
  die "WASM_CHROMEDRIVER_SHA256 must be a 64-character hexadecimal SHA-256"
fi
if [[ -n "$chromedriver_version_pin" && ! "$chromedriver_version_pin" =~ ^[0-9]{1,10}(\.[0-9]{1,10}){3}$ ]]; then
  die "WASM_CHROMEDRIVER_VERSION must be a four-part numeric version"
fi
if [[ -n "$chromedriver_sha256_pin" && -z "$chromedriver_version_pin" ]]; then
  die "WASM_CHROMEDRIVER_SHA256 must be paired with WASM_CHROMEDRIVER_VERSION"
fi

if [[ "$browser" == firefox && -n "$chromedriver_path" ]]; then
  die "--chromedriver/CHROMEDRIVER can only be used with --browser chrome"
fi
if [[ "$browser" == chrome && -n "$geckodriver_path" ]]; then
  die "--geckodriver/GECKODRIVER can only be used with --browser firefox"
fi
if [[ "$browser" == firefox && ( -n "$chromedriver_version_pin" || -n "$chromedriver_sha256_pin" ) ]]; then
  die "WASM_CHROMEDRIVER_VERSION/SHA256 can only be used with --browser chrome"
fi

crate_path="$(resolve_from_root "$crate_path")"
[[ -d "$crate_path" ]] || die "crate directory does not exist: $crate_path"
[[ -f "$crate_path/Cargo.toml" ]] || die "crate has no Cargo.toml: $crate_path"

# Version probes run through a bounded command wrapper.  Besides preventing a
# broken/malicious executable on PATH from hanging the gate, this keeps the
# browser/driver and tool checks consistent on CI and developer machines.
version_timeout_command=()
version_timeout_fallback=0
if command -v timeout >/dev/null 2>&1; then
  version_timeout_command=("$(command -v timeout)" --kill-after=2s 10s)
elif command -v gtimeout >/dev/null 2>&1; then
  version_timeout_command=("$(command -v gtimeout)" --kill-after=2s 10s)
else
  # macOS does not ship GNU coreutils.  Keep the version probes bounded there
  # as well by using a small POSIX-shell watchdog instead of silently running
  # an untrusted executable forever.
  version_timeout_fallback=1
  warn "GNU timeout/gtimeout not found; using the portable 10-second version-probe watchdog"
fi

run_version_command_fallback() {
  local temporary_root="${TMPDIR:-/tmp}"
  [[ "$temporary_root" == /* && "$temporary_root" != '/' ]] || temporary_root='/tmp'
  local probe_dir
  if ! probe_dir="$(umask 077; mktemp -d "$temporary_root/mathrl-version.XXXXXX" 2>/dev/null)"; then
    return 125
  fi
  local stdout_file="$probe_dir/stdout"
  local stderr_file="$probe_dir/stderr"
  local status_file="$probe_dir/status"
  local child_pid
  local child_status=0
  local tick
  (
    command_status=0
    if "$@" >"$stdout_file" 2>"$stderr_file"; then
      command_status=0
    else
      command_status=$?
    fi
    printf '%s\n' "$command_status" >"$status_file"
  ) &
  child_pid=$!
  for ((tick = 0; tick < 100; tick += 1)); do
    if [[ -s "$status_file" ]]; then
      break
    fi
    if ! sleep 0.1; then
      kill "$child_pid" 2>/dev/null || true
      kill -9 "$child_pid" 2>/dev/null || true
      wait "$child_pid" 2>/dev/null || true
      rm -f "$stdout_file" "$stderr_file" "$status_file" || true
      rmdir "$probe_dir" 2>/dev/null || true
      return 125
    fi
  done
  if [[ ! -s "$status_file" ]]; then
    # Give a well-behaved process a short grace period, then force-kill it.
    kill "$child_pid" 2>/dev/null || true
    for ((tick = 0; tick < 20; tick += 1)); do
      if [[ -s "$status_file" ]]; then break; fi
      sleep 0.1 || true
    done
    kill -9 "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
    child_status=124
  else
    if ! child_status="$(sed -n '1p' "$status_file")" || [[ ! "$child_status" =~ ^[0-9]+$ ]]; then
      child_status=125
    fi
    wait "$child_pid" 2>/dev/null || true
  fi
  if ! cat "$stdout_file"; then
    child_status=125
  fi
  if ! cat "$stderr_file" >&2; then
    child_status=125
  fi
  rm -f "$stdout_file" "$stderr_file" "$status_file" || true
  rmdir "$probe_dir" 2>/dev/null || true
  return "$child_status"
}

run_version_command() {
  if ((version_timeout_fallback == 1)); then
    run_version_command_fallback "$@"
  else
    "${version_timeout_command[@]}" "$@"
  fi
}

command -v wasm-pack >/dev/null 2>&1 || die "wasm-pack is required (expected pinned 0.15.0)"

wasm_pack_version="$(run_version_command wasm-pack --version 2>/dev/null || true)"
if [[ "$wasm_pack_version" != "wasm-pack 0.15.0" ]]; then
  die "wasm-pack 0.15.0 is required; found ${wasm_pack_version:-unknown}"
fi

command -v wasm-bindgen-test-runner >/dev/null 2>&1 \
  || die "wasm-bindgen-test-runner is required (expected pinned 0.2.127)"
wasm_bindgen_runner_version="$(run_version_command wasm-bindgen-test-runner --version 2>/dev/null || true)"
if [[ "$wasm_bindgen_runner_version" != "wasm-bindgen-test-runner 0.2.127" ]]; then
  die "wasm-bindgen-test-runner 0.2.127 is required; found ${wasm_bindgen_runner_version:-unknown}"
fi

sha256_file() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{print $1}'
  else
    return 1
  fi
}

canonical_existing_path() {
  local path="$1"
  local resolved=''
  if command -v realpath >/dev/null 2>&1; then
    resolved="$(realpath "$path" 2>/dev/null || true)"
  fi
  if [[ -z "$resolved" ]] && command -v readlink >/dev/null 2>&1; then
    resolved="$(readlink -f "$path" 2>/dev/null || true)"
  fi
  if [[ -z "$resolved" && -e "$path" ]]; then
    # BSD systems may not provide readlink -f.  Resolve the parent physically;
    # this still gives a stable absolute path for ordinary executable files.
    resolved="$(cd -P "$(dirname "$path")" 2>/dev/null && printf '%s/%s\n' "$PWD" "$(basename "$path")")"
  fi
  [[ -n "$resolved" ]] || return 1
  printf '%s\n' "$resolved"
}

file_mode() {
  local path="$1"
  local mode=''
  if mode="$(stat -c '%a' "$path" 2>/dev/null)"; then
    printf '%s\n' "$mode"
    return 0
  fi
  if mode="$(stat -f '%Lp' "$path" 2>/dev/null)"; then
    printf '%s\n' "$mode"
    return 0
  fi
  return 1
}

directory_tree_is_safe() {
  local path="$1"
  local resolved
  local mode
  local leaf=1
  [[ "$path" == /* && -d "$path" && ! -L "$path" ]] || return 1
  resolved="$(canonical_existing_path "$path" || true)"
  [[ -n "$resolved" && -d "$resolved" ]] || return 1
  while [[ "$resolved" != '/' ]]; do
    mode="$(file_mode "$resolved" || true)"
    [[ "$mode" =~ ^[0-7]+$ ]] || return 1
    if (( (8#$mode & 022) != 0 )); then
      # A private cache may live below the conventional sticky temporary
      # directory (for example /tmp).  The sticky bit prevents other users
      # from replacing/removing our 0700 child, but the cache directory
      # itself must never be group/other writable.
      if (( leaf == 1 || (8#$mode & 01000) == 0 )); then return 1; fi
    fi
    leaf=0
    resolved="$(dirname "$resolved")"
  done
  return 0
}

implicit_driver_path_is_safe() {
  local path="$1"
  local resolved
  local mode
  local leaf=1
  [[ "$path" == /* && -f "$path" && -x "$path" ]] || return 1
  resolved="$(canonical_existing_path "$path" || true)"
  [[ -n "$resolved" && -f "$resolved" && -x "$resolved" ]] || return 1
  # Implicit candidates may come from PATH or caches, so reject a file or any
  # parent directory writable by group/other users. Explicit paths remain an
  # intentional user override and are checked for version compatibility below.
  while [[ "$resolved" != '/' ]]; do
    mode="$(file_mode "$resolved" || true)"
    [[ "$mode" =~ ^[0-7]+$ ]] || return 1
    if (( (8#$mode & 022) != 0 )); then
      if (( leaf == 1 || (8#$mode & 01000) == 0 )); then return 1; fi
    fi
    leaf=0
    resolved="$(dirname "$resolved")"
  done
  return 0
}

find_executable() {
  local candidate
  for candidate in "$@"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
    if [[ -n "$candidate" ]]; then
      candidate="$(command -v "$candidate" 2>/dev/null || true)"
      if [[ -n "$candidate" && -x "$candidate" ]]; then
        printf '%s\n' "$candidate"
        return 0
      fi
    fi
  done
  return 1
}

user_cache_root="${XDG_CACHE_HOME:-${HOME:+$HOME/.cache}}"
playwright_cache="${PLAYWRIGHT_BROWSERS_PATH:-}"
if [[ -z "$playwright_cache" || "$playwright_cache" == 0 ]]; then
  if [[ "$playwright_cache" == 0 ]]; then
    playwright_cache="$project_root/node_modules/.cache/ms-playwright"
  else
    playwright_cache="${user_cache_root:+$user_cache_root/ms-playwright}"
  fi
fi
playwright_chrome_candidates=()
playwright_firefox_candidates=()
if [[ -d "$playwright_cache" ]]; then
  for candidate in "$playwright_cache"/chromium-*/chrome-linux/chrome "$playwright_cache"/chromium-*/chrome-linux64/chrome; do
    [[ -x "$candidate" ]] && playwright_chrome_candidates+=("$candidate")
  done
  for candidate in "$playwright_cache"/firefox-*/firefox/firefox; do
    [[ -x "$candidate" ]] && playwright_firefox_candidates+=("$candidate")
  done
fi

if [[ "$browser" == chrome ]]; then
  browser_bin="$(find_executable "${CHROME_BIN:-}" "${CHROME_PATH:-}" "${GOOGLE_CHROME:-}" google-chrome google-chrome-stable chromium chromium-browser "${playwright_chrome_candidates[@]}" || true)"
  [[ -n "$browser_bin" ]] || die "Chrome/Chromium executable not found; set CHROME_BIN"
  browser_label="Chrome/Chromium"
else
  browser_bin="$(find_executable "${FIREFOX_BIN:-}" firefox firefox-esr "${playwright_firefox_candidates[@]}" || true)"
  [[ -n "$browser_bin" ]] || die "Firefox executable not found; set FIREFOX_BIN"
  browser_label="Firefox"
fi

echo "$browser_label executable: $browser_bin"
# ChromeDriver normally discovers Chrome through its platform defaults.  These
# variables are also honored by common wrapper/CI images and make the selected
# executable explicit wherever the driver supports them.
if [[ "$browser" == chrome ]]; then
  export CHROME_BIN="$browser_bin"
  export CHROME="$browser_bin"
else
  export FIREFOX_BIN="$browser_bin"
fi

browser_version_output="$(run_version_command "$browser_bin" --version 2>/dev/null || true)"
extract_version() {
  local output="$1"
  if [[ "$output" =~ ([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
  elif [[ "$output" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
  elif [[ "$output" =~ ([0-9]+\.[0-9]+) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
  else
    return 1
  fi
}

browser_version="$(extract_version "$browser_version_output" || true)"
browser_major=""
if [[ -n "$browser_version" ]]; then
  browser_major="${browser_version%%.*}"
  echo "$browser_label: $browser_version"
else
  warn "could not parse $browser_label version from: $browser_version_output"
fi
if [[ "$browser" == chrome ]]; then
  if ! chrome_version_is_valid "$browser_version"; then
    die "could not parse a safe Chrome version from: ${browser_version_output:-<no output>}"
  fi
  browser_build="$(chrome_build_prefix "$browser_version")"
  if [[ -n "$chromedriver_version_pin" && "${chromedriver_version_pin%%.*}" != "$browser_major" ]]; then
    die "pinned ChromeDriver $chromedriver_version_pin does not match Chrome major $browser_major ($browser_version)"
  fi
  if [[ -n "$chromedriver_version_pin" && "$chromedriver_version_pin" != "$browser_version" ]]; then
    die "pinned ChromeDriver $chromedriver_version_pin does not match the selected Chrome $browser_version"
  fi
fi

driver_candidates=()
driver_candidate_explicit=()
seen_candidates=()
candidate_seen() {
  local candidate="$1"
  local existing
  for existing in "${seen_candidates[@]}"; do
    [[ "$existing" == "$candidate" ]] && return 0
  done
  return 1
}

add_candidate() {
  local candidate="$1"
  local explicit_source="${2:-0}"
  local index
  [[ -n "$candidate" ]] || return 0
  if [[ "$candidate" != /* ]]; then
    candidate="$(resolve_from_root "$candidate")"
  fi
  [[ -f "$candidate" ]] || return 0
  candidate="$(canonical_existing_path "$candidate" || true)"
  [[ -n "$candidate" ]] || return 0
  if candidate_seen "$candidate"; then
    for index in "${!driver_candidates[@]}"; do
      if [[ "${driver_candidates[index]}" == "$candidate" && "$explicit_source" == 1 ]]; then
        driver_candidate_explicit[index]=1
      fi
    done
  else
    seen_candidates+=("$candidate")
    driver_candidates+=("$candidate")
    driver_candidate_explicit+=("$explicit_source")
  fi
}

search_driver_dir() {
  local directory="$1"
  local explicit_source="${2:-0}"
  [[ -d "$directory" ]] || return 0
  while IFS= read -r -d '' candidate; do
    add_candidate "$candidate" "$explicit_source"
  done < <(find "$directory" -maxdepth 5 -type f \( -name chromedriver -o -name chromedriver.exe \) -print0 2>/dev/null)
}

driver_version_for() {
  local driver="$1"
  local output
  output="$(run_version_command "$driver" --version 2>/dev/null || true)"
  extract_version "$output" || true
}

driver_sha256_for() {
  local driver="$1"
  local digest
  digest="$(sha256_file "$driver" 2>/dev/null || true)"
  [[ "$digest" =~ ^[0-9a-fA-F]{64}$ ]] || return 1
  printf '%s\n' "$digest"
}

verify_driver_sha256() {
  local driver="$1"
  local label="$2"
  local digest
  if ! digest="$(driver_sha256_for "$driver")"; then
    if [[ -n "$chromedriver_sha256_pin" ]]; then
      die "cannot calculate SHA-256 for pinned ChromeDriver ($label): $driver"
    fi
    warn "could not calculate ChromeDriver SHA-256 ($label): $driver"
    return 0
  fi
  if [[ -n "$chromedriver_sha256_pin" ]]; then
    # Bash 3.2 (still present on older macOS hosts) has no ${var,,}; compare
    # case-insensitively through LC_ALL=C/tr instead.
    local expected
    expected="$(printf '%s' "$chromedriver_sha256_pin" | tr '[:upper:]' '[:lower:]')"
    local actual
    actual="$(printf '%s' "$digest" | tr '[:upper:]' '[:lower:]')"
    if [[ "$actual" != "$expected" ]]; then
      die "ChromeDriver SHA-256 mismatch ($label): expected $expected, got $actual"
    fi
  fi
  printf 'ChromeDriver SHA-256 (%s): %s\n' "$label" "$digest" >&2
}

create_webdriver_capabilities() {
  local browser_name="$1"
  local binary_path="$2"
  local temporary_root="${TMPDIR:-/tmp}"
  [[ "$temporary_root" == /* ]] || temporary_root="/tmp"
  local config_path
  if ! config_path="$(umask 077; mktemp "$temporary_root/mathrl-wasm-webdriver.XXXXXX")"; then
    die "could not create temporary WebDriver capability file"
  fi
  if ! node --input-type=module - "$browser_name" "$binary_path" "$config_path" <<'NODE'
import { writeFileSync } from 'node:fs'

const [browser, binary, output] = process.argv.slice(2)
const capabilities = browser === 'chrome'
  ? { 'goog:chromeOptions': { binary } }
  : { 'moz:firefoxOptions': { binary } }
writeFileSync(output, `${JSON.stringify(capabilities)}\n`, { encoding: 'utf8', mode: 0o600 })
NODE
  then
    rm -f "$config_path"
    die "could not write temporary WebDriver capability file"
  fi
  printf '%s\n' "$config_path"
}

# Resolve and install a Chrome-for-Testing driver only after validating the
# metadata, archive, extracted tree, and executable version.  The function is
# deliberately explicit about failure because callers may invoke it from a
# conditional context where Bash's errexit is disabled.
download_matching_chromedriver_hardened() {
  local cache_root="$1"
  local browser_version_value="$2"
  local browser_major_value="$3"
  local machine
  local architecture
  local platform
  local driver_filename="chromedriver"

  if ! machine="$(uname -s 2>/dev/null)" || ! architecture="$(uname -m 2>/dev/null)"; then
    warn "cannot determine the host platform for ChromeDriver"
    return 1
  fi
  case "$machine:$architecture" in
    Linux:x86_64|Linux:amd64) platform="linux64" ;;
    Linux:aarch64|Linux:arm64) platform="linux-arm64" ;;
    Darwin:x86_64) platform="mac-x64" ;;
    Darwin:arm64) platform="mac-arm64" ;;
    *) warn "cannot select a Chrome for Testing driver for $machine/$architecture"; return 1 ;;
  esac

  if ! chrome_version_is_valid "$browser_version_value"; then
    warn "cannot select a driver for invalid Chrome version '$browser_version_value'"
    return 1
  fi
  if [[ "${browser_version_value%%.*}" != "$browser_major_value" ]]; then
    warn "Chrome version/major mismatch: $browser_version_value vs $browser_major_value"
    return 1
  fi
  if [[ -z "$cache_root" ]]; then
    warn "a writable cache root is required for automatic ChromeDriver download (set XDG_CACHE_HOME or HOME)"
    return 1
  fi
  if ! path_is_absolute_non_root "$cache_root"; then
    warn "cache root must be an absolute non-root path: $cache_root"
    return 1
  fi
  # Do not silently follow a caller-provided cache symlink.  The managed
  # cache is a trust boundary; resolving the target first could otherwise
  # make an attacker-controlled directory look like a private cache.
  if [[ -L "$cache_root" || -L "${cache_root%/}" ]]; then
    warn "cache root must not be a symbolic link: $cache_root"
    return 1
  fi
  if [[ -e "$cache_root" && ! -d "$cache_root" ]]; then
    warn "cache root is not a directory: $cache_root"
    return 1
  fi
  if [[ ! -e "$cache_root" ]]; then
    if ! (umask 077; mkdir -p "$cache_root"); then
      warn "could not create ChromeDriver cache root: $cache_root"
      return 1
    fi
  fi
  if ! cache_root="$(cd -P "$cache_root" && pwd -P)"; then
    warn "could not resolve ChromeDriver cache root"
    return 1
  fi
  if ! directory_tree_is_safe "$cache_root"; then
    warn "ChromeDriver cache root or one of its parents is group/other writable: $cache_root"
    return 1
  fi

  if ! command -v curl >/dev/null 2>&1; then
    warn "curl is required to fetch a matching ChromeDriver"
    return 1
  fi
  if ! command -v unzip >/dev/null 2>&1; then
    warn "unzip is required to unpack a matching ChromeDriver"
    return 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    warn "Node.js is required to select a matching ChromeDriver"
    return 1
  fi

  local metadata_url='https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json'
  local metadata_max_bytes=16777216
  local archive_max_bytes=67108864
  local unpacked_max_bytes=268435456
  local temporary_root="${TMPDIR:-/tmp}"
  [[ "$temporary_root" == /* ]] || temporary_root="/tmp"
  local work_dir
  if ! work_dir="$(mktemp -d "$temporary_root/mathrl-wasm-driver.XXXXXX")"; then
    warn "could not create a temporary ChromeDriver workspace"
    return 1
  fi
  local install_path=''
  local cleanup_work=1
  local lock_dir=''
  local lock_acquired=0
  trap '
    if [[ -n "${install_path:-}" && ( -e "${install_path:-}" || -L "${install_path:-}" ) ]]; then
      if ! rm -f "${install_path}"; then warn "could not clean temporary driver install"; fi
    fi
    if [[ "${cleanup_work:-0}" == 1 && -n "${work_dir:-}" ]]; then
      if ! rm -rf "${work_dir}"; then warn "could not clean temporary ChromeDriver workspace: ${work_dir}"; fi
    fi
    if [[ "${lock_acquired:-0}" == 1 && -n "${lock_dir:-}" && -d "${lock_dir}" ]]; then
      if ! rm -f "${lock_dir}/pid"; then warn "could not remove ChromeDriver cache lock marker"; fi
      if ! rmdir "${lock_dir}" 2>/dev/null; then warn "could not release ChromeDriver cache lock: ${lock_dir}"; fi
    fi
  ' RETURN

  local selected_version=''
  local driver_url=''
  if [[ -n "$chromedriver_version_pin" ]]; then
    # An exact version pin makes the download URL deterministic; the SHA-256
    # pin (when supplied) then authenticates the executable bytes.  Metadata is
    # still used for unpinned developer runs to find the closest compatible
    # build.
    selected_version="$chromedriver_version_pin"
    driver_url="https://storage.googleapis.com/chrome-for-testing-public/${selected_version}/${platform}/chromedriver-${platform}.zip"
  else
    local metadata_file="$work_dir/metadata.json"
    local metadata_effective_url
    if ! metadata_effective_url="$(curl -q --fail --silent --show-error --location \
        --proto '=https' --proto-redir '=https' --max-time 30 \
        --max-filesize "$metadata_max_bytes" --output "$metadata_file" \
        --write-out '%{url_effective}' "$metadata_url")"; then
      warn "could not download Chrome for Testing version metadata"
      return 1
    fi
    if [[ ! "$metadata_effective_url" =~ ^https://googlechromelabs\.github\.io/ ]]; then
      warn "Chrome for Testing metadata redirected to an unexpected host"
      return 1
    fi
    local metadata_size
    if ! metadata_size="$(wc -c < "$metadata_file")"; then
      warn "could not determine Chrome for Testing metadata size"
      return 1
    fi
    metadata_size="${metadata_size//[[:space:]]/}"
    if [[ ! "$metadata_size" =~ ^[0-9]+$ ]] || ((metadata_size > metadata_max_bytes)); then
      warn "Chrome for Testing metadata exceeds the size limit"
      return 1
    fi

    local selection_file="$work_dir/selection.txt"
    local selection_status=0
    node --input-type=module - "$metadata_file" "$browser_version_value" "$browser_major_value" "$platform" >"$selection_file" <<'NODE' || selection_status=$?
import { readFileSync } from 'node:fs'

const [metadataPath, browserVersion, browserMajor, platform] = process.argv.slice(2)
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
const versionPattern = /^[0-9]{1,10}(?:\.[0-9]{1,10}){3}$/
const numericVersion = (value) => value.split('.').map((part) => Number.parseInt(part, 10) || 0)
const compareVersion = (left, right) => {
  const a = numericVersion(left)
  const b = numericVersion(right)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (b[index] ?? 0) - (a[index] ?? 0)
  }
  return 0
}
const buildPrefix = browserVersion.split('.').slice(0, 3).join('.')
const validDownload = (entry, version) => {
  if (!entry || typeof entry.url !== 'string') return null
  let url
  try { url = new URL(entry.url) } catch { return null }
  const expectedPath = `/chrome-for-testing-public/${version}/${platform}/chromedriver-${platform}.zip`
  if (url.protocol !== 'https:' || url.hostname !== 'storage.googleapis.com'
      || url.username || url.password || url.port || url.search || url.hash
      || url.pathname !== expectedPath) return null
  return url.toString()
}
const candidates = (metadata.versions ?? [])
  .filter((entry) => entry && typeof entry.version === 'string' && versionPattern.test(entry.version))
  .filter((entry) => entry.version.split('.')[0] === browserMajor)
  .map((entry) => ({
    version: entry.version,
    url: validDownload(entry.downloads?.chromedriver?.find((download) => download?.platform === platform), entry.version),
  }))
  .filter((entry) => entry.url)
  .sort((left, right) => compareVersion(left.version, right.version))
const compareAscending = (left, right) => -compareVersion(left, right)
const notNewer = candidates.filter((entry) => compareAscending(entry.version, browserVersion) <= 0)
const pool = notNewer.length > 0 ? notNewer : candidates
const chosen = pool.find((entry) => entry.version === browserVersion)
  ?? pool.find((entry) => entry.version.startsWith(`${buildPrefix}.`))
  ?? pool[0]
if (!chosen) process.exit(2)
process.stdout.write(`${chosen.version}\n${chosen.url}\n`)
NODE
    if ((selection_status == 0)); then
      selected_version="$(sed -n '1p' "$selection_file")"
      driver_url="$(sed -n '2p' "$selection_file")"
    fi
    if ((selection_status != 0)) || [[ -z "$selected_version" || -z "$driver_url" ]]; then
      warn "Chrome for Testing has no compatible ChromeDriver for Chrome $browser_version_value"
      return 1
    fi
  fi
  if [[ ! "$selected_version" =~ ^[0-9]{1,10}(\.[0-9]{1,10}){3}$ \
      || "${selected_version%%.*}" != "$browser_major_value" ]]; then
    warn "Chrome for Testing returned an invalid driver version: $selected_version"
    return 1
  fi
  local expected_driver_url="https://storage.googleapis.com/chrome-for-testing-public/${selected_version}/${platform}/chromedriver-${platform}.zip"
  if [[ "$driver_url" != "$expected_driver_url" ]]; then
    warn "Chrome for Testing returned an unexpected driver URL"
    return 1
  fi

  local wasm_cache_parent="$cache_root/.wasm-pack"
  local managed_cache_root="$wasm_cache_parent/mathrl-chromedriver"
  if [[ -L "$wasm_cache_parent" || ( -e "$wasm_cache_parent" && ! -d "$wasm_cache_parent" ) ]]; then
    warn "ChromeDriver cache parent is not a trusted directory: $wasm_cache_parent"
    return 1
  fi
  if [[ -L "$managed_cache_root" || ( -e "$managed_cache_root" && ! -d "$managed_cache_root" ) ]]; then
    warn "ChromeDriver managed cache is not a directory: $managed_cache_root"
    return 1
  fi
  if ! (umask 077; mkdir -p "$managed_cache_root"); then
    warn "could not create ChromeDriver managed cache: $managed_cache_root"
    return 1
  fi
  if ! chmod 700 "$managed_cache_root"; then
    warn "could not secure ChromeDriver managed cache: $managed_cache_root"
    return 1
  fi
  # The parent is part of the managed cache boundary.  Restrict it before
  # trusting any executable found below it; this also repairs the mode created
  # by older wasm-pack versions when the directory belongs to this user.
  if ! chmod 700 "$wasm_cache_parent"; then
    warn "could not secure ChromeDriver cache parent: $wasm_cache_parent"
    return 1
  fi

  local version_cache_dir="$managed_cache_root/$selected_version"
  local driver_cache_dir="$version_cache_dir/$platform"
  if [[ "$driver_cache_dir" != "$managed_cache_root/"* ]]; then
    warn "ChromeDriver cache path escaped its root"
    return 1
  fi
  if [[ -L "$version_cache_dir" || -L "$driver_cache_dir" ]]; then
    warn "ChromeDriver cache path contains a symbolic link"
    return 1
  fi
  if ! (umask 077; mkdir -p "$driver_cache_dir"); then
    warn "could not create ChromeDriver cache directory: $driver_cache_dir"
    return 1
  fi
  if ! chmod 700 "$version_cache_dir"; then
    warn "could not secure ChromeDriver version cache directory: $version_cache_dir"
    return 1
  fi
  if ! chmod 700 "$driver_cache_dir"; then
    warn "could not secure ChromeDriver cache directory: $driver_cache_dir"
    return 1
  fi
  local managed_cache_real
  local driver_cache_real
  if ! managed_cache_real="$(cd -P "$managed_cache_root" && pwd -P)" \
      || ! driver_cache_real="$(cd -P "$driver_cache_dir" && pwd -P)"; then
    warn "could not resolve ChromeDriver cache path"
    return 1
  fi
  case "$driver_cache_real/" in
    "$managed_cache_real"/*) ;;
    *) warn "ChromeDriver cache path resolved outside its root"; return 1 ;;
  esac

  lock_dir="$managed_cache_root/.lock"
  local lock_attempt
  for ((lock_attempt = 0; lock_attempt < 240; lock_attempt += 1)); do
    if (umask 077; mkdir "$lock_dir" 2>/dev/null); then
      lock_acquired=1
      if ! (umask 077; printf '%s\n' "$$" > "$lock_dir/pid"); then
        warn "could not initialize ChromeDriver cache lock"
        return 1
      fi
      break
    fi
    if ! sleep 0.25; then
      warn "could not wait for ChromeDriver cache lock: $lock_dir"
      return 1
    fi
  done
  if ((lock_acquired == 0)); then
    warn "timed out waiting for ChromeDriver cache lock: $lock_dir"
    return 1
  fi

  local driver_path="$driver_cache_dir/$driver_filename"
  if [[ -L "$driver_path" ]]; then
    warn "refusing to replace symbolic-link ChromeDriver cache entry: $driver_path"
    return 1
  fi
  if [[ -e "$driver_path" ]] && ! implicit_driver_path_is_safe "$driver_path"; then
    warn "refusing to use an unsafe ChromeDriver cache entry: $driver_path"
    return 1
  fi
  if [[ -x "$driver_path" ]]; then
    local cached_version
    cached_version="$(driver_version_for "$driver_path")"
    if [[ "$cached_version" == "$selected_version" ]]; then
      if ! verify_driver_sha256 "$driver_path" "managed-cache"; then
        return 1
      fi
      printf '%s\n' "$driver_path"
      return 0
    fi
    warn "ignoring cached ChromeDriver with version ${cached_version:-unknown}: $driver_path"
  fi

  local archive_file="$work_dir/driver.zip"
  local archive_effective_url
  if ! archive_effective_url="$(curl -q --fail --silent --show-error --location \
      --proto '=https' --proto-redir '=https' --max-time 120 \
      --max-filesize "$archive_max_bytes" --output "$archive_file" \
      --write-out '%{url_effective}' "$driver_url")"; then
    warn "could not download ChromeDriver $selected_version"
    return 1
  fi
  if [[ "$archive_effective_url" != "$expected_driver_url" && "$archive_effective_url" != "$expected_driver_url"\?* ]]; then
    warn "ChromeDriver archive redirected to an unexpected URL"
    return 1
  fi
  printf 'ChromeDriver source (%s): %s\n' "$selected_version" "$expected_driver_url" >&2
  local archive_size
  if ! archive_size="$(wc -c < "$archive_file")"; then
    warn "could not determine downloaded ChromeDriver archive size"
    return 1
  fi
  archive_size="${archive_size//[[:space:]]/}"
  if [[ ! "$archive_size" =~ ^[0-9]+$ ]] || ((archive_size > archive_max_bytes)); then
    warn "downloaded ChromeDriver archive exceeds the size limit"
    return 1
  fi
  local archive_sha256
  if ! archive_sha256="$(sha256_file "$archive_file" 2>/dev/null)" || [[ ! "$archive_sha256" =~ ^[0-9a-fA-F]{64}$ ]]; then
    if [[ -n "$chromedriver_sha256_pin" ]]; then
      warn "could not calculate ChromeDriver archive SHA-256"
      return 1
    fi
    warn "could not calculate ChromeDriver archive SHA-256; continuing without an archive digest"
  else
    printf 'ChromeDriver archive SHA-256 (%s): %s\n' "$selected_version" "$archive_sha256" >&2
  fi

  local zip_entries_file="$work_dir/entries.txt"
  if ! unzip -Z1 "$archive_file" > "$zip_entries_file"; then
    warn "downloaded ChromeDriver archive has an unreadable directory"
    return 1
  fi
  local entry
  local entry_count=0
  while IFS= read -r entry || [[ -n "$entry" ]]; do
    entry_count=$((entry_count + 1))
    if ! zip_entry_is_safe "$entry"; then
      warn "downloaded ChromeDriver archive contains an unsafe path"
      return 1
    fi
  done < "$zip_entries_file"
  if ((entry_count == 0)); then
    warn "downloaded ChromeDriver archive is empty"
    return 1
  fi

  local zip_verbose_file="$work_dir/entries.verbose"
  if ! unzip -Z -v "$archive_file" > "$zip_verbose_file"; then
    warn "downloaded ChromeDriver archive metadata is unreadable"
    return 1
  fi
  if grep -Eiq 'Unix file attributes \(12[0-7]{4} octal\)' "$zip_verbose_file"; then
    warn "downloaded ChromeDriver archive contains a symbolic link"
    return 1
  fi
  if grep -Eiq 'file security status: encrypted' "$zip_verbose_file"; then
    warn "encrypted ChromeDriver archives are not accepted"
    return 1
  fi
  local unpacked_bytes
  if ! unpacked_bytes="$(awk '/^[[:space:]]*uncompressed size:/ { if ($3 !~ /^[0-9]+$/) exit 2; total += $3; count += 1 } END { if (count == 0) exit 2; print total + 0 }' "$zip_verbose_file")"; then
    warn "could not determine ChromeDriver archive uncompressed size"
    return 1
  fi
  unpacked_bytes="${unpacked_bytes//[[:space:]]/}"
  if [[ ! "$unpacked_bytes" =~ ^[0-9]+$ ]] || ((unpacked_bytes > unpacked_max_bytes)); then
    warn "ChromeDriver archive uncompressed size exceeds the limit"
    return 1
  fi

  local unpacked_root="$work_dir/unpacked"
  if ! (umask 077; mkdir -m 700 "$unpacked_root"); then
    warn "could not create ChromeDriver extraction directory"
    return 1
  fi
  if ! unzip -qq "$archive_file" -d "$unpacked_root"; then
    warn "downloaded ChromeDriver archive is not a valid zip"
    return 1
  fi
  local suspicious_path
  if ! suspicious_path="$(find "$unpacked_root" \( -type l -o -type b -o -type c -o -type p -o -type s \) -print -quit)"; then
    warn "could not inspect extracted ChromeDriver file types"
    return 1
  fi
  if [[ -n "$suspicious_path" ]]; then
    warn "downloaded ChromeDriver archive extracted a symbolic link or special file"
    return 1
  fi

  local candidates_file="$work_dir/driver-candidates.txt"
  if ! find "$unpacked_root" -type f -name "$driver_filename" -print0 > "$candidates_file"; then
    warn "could not inspect the extracted ChromeDriver"
    return 1
  fi
  local unpacked_driver=''
  local unpacked_count=0
  while IFS= read -r -d '' entry; do
    unpacked_count=$((unpacked_count + 1))
    unpacked_driver="$entry"
  done < "$candidates_file"
  if ((unpacked_count != 1)); then
    warn "ChromeDriver archive must contain exactly one $driver_filename executable"
    return 1
  fi
  if ! chmod 700 "$unpacked_driver"; then
    warn "could not make extracted ChromeDriver executable"
    return 1
  fi
  local downloaded_version
  downloaded_version="$(driver_version_for "$unpacked_driver")"
  if [[ "$downloaded_version" != "$selected_version" ]]; then
    warn "downloaded ChromeDriver ${downloaded_version:-unknown} does not match selected version $selected_version"
    return 1
  fi
  if ! verify_driver_sha256 "$unpacked_driver" "downloaded"; then
    return 1
  fi

  install_path="$driver_cache_dir/.chromedriver.install.$$.$RANDOM"
  if [[ -e "$install_path" || -L "$install_path" ]]; then
    warn "temporary ChromeDriver install path already exists"
    return 1
  fi
  if ! cp "$unpacked_driver" "$install_path"; then
    warn "could not stage ChromeDriver in the managed cache"
    return 1
  fi
  if ! chmod 700 "$install_path"; then
    warn "could not secure staged ChromeDriver"
    return 1
  fi
  if [[ "$(driver_version_for "$install_path")" != "$selected_version" ]]; then
    warn "staged ChromeDriver failed its version check"
    return 1
  fi
  if ! mv -f "$install_path" "$driver_path"; then
    warn "could not atomically install ChromeDriver: $driver_path"
    return 1
  fi
  install_path=''
  if [[ -L "$driver_path" || ! -x "$driver_path" ]]; then
    warn "installed ChromeDriver is not a regular executable"
    return 1
  fi
  if [[ "$(driver_version_for "$driver_path")" != "$selected_version" ]]; then
    warn "installed ChromeDriver failed its final version check"
    return 1
  fi
  if ! verify_driver_sha256 "$driver_path" "managed-cache"; then
    return 1
  fi
  if ((lock_acquired == 1)); then
    if ! rm -f "$lock_dir/pid" || ! rmdir "$lock_dir" 2>/dev/null; then
      warn "could not release ChromeDriver cache lock: $lock_dir"
      return 1
    fi
    lock_acquired=0
  fi
  if ! rm -rf "$work_dir"; then
    warn "could not clean temporary ChromeDriver workspace: $work_dir"
  fi
  cleanup_work=0
  work_dir=''
  trap - RETURN
  printf '%s\n' "$driver_path"
}

selected_driver=""
selected_driver_version=""
driver_needs_download=0
if [[ "$browser" == chrome ]]; then
  # An explicit path is authoritative: fail early rather than allowing a
  # mismatched driver to produce a cryptic session-not-created error.
  if [[ -n "$chromedriver_path" ]]; then
    chromedriver_path="$(resolve_driver_arg "$chromedriver_path")"
    [[ -f "$chromedriver_path" ]] || die "ChromeDriver does not exist: $chromedriver_path"
    [[ -x "$chromedriver_path" ]] || die "ChromeDriver is not executable: $chromedriver_path (try chmod +x)"
    explicit_driver_version="$(driver_version_for "$chromedriver_path")"
    [[ -n "$explicit_driver_version" ]] || die "could not read ChromeDriver version: $chromedriver_path"
    chrome_version_is_valid "$explicit_driver_version" \
      || die "could not parse a safe ChromeDriver version: $chromedriver_path"
    if [[ -n "$browser_major" && "${explicit_driver_version%%.*}" != "$browser_major" ]]; then
      die "ChromeDriver $explicit_driver_version does not match Chrome major $browser_major ($browser_version): $chromedriver_path"
    fi
    if [[ -n "$chromedriver_version_pin" && "$explicit_driver_version" != "$chromedriver_version_pin" ]]; then
      die "ChromeDriver $explicit_driver_version does not match pinned version $chromedriver_version_pin: $chromedriver_path"
    fi
    verify_driver_sha256 "$chromedriver_path" "explicit"
    # An explicit path is an override, even when another exact-match driver
    # happens to be present in a cache searched below.
    selected_driver="$chromedriver_path"
    selected_driver_version="$explicit_driver_version"
    add_candidate "$chromedriver_path"
  else
    path_driver="$(command -v chromedriver 2>/dev/null || true)"
    add_candidate "$path_driver" 0
  fi

  for search_index in "${!driver_search_dirs[@]}"; do
    search_dir="${driver_search_dirs[search_index]}"
    search_driver_dir "$(resolve_from_root "$search_dir")" "${driver_search_dir_explicit[search_index]:-1}"
  done

  cache_root="${XDG_CACHE_HOME:-${HOME:+$HOME/.cache}}"
  if [[ -n "$cache_root" && "$cache_root" != /* ]]; then
    die "XDG_CACHE_HOME/HOME cache path must be absolute: $cache_root"
  fi
  if [[ -n "$cache_root" ]]; then
    search_driver_dir "$cache_root/.wasm-pack" 0
  fi
  search_driver_dir "$project_root/.cache" 0
  search_driver_dir "$project_root/node_modules/.cache" 0

  mismatched_drivers=()
  if [[ -z "$chromedriver_path" ]]; then
    best_rank=0
    best_driver=''
    best_driver_version=''
    for candidate_index in "${!driver_candidates[@]}"; do
      candidate="${driver_candidates[candidate_index]}"
      [[ -x "$candidate" ]] || continue
      if [[ "${driver_candidate_explicit[candidate_index]:-0}" != 1 ]] \
          && ! implicit_driver_path_is_safe "$candidate"; then
        warn "ignoring unsafe implicit ChromeDriver path: $candidate"
        continue
      fi
      candidate_version="$(driver_version_for "$candidate")"
      if ! chrome_version_is_valid "$candidate_version"; then
        warn "cannot read a safe ChromeDriver version: $candidate"
        continue
      fi
      candidate_major="${candidate_version%%.*}"
      if [[ "$candidate_major" != "$browser_major" ]]; then
        mismatched_drivers+=("$candidate ($candidate_version)")
        continue
      fi
      if [[ -n "$chromedriver_version_pin" && "$candidate_version" != "$chromedriver_version_pin" ]]; then
        continue
      fi
      candidate_rank=1
      if [[ "$candidate_version" == "$browser_version" ]]; then
        candidate_rank=3
      elif [[ "$(chrome_build_prefix "$candidate_version")" == "$browser_build" ]]; then
        candidate_rank=2
      fi
      if ((candidate_rank > best_rank)) \
          || { ((candidate_rank == best_rank)) && [[ -z "$best_driver" ]]; }; then
        best_rank="$candidate_rank"
        best_driver="$candidate"
        best_driver_version="$candidate_version"
      elif ((candidate_rank == best_rank)) \
          && chrome_version_is_newer "$candidate_version" "$best_driver_version"; then
        best_driver="$candidate"
        best_driver_version="$candidate_version"
      elif ((candidate_rank == best_rank)) \
          && [[ "$candidate_version" == "$best_driver_version" && "$candidate" < "$best_driver" ]]; then
        best_driver="$candidate"
      fi
    done
    if [[ -n "$best_driver" ]]; then
      selected_driver="$best_driver"
      selected_driver_version="$best_driver_version"
    fi
  fi

  if [[ -n "$selected_driver" ]]; then
    if [[ -n "$chromedriver_version_pin" && "$selected_driver_version" != "$chromedriver_version_pin" ]]; then
      die "selected ChromeDriver version does not satisfy the requested pin"
    fi
    if [[ "$chromedriver_path" == "" ]]; then
      verify_driver_sha256 "$selected_driver" "local"
    fi
    echo "Using ChromeDriver $selected_driver_version: $selected_driver"
  else
    if ((${#mismatched_drivers[@]} > 0)); then
      warn "ignored incompatible local drivers: ${mismatched_drivers[*]}"
    fi
    if [[ "$no_driver_download" == 1 || "$no_driver_download" == true || "$mode" == no-install ]]; then
      die "no ChromeDriver matching Chrome major ${browser_major:-unknown}; install one or set CHROMEDRIVER (downloads disabled)"
    fi
    if ((check_only)); then
      echo "Tool and browser checks passed; no local ChromeDriver matches Chrome $browser_version. A normal run would download a verified Chrome for Testing driver."
      exit 0
    fi
    if downloaded_driver="$(download_matching_chromedriver_hardened "$cache_root" "$browser_version" "$browser_major")"; then
      selected_driver="$downloaded_driver"
      selected_driver_version="$(driver_version_for "$selected_driver")"
      echo "Using verified ChromeDriver $selected_driver_version: $selected_driver"
    else
      driver_needs_download=1
      die "no ChromeDriver matches Chrome $browser_version; automatic Chrome for Testing download failed (install one or set CHROMEDRIVER)"
    fi
  fi
else
  if [[ -n "$geckodriver_path" ]]; then
    geckodriver_path="$(resolve_driver_arg "$geckodriver_path")"
    [[ -f "$geckodriver_path" ]] || die "geckodriver does not exist: $geckodriver_path"
    [[ -x "$geckodriver_path" ]] || die "geckodriver is not executable: $geckodriver_path (try chmod +x)"
  else
    geckodriver_path="$(command -v geckodriver 2>/dev/null || true)"
  fi
  if [[ -n "$geckodriver_path" ]]; then
    echo "Using geckodriver: $geckodriver_path"
  elif [[ "$no_driver_download" == 1 || "$no_driver_download" == true || "$mode" == no-install ]]; then
    die "geckodriver not found (downloads disabled); set GECKODRIVER or install it on PATH"
  else
    driver_needs_download=1
    warn "no local geckodriver found; wasm-pack will download one"
  fi
fi

if ((check_only)); then
  if ((driver_needs_download)); then
    echo "Tool and browser checks passed; wasm-pack driver download is permitted."
  else
    echo "Tool and browser-driver checks passed."
  fi
  exit 0
fi

webdriver_capabilities_path=''
webdriver_capabilities_owned=0
trap '
  if [[ "${webdriver_capabilities_owned:-0}" == 1 && -n "${webdriver_capabilities_path:-}" ]]; then
    if ! rm -f "$webdriver_capabilities_path"; then
      warn "could not clean temporary WebDriver capability file: $webdriver_capabilities_path"
    fi
  fi
' EXIT
if [[ -n "${WASM_BINDGEN_TEST_WEBDRIVER_JSON:-}" ]]; then
  [[ -f "$WASM_BINDGEN_TEST_WEBDRIVER_JSON" ]] \
    || die "WASM_BINDGEN_TEST_WEBDRIVER_JSON does not exist: $WASM_BINDGEN_TEST_WEBDRIVER_JSON"
else
  webdriver_capabilities_path="$(create_webdriver_capabilities "$browser" "$browser_bin")"
  webdriver_capabilities_owned=1
  export WASM_BINDGEN_TEST_WEBDRIVER_JSON="$webdriver_capabilities_path"
fi

wasm_args=(test "--$browser" "--mode" "$mode")
((headless)) && wasm_args+=(--headless)
((release)) && wasm_args+=(--release)

if [[ "$browser" == chrome && -n "$selected_driver" ]]; then
  wasm_args+=(--chromedriver "$selected_driver")
elif [[ "$browser" == firefox && -n "$geckodriver_path" ]]; then
  wasm_args+=(--geckodriver "$geckodriver_path")
fi

wasm_args+=("$crate_path")
if ((${#extra_args[@]} > 0)); then
  wasm_args+=("${extra_args[@]}")
fi

echo "Running: wasm-pack ${wasm_args[*]}"
wasm-pack "${wasm_args[@]}"
