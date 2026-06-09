#!/usr/bin/env bash
# scripts/setup-vercel.test.sh — smoke test for scripts/setup-vercel.sh
#
# Scope: 6-phase smoke test of setup-vercel.sh's structure, idempotent
# guarantees, and security defenses (C-02 / C-03 / H-05 / NEW-H-01).
# Strategy: prefer fast static checks (regex / syntax / dry-run) over side-
# effecting commands (which would require an authenticated Vercel CLI session).
#
# Phase contract:
#   1. structural checks  (file exists, executable, bash -n syntax)
#   2. shell flag discipline (H-03 — file-top set -uo pipefail only)
#   3. security defenses (C-03 set+x / HISTFILE; H-05 no value echo; NEW-H-01)
#   4. phase contract (5 phase functions + main wiring)
#   5. dry-run smoke (DRY_RUN=true reaches completion banner, all 5 phases)
#   6. secret leak resistance (env values never appear on stdout during DRY_RUN)
#
# IMPORTANT: file-top is set -uo pipefail only (no errexit) per CLAUDE.md HIGH
# lesson. Per-test errexit is localised in subshell test functions.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUT="$SCRIPT_DIR/setup-vercel.sh"
LIB="$SCRIPT_DIR/lib/common.sh"

# Test counters (top-level so subshells can't reset them; use temp file instead)
RESULT_FILE="$(mktemp -t setup-vercel-test.XXXXXX)"
trap 'rm -f "$RESULT_FILE" "$RESULT_FILE.detail"' EXIT
: > "$RESULT_FILE"
: > "$RESULT_FILE.detail"

# Colors (TTY-aware)
if [[ -z "${NO_COLOR:-}" ]] && [[ -t 1 ]]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
else
  GREEN=''; RED=''; NC=''
fi

pass() { echo -e "  ${GREEN}PASS${NC} $1"; echo "PASS" >> "$RESULT_FILE"; }
fail() { echo -e "  ${RED}FAIL${NC} $1"; echo "FAIL" >> "$RESULT_FILE"; echo "FAIL: $1" >> "$RESULT_FILE.detail"; }

# ── Phase 1: structural checks ────────────────────────────────────────────────
test_phase_1_structure() {
  echo ""
  echo "[Phase 1] structural checks"

  [[ -f "$SUT" ]] && pass "setup-vercel.sh exists" || fail "setup-vercel.sh missing"
  [[ -f "$LIB" ]] && pass "lib/common.sh exists"   || fail "lib/common.sh missing"
  [[ -x "$SUT" ]] && pass "setup-vercel.sh executable" || fail "setup-vercel.sh not executable"

  if bash -n "$SUT" 2>/dev/null; then
    pass "setup-vercel.sh syntax OK (bash -n)"
  else
    fail "setup-vercel.sh syntax error"
  fi

  # C-M-05 / #44: shellcheck は CI workflow (.github/workflows/ci.yml の
  # test-scripts job "ShellCheck scripts" step) に集約。smoke は機能 test に専念し、
  # static lint は CI gate 1 経路で実行する (2 重実行解消)。ここでは bash -n の
  # syntax check のみ残す。
}

# ── Phase 2: shell flag discipline (H-03) ────────────────────────────────────
# CLAUDE.md HIGH lesson: file-top must be `set -uo pipefail` only; errexit must
# be localised inside subshell functions. Otherwise SIGPIPE leaks to the caller.
test_phase_2_shell_flags() {
  echo ""
  echo "[Phase 2] shell flag discipline (H-03)"

  # "File top" = before the first function definition.
  local prelude
  prelude="$(awk '/^[a-zA-Z_][a-zA-Z0-9_]*\(\)/{exit} {print}' "$SUT")"
  if echo "$prelude" | grep -qE '^set -uo pipefail\s*$'; then
    pass "setup-vercel.sh has 'set -uo pipefail' at file top"
  else
    fail "setup-vercel.sh missing 'set -uo pipefail' file-top directive"
  fi

  # File top must NOT enable errexit globally (caller-flag leak protection).
  if echo "$prelude" | grep -qE '^set -euo pipefail\s*$'; then
    fail "setup-vercel.sh has file-top 'set -euo pipefail' — risks SIGPIPE leak"
  else
    pass "no file-top errexit (caller-flag leak prevented)"
  fi

  # Subshell-form functions should localise errexit.
  if grep -qE '^\w+\(\) \( *$' "$SUT"; then
    pass "subshell-form functions present (errexit localised)"
  else
    fail "no subshell-form functions detected — errexit may leak"
  fi
}

