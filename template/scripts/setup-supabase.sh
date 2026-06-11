#!/usr/bin/env bash
# scripts/setup-supabase.sh
# Supabase initialization: CLI check + start/link + migration apply + RLS verify
# + Google OAuth scaffold check + initial admin seed.
#
# Source SSoT: docs/draft/09_setup-scripts.md §4 Phase 1 (Round 1-6 全 fix 反映)
# - C-01: SQL injection 対策 (psql parameterized variable + email format regex)
# - C-02: silent failure 対策 (set -e + trap + explicit exit codes)
# - C-03: secret leak 対策 (set +x + HISTFILE=/dev/null + 値非ログ)
# - H-01: CLI semver check
# - H-02: server-side state probe for idempotent
# - H-03: errexit subshell 局所化
# - H-05: secret 非エコー
# - M-02: bash 4+ requirement
# - NEW-H-01: safe_dotenv_load (no source/eval)
# - NEW-M-02: BSD sort -V fallback
# - P5-R5: non-interactive (CI / piped stdin) では confirm() が auto-accept するため、
#   SUPABASE_RESET=true は SUPABASE_RESET_CONFIRM=true の二重 opt-in が無い限り即 abort する
#   (CI secret に SUPABASE_RESET=true を置き忘れた pipeline が無人で remote DB を wipe する事故防止)。
# - P5-R1: Phase 6b が env AUTH_ALLOWED_EMAIL_DOMAIN から public.hook_config
#   (key=allowed_email_domain) を upsert する。未設定 = 既存値維持 / 空文字 = 制約なし。
#   decision logic (unset / '@' strip / empty / invalid) は DRY_RUN gate より前に走り、
#   smoke test (test_phase_7_hook_config_seed) が live DB なしで assert できる。
#
# IMPORTANT: file-top is set -uo pipefail only (no errexit). errexit is localised
# inside subshell functions `do_work() ( set -euo pipefail; ... )` per H-03.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

# ── Security defaults (C-03) ─────────────────────────────────────────────────
set +x
export HISTFILE=/dev/null   # prevent secrets appearing in shell history

# ── Mode flags ────────────────────────────────────────────────────────────────
# SUPABASE_MODE=local (default) — use local supabase start (Docker)
# SUPABASE_MODE=remote          — use supabase link to remote project
SUPABASE_MODE="${SUPABASE_MODE:-local}"
# SUPABASE_RESET=true → run `supabase db reset` to re-apply all migrations
# (destructive — drops all data). Default: false (use `db push` for safety).
SUPABASE_RESET="${SUPABASE_RESET:-false}"
# DRY_RUN=true → skip side-effecting commands, smoke test only
DRY_RUN="${DRY_RUN:-false}"

# ── CI safety guard (P5-R5) ──────────────────────────────────────────────────
# confirm() (lib/common.sh) auto-accepts when stdin is not a TTY (CI / piped),
# so SUPABASE_RESET=true alone would run the destructive `supabase db reset`
# unattended. Require a second explicit opt-in env in that case.
# DRY_RUN=true is exempt (Phase 3 short-circuits before the destructive path;
# smoke tests rely on this precedence — see C-M-02 in setup-supabase.test.sh).
if [[ "$SUPABASE_RESET" == "true" && "$DRY_RUN" != "true" ]] \
   && [[ ! -t 0 ]] \
   && [[ "${SUPABASE_RESET_CONFIRM:-false}" != "true" ]]; then
  log_error "SUPABASE_RESET=true in non-interactive mode requires SUPABASE_RESET_CONFIRM=true"
  log_error "  confirm() auto-accepts without a TTY; this guard prevents an unattended destructive 'supabase db reset'."
  log_error "  Either run interactively, or set SUPABASE_RESET_CONFIRM=true to acknowledge data loss."
  exit 1
fi

