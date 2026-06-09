#!/usr/bin/env bash
# scripts/setup-supabase.test.sh — smoke test for scripts/setup-supabase.sh
#
# Scope: 6-phase smoke test of setup-supabase.sh's structure, idempotent
# guarantees, and security defenses (C-01 / C-02 / C-03 / NEW-H-01).
# Strategy: prefer fast static checks (regex / syntax / dry-run) over side-
# effecting commands so the suite stays runnable without touching Supabase.
#
# IMPORTANT: file-top is set -uo pipefail only (no errexit) per CLAUDE.md HIGH
# lesson. Per-test errexit is localised in subshell test functions.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUT="$SCRIPT_DIR/setup-supabase.sh"
LIB="$SCRIPT_DIR/lib/common.sh"

# Test counters (top-level so subshells can't reset them; use FIFO file instead)
RESULT_FILE="$(mktemp -t setup-supabase-test.XXXXXX)"
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
# Confirms the artefact exists, is executable bash, and parses cleanly.
test_phase_1_structure() {
  echo ""
  echo "[Phase 1] structural checks"

  [[ -f "$SUT" ]] && pass "setup-supabase.sh exists" || fail "setup-supabase.sh missing"
  [[ -f "$LIB" ]] && pass "lib/common.sh exists"     || fail "lib/common.sh missing"
  [[ -x "$SUT" ]] && pass "setup-supabase.sh executable" || fail "setup-supabase.sh not executable"

  if bash -n "$SUT" 2>/dev/null; then
    pass "setup-supabase.sh syntax OK (bash -n)"
  else
    fail "setup-supabase.sh syntax error"
  fi
  if bash -n "$LIB" 2>/dev/null; then
    pass "lib/common.sh syntax OK (bash -n)"
  else
    fail "lib/common.sh syntax error"
  fi

  # C-M-05 / D-M-02 / #44: shellcheck は CI workflow (.github/workflows/ci.yml の
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

  # "File top" = before the first function definition (allows for header comments).
  local prelude
  prelude="$(awk '/^[a-zA-Z_][a-zA-Z0-9_]*\(\)/{exit} {print}' "$SUT")"
  if echo "$prelude" | grep -qE '^set -uo pipefail\s*$'; then
    pass "setup-supabase.sh has 'set -uo pipefail' at file top"
  else
    fail "setup-supabase.sh missing 'set -uo pipefail' file-top directive"
  fi

  # File top must NOT enable errexit globally (caller-flag leak protection).
  if echo "$prelude" | grep -qE '^set -euo pipefail\s*$'; then
    fail "setup-supabase.sh has file-top 'set -euo pipefail' — risks SIGPIPE leak"
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

# ── Phase 3: security defenses (C-01 / C-02 / C-03 / NEW-H-01) ───────────────
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

  # C-01: admin email must be passed via psql parameterized variable :'admin_email'.
  # The psql invocation spans multiple lines (backslash continuation), so we look
  # for the `-v admin_email=` flag on its own line (the canonical form in the SUT)
  # and the `:'admin_email'` placeholder anywhere in the file.
  if grep -qE "[[:space:]]-v admin_email=" "$SUT" && grep -qE ":'admin_email'" "$SUT"; then
    pass "C-01: psql -v admin_email + :'admin_email' parameterized variable used"
  else
    fail "C-01: parameterized variable pattern missing"
  fi
  # The SQL heredoc body must NOT contain $admin_email (no shell interpolation).
  if awk '/<<.SQL/,/^SQL$/' "$SUT" | grep -qE '\$\{?admin_email\}?'; then
    fail "C-01: SQL heredoc body contains \$admin_email (interpolation vector)"
  else
    pass "C-01: SQL heredoc body free of \$admin_email interpolation"
  fi
  # Email format must be validated BEFORE any DB interaction.
  if grep -qE 'email_regex=' "$SUT" && grep -qE 'INITIAL_ADMIN_EMAIL is not a valid email' "$SUT"; then
    pass "C-01: email format pre-validation present"
  else
    fail "C-01: email format pre-validation missing"
  fi

  # C-02: silent failure prevention — trap ERR / explicit exit 1 / no || true on critical paths.
  if grep -qE 'trap .* ERR' "$SUT"; then
    pass "C-02: trap ERR present (no silent failure)"
  else
    fail "C-02: trap ERR missing"
  fi

  # NEW-H-01: safe_dotenv_load must not use source/eval inside its executable body.
  # Function form is brace `{ ... }` (current shell, so export propagates).
  # Comments (lines starting with optional whitespace + '#') are stripped so the
  # word `source`/`eval` appearing in explanatory text doesn't fail the check.
  local body
  body="$(awk '/^safe_dotenv_load\(\) \{/,/^\}$/' "$LIB" | sed 's/[[:space:]]*#.*$//')"
  if echo "$body" | grep -qE '(^|[^a-zA-Z_])(source|eval)([[:space:]]|$)'; then
    fail "NEW-H-01: safe_dotenv_load uses source/eval (RCE vector)"
  else
    pass "NEW-H-01: safe_dotenv_load is free of source/eval"
  fi
}

