#!/usr/bin/env bash
# scripts/lib/common.sh — shared helpers for all setup scripts
# IMPORTANT: file-top is set -uo pipefail only (no errexit) to avoid SIGPIPE leak
# (CLAUDE.md HIGH lesson: errexit leak via `cmd | head -1` → SIGPIPE → exit 141)
# Source: docs/draft/09_setup-scripts.md Step 1.1 (M-01 / C-03 / H-03)
set -uo pipefail

# ── Security defaults (C-03) ─────────────────────────────────────────────────
set +x              # Never echo secret values to logs
umask 077           # Restrict temp file permissions

# ── Colors (respects NO_COLOR + TTY detection, L-01 / L-03) ──────────────────
if [[ -z "${NO_COLOR:-}" ]] && [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; NC=''
fi

log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_info()    { echo -e "$1"; }

# ── Bash version check (M-02) ─────────────────────────────────────────────────
# macOS default /bin/bash is 3.2; we require 4+ for associative arrays / [[ -v ]].
# Override: ALLOW_BASH3=true permits bash 3.2 (used by CI smoke and by users
# who haven't installed bash 4+ yet). When overridden, a warning is logged and
# any bash-4-only feature is guarded individually inside the relevant phase.
require_bash4() (
  # NOTE: subshell form `() ( ... )` localises errexit so caller's flags are not leaked.
  set -euo pipefail
  if (( BASH_VERSINFO[0] < 4 )); then
    if [[ "${ALLOW_BASH3:-false}" == "true" ]]; then
      log_warn "bash 4+ recommended but ALLOW_BASH3=true honoured (found: ${BASH_VERSION})"
      log_warn "  Note: this script's tested baseline is bash 4+; report any failures."
      return 0
    fi
    log_error "bash 4+ required (found: ${BASH_VERSION})"
    echo "  macOS users: brew install bash && hash -r" >&2
    echo "  Then re-run with: /opt/homebrew/bin/bash $0  (or update shebang)" >&2
    echo "  Or temporarily allow bash 3 (testing only): ALLOW_BASH3=true bash $0" >&2
    exit 1
  fi
)

# ── CLI semver check (H-01, NEW-M-02) ────────────────────────────────────────
# Usage: require_cli_version <cmd> <min_version>
# Example: require_cli_version supabase "1.150.0"
#
# NEW-M-02: macOS /usr/bin/sort (BSD) does not support -V (version sort).
# Resolution order:
#   1. gsort  (brew install coreutils)
#   2. GNU sort  (sort --version | grep "GNU coreutils")
#   3. awk fallback for 3-segment semver comparison (no pre-release support)
require_cli_version() (
  # NOTE (NEW-R5-M-01): subshell form — `exit 1` here terminates the subshell
  # and propagates failure to the caller via the subshell's exit status.
  set -euo pipefail
  local cmd="$1" min="$2"
  if ! command -v "$cmd" &>/dev/null; then
    log_error "'$cmd' not found"
    case "$cmd" in
      supabase) echo "  Install: brew install supabase/tap/supabase" >&2 ;;
      vercel)   echo "  Install: npm install -g vercel@latest" >&2 ;;
      jq)       echo "  Install: brew install jq  OR  apt-get install -y jq" >&2 ;;
      psql)     echo "  Install: brew install postgresql  OR  apt-get install -y postgresql-client" >&2 ;;
      *)        echo "  Install '$cmd' via your system package manager" >&2 ;;
    esac
    exit 1
  fi
  local actual
  actual=$("$cmd" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [[ -z "$actual" ]]; then
    log_warn "Could not parse '$cmd' version; skipping semver check"
    return 0
  fi

  # NEW-M-02: detect sort implementation with -V support
  local sort_cmd=""
  if command -v gsort >/dev/null 2>&1; then
    sort_cmd="gsort"
  elif sort --version 2>/dev/null | grep -q "GNU coreutils"; then
    sort_cmd="sort"
  fi

  if [[ -n "$sort_cmd" ]]; then
    # GNU sort / gsort path: -C (check sorted) -V (version sort)
    if ! printf '%s\n%s\n' "$min" "$actual" | "$sort_cmd" -CV; then
      log_error "'$cmd' version $actual is below required minimum $min"
      log_error "  Upgrade docs: https://supabase.com/docs/guides/cli or https://vercel.com/docs/cli"
      exit 1
    fi
  else
    # awk fallback for BSD sort (3-segment semver only; no pre-release support)
    # NEW-R5-L-01 補足: 2-segment "1.2" → ca[3]="" → +0=0, つまり "1.2.0" 扱い。
    if ! awk -v c="$actual" -v m="$min" 'BEGIN {
      split(c, ca, "."); split(m, ma, ".");
      for (i = 1; i <= 3; i++) {
        if (ca[i]+0 > ma[i]+0) exit 0;
        if (ca[i]+0 < ma[i]+0) exit 1;
      }
      exit 0;
    }'; then
      log_error "'$cmd' version $actual is below required minimum $min"
      log_warn "  Hint: brew install coreutils provides gsort for accurate version sorting"
      exit 1
    fi
  fi
  log_success "$cmd $actual (>= $min)"
)