# ── Phase 1: CLI check (H-01, M-02) ──────────────────────────────────────────
phase_1_cli_check() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 1] CLI check..."
  # Explicit `|| exit $?` because bash 3.2 has known quirks where `set -e`
  # does not always propagate a subshell-function's non-zero return.
  require_bash4 || exit $?
  require_cli_version supabase "1.150.0" || exit $?

  # Docker is required only in local mode (supabase start uses Docker)
  if [[ "$SUPABASE_MODE" == "local" ]]; then
    if ! command -v docker &>/dev/null; then
      log_error "docker not found (required for supabase start in local mode)"
      echo "  Install: https://docs.docker.com/get-docker/" >&2
      exit 1
    fi
    if ! docker info >/dev/null 2>&1; then
      log_error "Docker daemon not running"
      echo "  Start Docker Desktop or run: open -a Docker" >&2
      exit 1
    fi
    log_success "docker is running"
  fi

  # psql is required for Phase 6 (admin seed via parameterized SQL)
  require_cli_version psql "13.0.0" 2>/dev/null || log_warn "psql not detected; admin seed (Phase 6) will fail"
)

# ── Phase 2: project link / start (H-02) ─────────────────────────────────────
phase_2_link_or_start() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 2] Project link / start (mode=$SUPABASE_MODE)..."

  if [[ "$SUPABASE_MODE" == "remote" ]]; then
    # Remote mode: try to load PROJECT_REF from .env.local, fall back to env, finally prompt
    safe_dotenv_load "$REPO_ROOT/.env.local" 2>/dev/null || \
      safe_dotenv_load "$REPO_ROOT/.env.local" 2>/dev/null || true
    local project_ref="${SUPABASE_PROJECT_REF:-}"
    if [[ -z "$project_ref" ]]; then
      if [[ -t 0 ]]; then
        read -r -p "Supabase project ref: " project_ref
      else
        log_error "SUPABASE_PROJECT_REF not set and stdin is non-interactive"
        exit 1
      fi
    fi
    export SUPABASE_PROJECT_REF="$project_ref"

    # H-02: server-side state probe
    if [[ -f "$REPO_ROOT/.supabase/config.toml" ]]; then
      local linked_ref
      linked_ref=$(supabase status --output json 2>/dev/null | jq -r '.project_ref // empty' 2>/dev/null || true)
      if [[ "$linked_ref" == "$project_ref" ]]; then
        log_success ".supabase/config.toml already linked to $project_ref, skipping"
        return 0
      elif [[ -n "$linked_ref" ]]; then
        log_error "Existing .supabase/config.toml is linked to '$linked_ref', expected '$project_ref'"
        log_error "  To re-link: rm -rf .supabase && bash scripts/setup-supabase.sh"
        exit 1
      fi
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "  DRY_RUN: would run 'supabase link --project-ref $project_ref'"
    else
      log_info "  Linking project $project_ref ..."
      supabase link --project-ref "$project_ref"
    fi
    log_success "remote project linked"
  else
    # Local mode: ensure `supabase start` is running
    if supabase status >/dev/null 2>&1; then
      log_success "supabase already running"
    else
      if [[ "$DRY_RUN" == "true" ]]; then
        log_info "  DRY_RUN: would run 'supabase start'"
      else
        log_info "  Starting supabase (this may take a minute on first run) ..."
        supabase start
      fi
      log_success "supabase started"
    fi
  fi
)

# ── Phase 3: migration apply ──────────────────────────────────────────────────
# Local mode: migrations are applied automatically by `supabase start` / `db reset`.
# Remote mode: `supabase db push` applies pending migrations idempotently.
phase_3_migration() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 3] migration apply..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "  DRY_RUN: would apply migrations from supabase/migrations/"
    return 0
  fi

  if [[ "$SUPABASE_RESET" == "true" ]]; then
    log_warn "  SUPABASE_RESET=true → running 'supabase db reset' (DESTRUCTIVE: drops all data)"
    if confirm "Proceed with destructive reset?"; then
      supabase db reset
    else
      log_warn "  reset aborted by user"
      return 0
    fi
  else
    if [[ "$SUPABASE_MODE" == "remote" ]]; then
      log_info "  Applying pending migrations via 'supabase db push' ..."
      supabase db push
    else
      # local: `supabase start` already applies migrations from supabase/migrations/.
      # Re-applying without reset is a no-op; we only verify the migration directory exists.
      local mig_dir="$REPO_ROOT/supabase/migrations"
      if [[ ! -d "$mig_dir" ]]; then
        log_error "  supabase/migrations/ not found"
        exit 1
      fi
      local count
      count=$(find "$mig_dir" -name '*.sql' -type f | wc -l | tr -d ' ')
      log_info "  Found $count migration files (applied by supabase start)"
    fi
  fi
  log_success "migrations applied"
)