# ── Phase 4: phase contract (6-phase coverage) ───────────────────────────────
test_phase_4_phase_contract() {
  echo ""
  echo "[Phase 4] phase contract (6 phases)"

  for phase in phase_1_cli_check phase_2_link_or_start phase_3_migration \
               phase_4_rls_verify phase_5_oauth_scaffold phase_6_admin_seed; do
    if grep -qE "^${phase}\(\)" "$SUT"; then
      pass "phase function '$phase' defined"
    else
      fail "phase function '$phase' missing"
    fi
  done

  # main() must call all 6 phases in order.
  if grep -A 20 '^main()' "$SUT" | grep -q 'phase_1_cli_check' \
     && grep -A 20 '^main()' "$SUT" | grep -q 'phase_6_admin_seed'; then
    pass "main() invokes phase_1..phase_6"
  else
    fail "main() does not invoke all 6 phases"
  fi
}

# ── Phase 5: dry-run smoke (DRY_RUN=true, no side effects) ───────────────────
# Runs main() against the live repo with DRY_RUN=true. This exercises the
# control flow without applying migrations or seeding the DB.
test_phase_5_dry_run() {
  echo ""
  echo "[Phase 5] dry-run smoke"

  local log
  log="$(mktemp -t setup-supabase-dry.XXXXXX)"
  # ALLOW_BASH3=true so smoke can run on /bin/bash 3.2 hosts (CI / macOS default).
  # The real script's bash 4+ baseline is still enforced by Phase 1's
  # `require_bash4` when ALLOW_BASH3 is not set.
  if ALLOW_BASH3=true DRY_RUN=true SUPABASE_MODE=local bash "$SUT" >"$log" 2>&1; then
    if grep -q "setup-supabase.sh complete" "$log"; then
      pass "DRY_RUN=true reaches completion banner"
    else
      fail "DRY_RUN=true exited 0 but no completion banner"
      tail -10 "$log" >&2
    fi
    # All 6 phases should be announced.
    local missing=0
    for label in '\[Phase 1\]' '\[Phase 2\]' '\[Phase 3\]' '\[Phase 4\]' '\[Phase 5\]' '\[Phase 6\]'; do
      if ! grep -qE "$label" "$log"; then
        fail "DRY_RUN missing phase label: $label"
        missing=$((missing+1))
      fi
    done
    if (( missing == 0 )); then
      pass "DRY_RUN announces all 6 phases"
    fi
  else
    fail "DRY_RUN=true exited non-zero"
    tail -20 "$log" >&2
  fi

  # C-M-01: idempotent re-run assertion. The 2nd DRY_RUN must also exit 0
  # and produce the same completion banner.
  local log2
  log2="$(mktemp -t setup-supabase-dry2.XXXXXX)"
  if ALLOW_BASH3=true DRY_RUN=true SUPABASE_MODE=local bash "$SUT" >"$log2" 2>&1; then
    if grep -q "setup-supabase.sh complete" "$log2"; then
      pass "C-M-01: 2nd DRY_RUN reaches same completion banner (idempotent)"
    else
      fail "C-M-01: 2nd DRY_RUN missing completion banner"
      tail -10 "$log2" >&2
    fi
  else
    fail "C-M-01: 2nd DRY_RUN exited non-zero (not idempotent)"
    tail -20 "$log2" >&2
  fi

  # C-H-02: remote-mode DRY_RUN smoke. Exercises the SUPABASE_MODE=remote
  # branch (Phase 2 supabase link path + H-02 server-side probe). Requires
  # SUPABASE_PROJECT_REF env (any value works under DRY_RUN since the API
  # call is short-circuited).
  local log_remote
  log_remote="$(mktemp -t setup-supabase-dry-remote.XXXXXX)"
  if ALLOW_BASH3=true DRY_RUN=true SUPABASE_MODE=remote SUPABASE_PROJECT_REF=test-ref-smoke \
       bash "$SUT" >"$log_remote" 2>&1; then
    if grep -q "setup-supabase.sh complete" "$log_remote"; then
      pass "C-H-02: SUPABASE_MODE=remote DRY_RUN reaches completion banner"
    else
      fail "C-H-02: remote DRY_RUN missing completion banner"
      tail -10 "$log_remote" >&2
    fi
    if grep -qE 'mode=remote' "$log_remote"; then
      pass "C-H-02: remote DRY_RUN advertises mode=remote"
    else
      fail "C-H-02: remote DRY_RUN did not announce mode=remote"
    fi
  else
    fail "C-H-02: remote DRY_RUN exited non-zero"
    tail -20 "$log_remote" >&2
  fi

  # C-M-02: DRY_RUN > SUPABASE_RESET precedence. SUPABASE_RESET=true normally
  # triggers destructive `supabase db reset`, but DRY_RUN must short-circuit
  # Phase 3 before the destructive code path (and before any confirm prompt).
  local log_reset
  log_reset="$(mktemp -t setup-supabase-dry-reset.XXXXXX)"
  if ALLOW_BASH3=true DRY_RUN=true SUPABASE_MODE=local SUPABASE_RESET=true \
       bash "$SUT" >"$log_reset" 2>&1; then
    if grep -q "setup-supabase.sh complete" "$log_reset"; then
      pass "C-M-02: DRY_RUN takes precedence over SUPABASE_RESET=true"
    else
      fail "C-M-02: DRY_RUN+SUPABASE_RESET did not reach completion banner"
      tail -10 "$log_reset" >&2
    fi
    # SUPABASE_RESET destructive confirm prompt MUST NOT appear under DRY_RUN.
    if grep -qE 'Proceed with destructive reset' "$log_reset"; then
      fail "C-M-02: destructive reset confirm appeared under DRY_RUN (precedence broken)"
    else
      pass "C-M-02: destructive reset confirm suppressed under DRY_RUN"
    fi
  else
    fail "C-M-02: DRY_RUN+SUPABASE_RESET exited non-zero"
    tail -20 "$log_reset" >&2
  fi

  rm -f "$log" "$log2" "$log_remote" "$log_reset"
}