# ── Safe .env loader (C-03, M-04, NEW-H-01) ──────────────────────────────────
# Loads key=value lines from $1 (default .env.local) into the environment.
# - Skips blank lines and comments
# - Handles quoted values (single or double)
# - Manual key=value parse without dangerous expansion primitives (NEW-H-01)
# - NEVER prints values to stdout/stderr (C-03)
#
# Form: brace `{ ... }` (current shell) — required so `export` propagates to
# the caller. Errexit safety is achieved via per-statement `|| return` rather
# than `set -e` (subshell form would isolate exports and defeat the purpose).
#
# Limitation: multi-line PEM / base64 secrets are NOT handled by this helper.
# Those values must be set via CI/CD secrets or via `@next/env loadEnvConfig`
# (TypeScript side) which fully supports multi-line values.
safe_dotenv_load() {
  # D-H-02: `local -` saves the caller's shell option state (set -e/-u/etc.)
  # and automatically restores it when the function returns. This prevents
  # any internal `[[ ... ]] && continue` branch from accidentally setting a
  # non-zero $? that interacts badly with the caller's errexit.
  # Bash 3.2 compat: `local -` is supported since bash 4.4. For bash 3.2 we
  # fall back to explicit save/restore via `set +o` / shopt -po.
  if (( BASH_VERSINFO[0] >= 4 )) && (( BASH_VERSINFO[1] >= 4 )) || (( BASH_VERSINFO[0] >= 5 )); then
    local -
  fi

  local env_file="${1:-.env.local}"
  if [[ ! -f "$env_file" ]]; then
    # Caller decides whether absence is fatal; we return non-zero so callers
    # can `safe_dotenv_load .env.local || true` for optional files.
    return 1
  fi

  # NEW-H-01: manual key=value parse. The dangerous expansion primitives
  # (which would execute `$(...)` payloads in the .env file) are intentionally
  # avoided. The export below uses assignment form, which treats the value as
  # a literal string — no recursive expansion path.
  #
  # D-H-02: every read / regex branch is followed by `|| true` where appropriate
  # so a benign false branch never propagates non-zero $? into the caller's
  # errexit. The final `return 0` makes the success path explicit.
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comment lines (the `|| true` guards against errexit propagating
    # the regex no-match as a function failure).
    if [[ "$line" =~ ^[[:space:]]*# ]]; then continue; fi
    # Skip blank / whitespace-only lines
    if [[ -z "${line//[[:space:]]}" ]]; then continue; fi

    # Match KEY=VALUE where KEY is a valid identifier
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"

      # Strip surrounding double quotes
      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      # Strip surrounding single quotes
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      # IMPORTANT: assignment form — value is treated as a literal string.
      # shellcheck disable=SC2163  # variable name comes from validated regex match
      export "$key=$value"
    fi
  done < "$env_file"
  return 0
}

# ── .env.example sanity check (H-05) ──────────────────────────────────────────
# Warns if any line in .env.example contains a real-looking value (>8 chars after '=').
lint_env_example() (
  set -uo pipefail
  local example_file="${1:-.env.example}"
  [[ ! -f "$example_file" ]] && return 0
  local violations
  violations=$(grep -E '^[^#].*=.{9,}' "$example_file" \
    | grep -Ev '(https?://[a-z0-9.-]+\.supabase\.co|<[^>]+>|your-|xxx|placeholder|true|false|development|staging|production|admin@classlab\.co\.jp|postgres@127\.0\.0\.1)' \
    || true)
  if [[ -n "$violations" ]]; then
    log_warn ".env.example may contain real values (H-05):"
    while IFS= read -r line; do
      echo "  ${line%%=*}=<REDACTED>" >&2
    done <<< "$violations"
  fi
)

# ── Confirm prompt (interactive guard) ────────────────────────────────────────
# ⚠ P5-R5: confirm() AUTO-ACCEPTS when stdin is not a TTY (CI / piped stdin).
# It is therefore NOT a safety gate for destructive operations in CI.
# Destructive call-sites MUST add their own non-interactive guard requiring an
# explicit second env opt-in — see setup-supabase.sh "CI safety guard (P5-R5)"
# (SUPABASE_RESET=true + non-TTY requires SUPABASE_RESET_CONFIRM=true).
confirm() {
  local msg="${1:-Continue?}"
  # In non-interactive mode (CI / piped), auto-accept
  if [[ ! -t 0 ]]; then return 0; fi
  local reply reply_lower
  read -r -p "$msg [y/N] " reply
  # bash 3.2 compat: use `tr` instead of `${var,,}` (bash 4+ only)
  reply_lower="$(printf '%s' "$reply" | tr '[:upper:]' '[:lower:]')"
  [[ "$reply_lower" == "y" ]]
}

# ── Repo root resolver ────────────────────────────────────────────────────────
# Returns the absolute path to the repo root (containing supabase/config.toml).
repo_root() (
  set -euo pipefail
  local d
  d="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  echo "$d"
)