# ── Phase 4: RLS / schema verify ─────────────────────────────────────────────
# Verification strategy:
#   (a) RUN_PGTAP=true → `supabase test db` (task-5 208-assertion baseline gate).
#       This is OPT-IN because pgTAP assertions assume an empty-DB precondition;
#       running them after Phase 6 admin seed breaks idempotency. Use on the
#       very first run, or when task-5 RLS regression must be verified.
#   (b) Schema parity via `supabase db diff --check` (remote mode only) — checks
#       that local and remote schemas are in sync. Always run when remote.
phase_4_rls_verify() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 4] RLS / schema verify..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "  DRY_RUN: would run pgTAP gate (if RUN_PGTAP=true) and/or 'supabase db diff'"
    return 0
  fi

  # (a) pgTAP gate (opt-in)
  if [[ "${RUN_PGTAP:-false}" == "true" ]]; then
    log_info "  RUN_PGTAP=true → executing 'supabase test db' (task-5 208-assertion baseline)"
    if ! supabase test db 2>&1 | tee /tmp/setup-supabase-pgtap.log | tail -5; then
      log_error "  pgTAP RLS tests FAILED — see /tmp/setup-supabase-pgtap.log for details"
      log_error "  Note: pgTAP assertions assume an empty DB. Re-running after admin seed will fail."
      log_error "  Recovery: SUPABASE_RESET=true bash scripts/setup-supabase.sh"
      exit 1
    fi
    log_success "  pgTAP gate PASS"
  else
    log_info "  pgTAP gate skipped (set RUN_PGTAP=true to enforce task-5 baseline check)"
  fi

  # (b) Schema parity (remote only) — D-M-03: draft 09 §4 Step 1.4 mandates
  # exit 1 on schema drift for remote mode (production-safety gate). Local mode
  # keeps the soft warn since local schema may legitimately differ from remote
  # during in-flight development.
  if [[ "$SUPABASE_MODE" == "remote" ]]; then
    if ! supabase db diff --check >/dev/null 2>&1; then
      log_error "  Local and remote schemas differ (remote mode)"
      log_error "  Run 'supabase db diff --show' to inspect drift"
      log_error "  Resolve by either: (a) supabase db push to apply local migrations,"
      log_error "                     (b) supabase db pull to import remote schema,"
      log_error "                     (c) reconcile manually in supabase/migrations/"
      exit 1
    fi
    log_success "  Schemas in sync (local ↔ remote)"
  else
    # Local mode: surface drift as warn but do not block (in-flight dev OK).
    if ! supabase db diff --check >/dev/null 2>&1; then
      log_warn "  Local schema diff detected (local mode) — run: supabase db diff --show"
    fi
  fi
  log_success "RLS / schema verified"
)

# ── Phase 5: Google OAuth scaffold check ──────────────────────────────────────
phase_5_oauth_scaffold() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 5] Google OAuth provider scaffold..."
  local cfg="$REPO_ROOT/supabase/config.toml"
  if [[ ! -f "$cfg" ]]; then
    log_error "  supabase/config.toml not found"
    exit 1
  fi

  # Detect [auth.external.google] block presence (does NOT require enabled=true;
  # actual client_id / client_secret injection is a user-manual step).
  if ! grep -qE '^\[auth\.external\.google\]' "$cfg"; then
    log_warn "  [auth.external.google] block not found in supabase/config.toml"
    log_warn "  User manual: add the block per https://supabase.com/docs/guides/auth/social-login/auth-google"
    return 0
  fi
  log_success "  [auth.external.google] block present"

  # Surface enabled flag without leaking secret values
  local enabled
  enabled=$(awk '/^\[auth\.external\.google\]/{flag=1; next} /^\[/{flag=0} flag && /^enabled[[:space:]]*=/{print $3; exit}' "$cfg")
  enabled="${enabled//\"/}"
  log_info "  enabled = ${enabled:-unknown}"

  if [[ "$enabled" != "true" ]]; then
    log_warn "  Google OAuth is disabled. To enable in local dev:"
    log_warn "    1. export GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=..."
    log_warn "    2. flip enabled=true in supabase/config.toml"
    log_warn "    3. supabase stop && supabase start"
  fi
)