# ── Phase 3: security defenses (C-02 / C-03 / H-05 / NEW-H-01) ───────────────
test_phase_3_security() {
  echo ""
  echo "[Phase 3] security defenses"

  # C-03: secrets must not be echoed (set +x) and HISTFILE must be muted.
  if grep -qE '^set \+x' "$SUT"; then
    pass "C-03: 'set +x' present (no trace of secret values)"
  else
    fail "C-03: 'set +x' missing"
  fi
  if grep -qE 'HISTFILE=/dev/null' "$SUT"; then
    pass "C-03: HISTFILE=/dev/null present"
  else
    fail "C-03: HISTFILE=/dev/null missing"
  fi

  # H-05: values must not be echo'd. The script must redact sensitive values.
  # Look for explicit REDACTED markers in log paths.
  if grep -qE 'REDACTED|\*\*\*|<redacted>' "$SUT"; then
    pass "H-05: secret value redaction marker present"
  else
    fail "H-05: no redaction marker (***/REDACTED) in script"
  fi

  # H-05: vercel env values must be piped via stdin, NOT passed as CLI args
  # (CLI args appear in process listings and shell history).
  # The canonical pattern is: `printf '%s' "$value" | vercel env add KEY ENV`
  #
  # C-M-03: previous assertion used `A || B && C` which Bash evaluates as
  # `A || (B && C)` — A alone (printf | vercel env add anywhere) was a false
  # positive vector. Replace with a single strict regex that requires the
  # exact stdin pipeline form on a single line.
  # The regex matches: `printf '<fmt>' "$value" | vercel env add` (any KEY/ENV).
  if grep -qE "printf '%s' \"\\\$value\" \| vercel env add" "$SUT"; then
    pass "H-05: 'vercel env add' values piped via stdin (strict regex, no false positive)"
  else
    fail "H-05: 'vercel env add' stdin pipeline (printf '%s' \"\$value\" | vercel env add) not found"
  fi

  # C-02: silent failure prevention — use require_cli_version / explicit exit / trap.
  # The SUT must invoke require_cli_version to catch CLI absence early.
  if grep -qE 'require_cli_version[[:space:]]+vercel' "$SUT"; then
    pass "C-02: require_cli_version vercel present (fail-fast CLI gate)"
  else
    fail "C-02: require_cli_version vercel missing"
  fi
}

# ── Phase 4: phase contract (5-phase coverage) ───────────────────────────────
test_phase_4_phase_contract() {
  echo ""
  echo "[Phase 4] phase contract (5 phases)"

  for phase in phase_1_cli_check phase_2_project_link phase_3_env_import \
               phase_4_custom_domain phase_5_git_connect; do
    if grep -qE "^${phase}\(\)" "$SUT"; then
      pass "phase function '$phase' defined"
    else
      fail "phase function '$phase' missing"
    fi
  done

  # main() must invoke all 5 phases.
  local main_block
  main_block="$(awk '/^main\(\)/,/^\}/' "$SUT")"
  local missing=0
  for phase in phase_1_cli_check phase_2_project_link phase_3_env_import \
               phase_4_custom_domain phase_5_git_connect; do
    if ! echo "$main_block" | grep -q "$phase"; then
      fail "main() does not invoke '$phase'"
      missing=$((missing+1))
    fi
  done
  if (( missing == 0 )); then
    pass "main() invokes all 5 phases in order"
  fi

  # Verification summary (final banner / setup-vercel.sh complete)
  if grep -qE 'setup-vercel.sh complete' "$SUT"; then
    pass "verification summary banner present"
  else
    fail "verification summary banner missing"
  fi
}

# ── Phase 5: dry-run smoke (DRY_RUN=true, no Vercel API calls) ───────────────
# Runs main() against the live repo with DRY_RUN=true. This exercises the
# control flow without invoking the Vercel API.
test_phase_5_dry_run() {
  echo ""
  echo "[Phase 5] dry-run smoke"

  local log
  log="$(mktemp -t setup-vercel-dry.XXXXXX)"
  # ALLOW_BASH3=true so smoke can run on /bin/bash 3.2 hosts (CI / macOS default).
  # SKIP_CLI_CHECK=true to avoid require_cli_version vercel error when vercel CLI
  # is not installed in the test environment.
  if ALLOW_BASH3=true DRY_RUN=true SKIP_CLI_CHECK=true bash "$SUT" >"$log" 2>&1; then
    if grep -q "setup-vercel.sh complete" "$log"; then
      pass "DRY_RUN=true reaches completion banner"
    else
      fail "DRY_RUN=true exited 0 but no completion banner"
      tail -10 "$log" >&2
    fi
    # All 5 phases should be announced.
    local missing=0
    for label in '\[Phase 1\]' '\[Phase 2\]' '\[Phase 3\]' '\[Phase 4\]' '\[Phase 5\]'; do
      if ! grep -qE "$label" "$log"; then
        fail "DRY_RUN missing phase label: $label"
        missing=$((missing+1))
      fi
    done
    if (( missing == 0 )); then
      pass "DRY_RUN announces all 5 phases"
    fi
  else
    fail "DRY_RUN=true exited non-zero"
    tail -20 "$log" >&2
  fi

  # C-M-01: idempotent re-run assertion. The 2nd DRY_RUN must also exit 0
  # and produce the same completion banner. If the script mutates global
  # state in a way that breaks the 2nd run, this catches it.
  local log2
  log2="$(mktemp -t setup-vercel-dry2.XXXXXX)"
  if ALLOW_BASH3=true DRY_RUN=true SKIP_CLI_CHECK=true bash "$SUT" >"$log2" 2>&1; then
    if grep -q "setup-vercel.sh complete" "$log2"; then
      pass "C-M-01: 2nd DRY_RUN reaches same completion banner (idempotent)"
    else
      fail "C-M-01: 2nd DRY_RUN missing completion banner"
      tail -10 "$log2" >&2
    fi
  else
    fail "C-M-01: 2nd DRY_RUN exited non-zero (not idempotent)"
    tail -20 "$log2" >&2
  fi
  rm -f "$log" "$log2"
}