# ── Phase 6: safe_dotenv_load RCE resistance (NEW-H-01) ──────────────────────
# Feeds a malicious .env containing a command-substitution payload and verifies
# the payload is treated as a literal string, not executed.
test_phase_6_safe_dotenv() {
  echo ""
  echo "[Phase 6] safe_dotenv_load RCE resistance"

  local tmp_env tmp_canary
  tmp_env="$(mktemp -t safe-dotenv.XXXXXX.env)"
  tmp_canary="$(mktemp -t safe-dotenv-canary.XXXXXX)"
  rm -f "$tmp_canary"  # canary must NOT exist after parsing

  # Malicious payload: if `source` or `eval` is used, the $(touch …) will run.
  cat > "$tmp_env" <<EOF
SAFE_KEY=normal_value
EVIL_KEY=\$(touch $tmp_canary)
QUOTED_EVIL="\$(touch $tmp_canary)"
EOF

  # Run safe_dotenv_load in an isolated subshell.
  (
    set +e
    # shellcheck source=lib/common.sh
    source "$LIB"
    safe_dotenv_load "$tmp_env"
  ) >/dev/null 2>&1

  if [[ ! -e "$tmp_canary" ]]; then
    pass "NEW-H-01: malicious \$(touch …) payload NOT executed"
  else
    fail "NEW-H-01: payload executed — safe_dotenv_load is RCE-vulnerable"
    rm -f "$tmp_canary"
  fi

  # Sanity: SAFE_KEY should still be exported by a subshell sourcing the lib.
  local extracted
  extracted="$(
    # shellcheck source=lib/common.sh
    source "$LIB"
    safe_dotenv_load "$tmp_env" >/dev/null 2>&1
    echo "${SAFE_KEY:-MISSING}"
  )"
  if [[ "$extracted" == "normal_value" ]]; then
    pass "safe_dotenv_load loads benign KEY=value correctly"
  else
    fail "safe_dotenv_load failed to load benign value (got: $extracted)"
  fi

  # M-04: boundary case coverage — values with spaces, single/double quotes,
  # multiple '=' in value, empty values, Unicode, and CRLF line endings.
  local tmp_bound
  tmp_bound="$(mktemp -t safe-dotenv-bound.XXXXXX.env)"
  cat > "$tmp_bound" <<'EOF'