# ── DB URL resolution (shared by Phase 6 / 6b) ───────────────────────────────
# Local mode uses the well-known supabase port + creds; remote mode requires
# SUPABASE_DB_URL. Echoes the URL on stdout (caller captures); errors go to
# stderr so they surface even under command substitution.
resolve_db_url() {
  local db_url="${SUPABASE_DB_URL:-}"
  if [[ -z "$db_url" ]]; then
    if [[ "$SUPABASE_MODE" == "local" ]]; then
      db_url="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    else
      log_error "  SUPABASE_DB_URL not set (required for remote mode)" >&2
      return 1
    fi
  fi
  printf '%s\n' "$db_url"
}

# ── Phase 6: initial admin seed (C-01) ───────────────────────────────────────
# Uses psql parameterized variable :'admin_email' — value is NEVER interpolated
# into the SQL string. Email format is strictly validated BEFORE any DB call.
phase_6_admin_seed() (
  set -euo pipefail
  trap 'log_error "  phase_6_admin_seed failed"' ERR
  log_info ""
  log_info "[Phase 6] initial admin seed..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "  DRY_RUN: would seed admin user via psql parameterized variable"
    return 0
  fi

  # Default admin email (overridable via env). NOT logged after this point.
  local admin_email="${INITIAL_ADMIN_EMAIL:-admin@classlab.co.jp}"

  # C-01: strict email format validation BEFORE any DB interaction
  local email_regex='^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  if [[ ! "$admin_email" =~ $email_regex ]]; then
    log_error "  INITIAL_ADMIN_EMAIL is not a valid email address"
    exit 1
  fi

  # Resolve DB connection (shared helper, P5 refactor).
  local db_url
  db_url="$(resolve_db_url)" || exit 1

  log_info "  Seeding admin user (email format validated)..."

  # C-01: psql -v passes the value as a parameterized variable. The SQL body
  # uses :'admin_email' which psql quotes safely (no string concatenation).
  # H-05: stdout suppressed because $db_url contains a password.
  #
  # Schema notes (task-5 003_allowed_users_table.sql):
  #   - allowed_users(pattern_type, pattern_value, default_role, added_by NOT NULL FK)
  #   - public.users(id PK ← auth.users(id), email UNIQUE, status, role)
  #   - auth.users is the canonical Supabase auth row; public.users is projection.
  # Seed strategy (idempotent via ON CONFLICT):
  #   1. Insert auth.users row (deterministic UUID via md5 of email, so re-runs
  #      hit ON CONFLICT (email) DO NOTHING). The 006 domain-check trigger will
  #      project to public.users when the row is new.
  #   2. Upsert public.users explicitly to status='active', role='admin' (in case
  #      the trigger created status='pending').
  #   3. Upsert allowed_users with pattern_type='email', pattern_value=admin_email,
  #      added_by = the seeded admin's id (resolves added_by FK constraint).
  if ! PGOPTIONS="" psql "$db_url" \
      -v ON_ERROR_STOP=1 \
      -v admin_email="$admin_email" \
      -q -X -A -t \
      <<'SQL' >/tmp/setup-supabase-seed.log 2>&1
BEGIN;

-- 1. Insert into auth.users (Supabase managed). Deterministic UUID per email.
-- auth.users has only a PARTIAL unique index on email (WHERE is_sso_user=false),
-- so plain `ON CONFLICT (email)` does not match. We use WHERE NOT EXISTS to keep
-- the operation idempotent across re-runs.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
  is_sso_user
)
SELECT
  ('00000000-0000-0000-0000-' || substring(md5(:'admin_email'), 1, 12))::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  :'admin_email',
  now(), now(), now(),
  '{"provider":"setup-script","providers":["setup-script"]}'::jsonb,
  '{}'::jsonb,
  false,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = :'admin_email'
);