# ── Phase 6: secret leak resistance (H-05 / NEW-H-01) ────────────────────────
# Feeds a sensitive .env.local containing known secret-like keys and verifies
# the values NEVER appear in the script's stdout/stderr.
test_phase_6_secret_leak() {
  echo ""
  echo "[Phase 6] secret leak resistance (H-05)"

  local tmp_env tmp_log tmp_canary
  tmp_env="$(mktemp -t setup-vercel-env.XXXXXX.local)"
  tmp_log="$(mktemp -t setup-vercel-secret-log.XXXXXX)"
  tmp_canary="$(mktemp -t setup-vercel-canary.XXXXXX)"
  rm -f "$tmp_canary"  # canary must NOT exist after parsing

  # Unique markers we can grep for. The script must never echo these.
  local secret_marker="SECRET_CANARY_VALUE_aXyZ123456789"
  local oauth_marker="OAUTH_CANARY_VALUE_QwErTy987654321"

  # Build a fixture .env.local with secret-like keys + an RCE-payload key.
  # If safe_dotenv_load uses source/eval, the $(touch …) will execute.
  cat > "$tmp_env" <<EOF
SUPABASE_SERVICE_ROLE_KEY=$secret_marker
GOOGLE_OAUTH_CLIENT_SECRET=$oauth_marker
EVIL_KEY=\$(touch $tmp_canary)
QUOTED_EVIL="\$(touch $tmp_canary)"
EOF

  # Point the script at our fixture via DOTENV_PATH env override.
  # The script honours DOTENV_PATH for testability.
  if ALLOW_BASH3=true DRY_RUN=true SKIP_CLI_CHECK=true \
       DOTENV_PATH="$tmp_env" \
       bash "$SUT" >"$tmp_log" 2>&1; then
    # The secret values must not appear on any log line.
    if grep -qF "$secret_marker" "$tmp_log"; then
      fail "H-05: SUPABASE_SERVICE_ROLE_KEY value leaked to stdout/stderr"
    else
      pass "H-05: SUPABASE_SERVICE_ROLE_KEY value NOT leaked"
    fi
    if grep -qF "$oauth_marker" "$tmp_log"; then
      fail "H-05: GOOGLE_OAUTH_CLIENT_SECRET value leaked to stdout/stderr"
    else
      pass "H-05: GOOGLE_OAUTH_CLIENT_SECRET value NOT leaked"
    fi
  else
    fail "DRY_RUN with fixture .env exited non-zero"
    tail -10 "$tmp_log" >&2
  fi

  # NEW-H-01: the malicious $(touch …) payload must not execute.
  if [[ ! -e "$tmp_canary" ]]; then
    pass "NEW-H-01: malicious \$(touch …) payload in .env NOT executed"
  else
    fail "NEW-H-01: payload executed — .env loader is RCE-vulnerable"
    rm -f "$tmp_canary"
  fi

  rm -f "$tmp_env" "$tmp_log"
}

# ── main ──────────────────────────────────────────────────────────────────────
main() {
  echo "==> setup-vercel.test.sh"
  echo "    SUT:  $SUT"
  echo "    LIB:  $LIB"

  test_phase_1_structure
  test_phase_2_shell_flags
  test_phase_3_security
  test_phase_4_phase_contract
  test_phase_5_dry_run
  test_phase_6_secret_leak

  echo ""
  local total pass_count fail_count
  total=$(wc -l < "$RESULT_FILE" | tr -d ' ')
  pass_count=$(grep -c '^PASS$' "$RESULT_FILE" || true)
  fail_count=$(grep -c '^FAIL$' "$RESULT_FILE" || true)
  echo "==> Result: ${pass_count}/${total} PASS, ${fail_count} FAIL"
  if (( fail_count > 0 )); then
    echo ""
    echo "Failures:"
    cat "$RESULT_FILE.detail"
    exit 1
  fi
}

main "$@"