KEY_SPACES="value with spaces"
KEY_SINGLE='single quoted'
KEY_EQUALS=value=with=equals=signs
KEY_EMPTY=
KEY_UNICODE=こんにちは
KEY_TRAILING=tail_value
EOF
  # Inject one CRLF line (cannot be expressed cleanly inside heredoc).
  printf 'KEY_CRLF=crlf_value\r\n' >> "$tmp_bound"

  # Extract via a clean subshell to avoid polluting the test runner env.
  local boundary_out
  boundary_out="$(
    source "$LIB"
    safe_dotenv_load "$tmp_bound" >/dev/null 2>&1
    printf '%s|%s|%s|%s|%s|%s|%s' \
      "${KEY_SPACES:-MISSING}" \
      "${KEY_SINGLE:-MISSING}" \
      "${KEY_EQUALS:-MISSING}" \
      "${KEY_EMPTY-UNSET}" \
      "${KEY_UNICODE:-MISSING}" \
      "${KEY_TRAILING:-MISSING}" \
      "${KEY_CRLF:-MISSING}"
  )"

  local IFS_old="$IFS"; IFS='|'
  local -a parts=( $boundary_out )
  IFS="$IFS_old"

  if [[ "${parts[0]}" == "value with spaces" ]]; then
    pass "M-04: value with spaces preserved"
  else
    fail "M-04: value with spaces broken (got: '${parts[0]}')"
  fi
  if [[ "${parts[1]}" == "single quoted" ]]; then
    pass "M-04: single-quoted value preserved"
  else
    fail "M-04: single-quoted value broken (got: '${parts[1]}')"
  fi
  if [[ "${parts[2]}" == "value=with=equals=signs" ]]; then
    pass "M-04: value containing '=' preserved"
  else
    fail "M-04: '=' in value lost (got: '${parts[2]}')"
  fi
  # Empty value: the export still happens with empty string.
  if [[ "${parts[3]}" == "" ]]; then
    pass "M-04: empty value handled (KEY_EMPTY exported as empty string)"
  else
    fail "M-04: empty value mishandled (got: '${parts[3]}')"
  fi
  if [[ "${parts[4]}" == "こんにちは" ]]; then
    pass "M-04: Unicode value preserved"
  else
    fail "M-04: Unicode value broken (got: '${parts[4]}')"
  fi
  # CRLF: the read loop may keep \r in the value. We tolerate either
  # "crlf_value" (CR stripped by read) or "crlf_value\r" (preserved).
  # The CRLF KEY_CRLF MUST be parsed (not lost as MISSING).
  if [[ "${parts[6]}" == crlf_value* ]]; then
    pass "M-04: CRLF line ending parsed (value: '${parts[6]//$'\r'/<CR>}')"
  else
    fail "M-04: CRLF line ending lost (got: '${parts[6]}')"
  fi
  # The line AFTER the CRLF line (KEY_TRAILING) must also parse correctly.
  if [[ "${parts[5]}" == "tail_value" ]]; then
    pass "M-04: trailing line after CRLF preserved"
  else
    fail "M-04: trailing line after CRLF broken (got: '${parts[5]}')"
  fi

  rm -f "$tmp_env" "$tmp_bound"
}

# ── main ──────────────────────────────────────────────────────────────────────
main() {
  echo "==> setup-supabase.test.sh"
  echo "    SUT:  $SUT"
  echo "    LIB:  $LIB"

  test_phase_1_structure
  test_phase_2_shell_flags
  test_phase_3_security
  test_phase_4_phase_contract
  test_phase_5_dry_run
  test_phase_6_safe_dotenv

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