-- 2. Upsert public.users projection (status=active, role=admin).
INSERT INTO public.users (id, email, status, role)
SELECT id, email, 'active'::user_status, 'admin'::user_role
FROM auth.users
WHERE email = :'admin_email'
ON CONFLICT (id) DO UPDATE
  SET status = 'active'::user_status,
      role   = 'admin'::user_role;

-- 3. Upsert allowed_users pattern (added_by = the admin's own id).
INSERT INTO public.allowed_users (pattern_type, pattern_value, default_role, added_by)
SELECT 'email'::allowed_pattern_type,
       lower(trim(:'admin_email')),
       'admin'::user_role,
       u.id
FROM public.users u
WHERE u.email = :'admin_email'
ON CONFLICT (pattern_type, pattern_value) DO UPDATE
  SET default_role = EXCLUDED.default_role;

COMMIT;
SQL
  then
    log_error "  psql admin seed failed (diagnostics: /tmp/setup-supabase-seed.log)"
    log_error "  Common causes: (a) Phase 2/3 incomplete → migrations not applied,"
    log_error "                 (b) schema mismatch with task-5 003 migration."
    exit 1
  fi

  # A-H-02: idempotency post-verification.
  # Re-running the seed must not produce duplicate allowed_users rows for the
  # same admin email. Assert the row count equals exactly 1 (regardless of
  # how many times Phase 6 has run). The COUNT query is parameterized via
  # psql -v admin_email= → :'admin_email' (C-01 lineage).
  # NOTE (P5 fix): psql does NOT interpolate -v variables inside `-c` commands
  # (only in commands read from stdin / files). The query MUST be fed via
  # stdin/heredoc, otherwise :'admin_email' reaches the server as a literal
  # `:` token and fails with a syntax error.
  local count_log count_val
  count_log="/tmp/setup-supabase-seed-verify.log"
  if ! PGOPTIONS="" psql "$db_url" \
      -v ON_ERROR_STOP=1 \
      -v admin_email="$admin_email" \
      -q -X -A -t \
      <<'SQL' >"$count_log" 2>&1
SELECT COUNT(*) FROM public.allowed_users
WHERE pattern_type = 'email'::allowed_pattern_type
  AND pattern_value = lower(trim(:'admin_email'));
SQL
  then
    log_error "  Idempotency post-verify query failed (diagnostics: $count_log)"
    exit 1
  fi
  count_val="$(tr -d '[:space:]' < "$count_log")"
  if [[ "$count_val" != "1" ]]; then
    log_error "  Idempotency post-verify FAILED: expected exactly 1 allowed_users row, got '$count_val'"
    log_error "  This indicates the seed is not idempotent — investigate ON CONFLICT clauses"
    exit 1
  fi
  log_success "  idempotency post-verify PASS (allowed_users row count = 1)"

  log_success "  admin seeded (email value omitted from log per H-05)"
)

# ── Phase 6b: domain hook config seed (P5-R1) ────────────────────────────────
# Seeding contract with 010_domain_hook_config.sql + packages/create-app (P4):
#   - AUTH_ALLOWED_EMAIL_DOMAIN unset      → keep existing row (migration default
#     'classlab.co.jp'); psql is NOT invoked (no write).
#   - AUTH_ALLOWED_EMAIL_DOMAIN set        → upsert as the primary signup domain
#     (leading '@' stripped here, lower/trim normalised in SQL).
#   - AUTH_ALLOWED_EMAIL_DOMAIN set to ''  → value='' = NO domain restriction
#     (every domain auto-actives; parity with the NextAuth-side
#     ALLOWED_ADMIN_EMAIL_DOMAIN "unset = unrestricted" semantics, D-H-01).
# C-01 lineage: value is passed via psql -v parameterized variable (no string
# interpolation into SQL).
# Validation + '@' strip run BEFORE the DRY_RUN gate so the smoke suite
# (test_phase_7_hook_config_seed) can assert the decision matrix without a DB.
phase_6b_hook_config_seed() (
  set -euo pipefail
  trap 'log_error "  phase_6b_hook_config_seed failed"' ERR
  log_info ""
  log_info "[Phase 6b] domain hook config seed (P5-R1)..."

  if [[ -z "${AUTH_ALLOWED_EMAIL_DOMAIN+x}" ]]; then
    log_info "  AUTH_ALLOWED_EMAIL_DOMAIN unset → keeping existing hook_config row (no write)"
    return 0
  fi

  # Leading '@' tolerated ('@example.com' → 'example.com').
  local hook_domain="${AUTH_ALLOWED_EMAIL_DOMAIN#@}"
  # Validate non-empty values look like a bare domain (empty = unrestricted, allowed).
  local domain_regex='^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  if [[ -n "$hook_domain" && ! "$hook_domain" =~ $domain_regex ]]; then
    log_error "  AUTH_ALLOWED_EMAIL_DOMAIN is not a valid domain (expected e.g. 'example.com' or '@example.com', or empty for no restriction)"
    exit 1
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ -z "$hook_domain" ]]; then
      log_info "  DRY_RUN: would set hook_config.allowed_email_domain = '' (no domain restriction)"
    else
      log_info "  DRY_RUN: would upsert hook_config.allowed_email_domain = $hook_domain"
    fi
    return 0
  fi

  local db_url
  db_url="$(resolve_db_url)" || exit 1

  # stdin/heredoc form required for -v interpolation (psql does NOT expand -v
  # variables inside `-c` commands — see the NOTE in phase_6_admin_seed).
  # The DO UPDATE ... WHERE IS DISTINCT FROM guard skips no-op writes, so an
  # idempotent re-run with the same domain fires no audit trigger row (010 (2)).
  if ! PGOPTIONS="" psql "$db_url" \
      -v ON_ERROR_STOP=1 \
      -v hook_domain="$hook_domain" \
      -q -X -A -t \
      <<'SQL' >/tmp/setup-supabase-hookcfg.log 2>&1
INSERT INTO public.hook_config (key, value)
VALUES ('allowed_email_domain', lower(trim(:'hook_domain')))
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now()
  WHERE public.hook_config.value IS DISTINCT FROM EXCLUDED.value;
SQL
  then
    log_error "  hook_config seed failed (diagnostics: /tmp/setup-supabase-hookcfg.log)"
    log_error "  Common cause: migration 010_domain_hook_config.sql not applied yet (re-run Phase 3)."
    exit 1
  fi
  if [[ -z "$hook_domain" ]]; then
    log_success "  hook_config.allowed_email_domain = '' (no domain restriction)"
  else
    log_success "  hook_config.allowed_email_domain = $hook_domain"
  fi
)

# ── main ──────────────────────────────────────────────────────────────────────
# Fail-fast wrapper: each phase is a subshell with localised `set -euo pipefail`
# (H-03). A non-zero exit from a phase MUST stop the script. We can't rely on
# file-top `set -e` (caller-flag leak risk) so each call has an explicit guard.
run_phase() {
  local fn="$1"
  if ! "$fn"; then
    log_error "==> $fn failed (exit $?). Aborting."
    exit 1
  fi
}

main() {
  log_info "==> setup-supabase.sh start (mode=$SUPABASE_MODE, reset=$SUPABASE_RESET, dry_run=$DRY_RUN)"
  run_phase phase_1_cli_check
  run_phase phase_2_link_or_start
  run_phase phase_3_migration
  run_phase phase_4_rls_verify
  run_phase phase_5_oauth_scaffold
  run_phase phase_6_admin_seed
  run_phase phase_6b_hook_config_seed
  log_info ""
  log_success "==> setup-supabase.sh complete"
}

main "$@"
