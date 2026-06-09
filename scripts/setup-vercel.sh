#!/usr/bin/env bash
# scripts/setup-vercel.sh
# Vercel project initialization: CLI check + login probe + project link
# + env bulk import (dev/preview/prod) + custom domain (optional) + git connect.
#
# Source SSoT: docs/draft/09_setup-scripts.md §5 Phase 2 (Round 1-6 全 fix 反映)
# - C-02: silent failure 対策 (failed_entries 集計 + exit 1)
# - C-03: secret leak 対策 (set +x + HISTFILE=/dev/null + 値非ログ)
# - H-01: CLI semver check
# - H-02: server-side state probe for idempotent
# - H-03: errexit subshell 局所化
# - H-05: secret 非エコー (values via stdin, never CLI args)
# - M-02: bash 4+ requirement
# - M-03: jq for JSON parse
# - NEW-H-01: safe_dotenv_load (no source/eval)
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
# VERCEL_MODE=link (default) — perform full link + env + domain + git flow
#             env-only      — skip link/domain/git, only bulk env import
#             domain-only   — skip env/git, only custom domain attach
VERCEL_MODE="${VERCEL_MODE:-link}"
# SKIP_ENV_IMPORT=true → skip Phase 3 (used when manually maintaining env)
SKIP_ENV_IMPORT="${SKIP_ENV_IMPORT:-false}"
# CUSTOM_DOMAIN=<domain> → enables Phase 4 (otherwise Phase 4 logs a skip).
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-}"
# DRY_RUN=true → echo intended commands, never call the Vercel API.
DRY_RUN="${DRY_RUN:-false}"
# SKIP_CLI_CHECK=true → skip require_cli_version + vercel whoami (test-only).
# This exists so the smoke test can run on hosts without vercel CLI installed.
SKIP_CLI_CHECK="${SKIP_CLI_CHECK:-false}"
# DOTENV_PATH=<path> → override default .env.local discovery (test-only).
DOTENV_PATH="${DOTENV_PATH:-}"

# Sensitive key names — values for these MUST be redacted in any log output.
# (H-05) Matched as a prefix list, expanded inline by mask_value().
SENSITIVE_KEY_PREFIXES=(
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_JWT_SECRET"
  "SUPABASE_ANON_KEY"     # public but still treated cautiously
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "GOOGLE_OAUTH_CLIENT_SECRET"
  "GOOGLE_OAUTH_CLIENT_ID"
  "RECALL_API_KEY"
  "VERCEL_TOKEN"
  "DATABASE_URL"
  "PG_PASSWORD"
  "STRIPE_SECRET_KEY"
  "OPENAI_API_KEY"
  "ELEVENLABS_API_KEY"
)

# Keys that are platform-managed or local-only — never push to Vercel.
SKIP_KEYS=(
  "NODE_ENV"
  "PATH"
  "HOME"
  "USER"
  "SHELL"
  "PWD"
  "OLDPWD"
  "VERCEL_TOKEN"          # token belongs to local CLI, never pushed
  "SUPABASE_PROJECT_REF"  # local-only setup hint
)

# Returns 0 if $1 is a sensitive key (matches a prefix in SENSITIVE_KEY_PREFIXES).
is_sensitive_key() {
  local k="$1" p
  for p in "${SENSITIVE_KEY_PREFIXES[@]}"; do
    if [[ "$k" == "$p" ]]; then
      return 0
    fi
  done
  return 1
}

# Returns 0 if $1 is in SKIP_KEYS.
is_skip_key() {
  local k="$1" p
  for p in "${SKIP_KEYS[@]}"; do
    if [[ "$k" == "$p" ]]; then
      return 0
    fi
  done
  return 1
}

# Discover the dotenv file to load. Order:
#   1. DOTENV_PATH env (test override / explicit user choice)
#   2. apps/web/.env.local (Next.js convention for monorepo)
#   3. .env.local at repo root
# Echoes the resolved path or returns 1 if none found.
discover_dotenv() (
  set -uo pipefail
  if [[ -n "$DOTENV_PATH" ]] && [[ -f "$DOTENV_PATH" ]]; then
    echo "$DOTENV_PATH"
    return 0
  fi
  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    echo "$REPO_ROOT/.env.local"
    return 0
  fi
  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    echo "$REPO_ROOT/.env.local"
    return 0
  fi
  return 1
)

# ── Phase 1: CLI check + login probe (H-01, M-02) ────────────────────────────
phase_1_cli_check() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 1] CLI check + login probe..."

  require_bash4 || exit $?

  if [[ "$SKIP_CLI_CHECK" == "true" ]]; then
    log_warn "  SKIP_CLI_CHECK=true → skipping require_cli_version vercel + whoami probe"
    return 0
  fi

  # require_cli_version vercel "37.0.0" — H-01 fail-fast CLI gate
  require_cli_version vercel "37.0.0" || exit $?
  # jq is required for Phase 2 (project.json parse, M-03)
  require_cli_version jq "1.6" 2>/dev/null || log_warn "  jq not detected; Phase 2 will fail"

  # Login probe. `vercel whoami` returns the logged-in username or non-zero.
  # C-M-05: who_output captured into a variable was unused (shellcheck SC2034).
  # We only need the exit status. The username (if any) is intentionally not
  # echoed in this context.
  local who_status=0
  vercel whoami >/dev/null 2>&1 || who_status=$?

  if [[ $who_status -ne 0 ]]; then
    log_error "  Not logged in to Vercel (vercel whoami failed)"
    log_error "  USER MANUAL: run 'vercel login' in a terminal — subagent context"
    log_error "  cannot run interactive login due to autonomous-action-guard."
    if [[ "$DRY_RUN" == "true" ]]; then
      log_warn "  DRY_RUN=true → continuing anyway for smoke purposes"
      return 0
    fi
    exit 1
  fi

  # H-05: we never echo the username, token, or any secret to logs.
  log_success "  Logged in to Vercel"
)

# ── Phase 2: project link (H-02 server-side probe, M-03 jq parse) ────────────
phase_2_project_link() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 2] Project link..."

  if [[ "$VERCEL_MODE" == "env-only" ]]; then
    log_warn "  VERCEL_MODE=env-only → skipping project link"
    return 0
  fi

  local project_file="$REPO_ROOT/.vercel/project.json"

  if [[ -f "$project_file" ]]; then
    # M-03: jq parse instead of grep/cut for resilience.
    if ! command -v jq >/dev/null 2>&1; then
      log_error "  jq not installed; cannot parse .vercel/project.json"
      log_error "  Install: brew install jq  OR  apt-get install -y jq"
      exit 1
    fi
    local local_project_id
    local_project_id=$(jq -r '.projectId // empty' "$project_file" 2>/dev/null || true)
    local local_org_id
    local_org_id=$(jq -r '.orgId // empty' "$project_file" 2>/dev/null || true)

    if [[ -z "$local_project_id" ]]; then
      log_warn "  .vercel/project.json exists but projectId is empty (partial state?)"
      log_warn "  Recovery: rm -rf .vercel && bash scripts/setup-vercel.sh"
      exit 1
    fi

    # H-02: server-side probe — confirm the project still exists in Vercel.
    # In DRY_RUN we skip the API call.
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "  DRY_RUN: would verify project '$local_project_id' via 'vercel project ls'"
      log_success "  .vercel/project.json present (DRY_RUN skips server probe)"
      return 0
    fi

    if [[ "$SKIP_CLI_CHECK" == "true" ]]; then
      log_warn "  SKIP_CLI_CHECK=true → skipping server-side project probe"
      log_success "  .vercel/project.json present"
      return 0
    fi

    # CRITICAL-QA-01: substring match (`grep -q` without -w) caused false PASS
    # when a project name contained the projectId substring. Fix order:
    #   (a) `vercel project inspect <id>` — exact-match API (preferred)
    #   (b) `vercel project ls | grep -w` — word-boundary fallback (when
    #       inspect subcommand is unavailable in older CLI versions)
    if vercel project inspect "$local_project_id" >/dev/null 2>&1; then
      log_success "  .vercel/project.json already linked (org=$local_org_id), skipping"
      return 0
    elif vercel project ls 2>/dev/null | grep -qw "$local_project_id"; then
      log_success "  .vercel/project.json already linked (org=$local_org_id, fallback grep -w), skipping"
      return 0
    else
      log_error "  projectId '$local_project_id' not found via 'vercel project inspect' or 'vercel project ls -w'"
      log_error "  Re-link: rm -rf .vercel && bash scripts/setup-vercel.sh"
      exit 1
    fi
  fi

  # No existing link — perform vercel link.
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "  DRY_RUN: would run 'vercel link --yes' (project + org from VERCEL_PROJECT_ID/VERCEL_ORG_ID)"
    log_success "  link skipped under DRY_RUN"
    return 0
  fi

  # Use VERCEL_PROJECT_ID + VERCEL_ORG_ID env when present for non-interactive
  # link; otherwise fall back to interactive prompt.
  local link_args=("--yes")
  if [[ -n "${VERCEL_PROJECT_ID:-}" ]]; then
    link_args+=("--project" "$VERCEL_PROJECT_ID")
  fi
  if [[ -n "${VERCEL_ORG_ID:-}" ]]; then
    link_args+=("--scope" "$VERCEL_ORG_ID")
  fi

  log_info "  Linking Vercel project..."
  if ! vercel link "${link_args[@]}"; then
    log_error "  vercel link failed. USER MANUAL: run 'vercel link' to select project"
    exit 1
  fi
  log_success "  project linked"
)

# ── Phase 3: env bulk import (C-02 silent failure / H-05 stdin values) ───────
# For each KEY=VALUE in .env.local (skipping platform / sensitive control keys),
# push to development / preview / production via stdin (never CLI args).
#
# C-02: collect failures into `failed_entries[]` and exit 1 if any failed.
# H-05: value passed via stdin only — never appears in `ps`, shell history,
#       or CLI args. Log lines mention KEY name + redacted marker.
phase_3_env_import() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 3] env bulk import (dev/preview/prod)..."

  if [[ "$SKIP_ENV_IMPORT" == "true" ]]; then
    log_warn "  SKIP_ENV_IMPORT=true → skipping Phase 3"
    return 0
  fi
  if [[ "$VERCEL_MODE" == "domain-only" ]]; then
    log_warn "  VERCEL_MODE=domain-only → skipping Phase 3"
    return 0
  fi

  # Discover the dotenv source. Failure to discover is fatal — we don't want
  # to silently skip env import. DRY_RUN with no .env still proceeds.
  local dotenv_file
  if dotenv_file=$(discover_dotenv); then
    log_info "  Source: $dotenv_file"
  else
    if [[ "$DRY_RUN" == "true" ]]; then
      log_warn "  No .env.local found (DRY_RUN proceeds without env import)"
      return 0
    fi
    log_error "  .env.local not found at any of:"
    log_error "    - \$DOTENV_PATH"
    log_error "    - $REPO_ROOT/.env.local"
    log_error "    - $REPO_ROOT/.env.local"
    log_error "  Copy .env.example → .env.local and fill in values, then re-run."
    exit 1
  fi

  # Load .env.local into the current shell via safe_dotenv_load (NEW-H-01:
  # no source/eval, command-substitution payloads treated as literals).
  if ! safe_dotenv_load "$dotenv_file"; then
    log_error "  safe_dotenv_load failed for $dotenv_file"
    exit 1
  fi

  local envs=("development" "preview" "production")
  local failed_entries=()
  local imported=0

  # Re-read the file to enumerate keys (we only export via safe_dotenv_load,
  # but we want the original ordering and skip blank/comment lines).
  local line key
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]}" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
      key="${BASH_REMATCH[1]}"
    else
      continue
    fi

    if is_skip_key "$key"; then
      log_info "  [SKIP] $key (platform/local-only)"
      continue
    fi

    # Resolve the value from the exported environment (safe_dotenv_load
    # already populated it). We pass via stdin to vercel env add.
    local value="${!key:-}"
    if [[ -z "$value" ]]; then
      log_warn "  [SKIP] $key (empty value)"
      continue
    fi

    # H-05: log the KEY but redact the VALUE.
    local label
    if is_sensitive_key "$key"; then
      label="<REDACTED ***>"
    else
      label="<value>"
    fi

    local env
    for env in "${envs[@]}"; do
      if [[ "$DRY_RUN" == "true" ]]; then
        log_info "  [DRY] vercel env add $key $env (value=$label)"
        imported=$((imported+1))
        continue
      fi

      if [[ "$SKIP_CLI_CHECK" == "true" ]]; then
        log_info "  [SKIP-CLI] $key -> $env (value=$label)"
        imported=$((imported+1))
        continue
      fi

      # H-05: value via stdin — never as a CLI arg. `--force` makes it
      # non-interactive (upsert behaviour on key collision).
      if printf '%s' "$value" | vercel env add "$key" "$env" --force >/dev/null 2>&1; then
        log_info "  [OK] $key -> $env (value=$label)"
        imported=$((imported+1))
      else
        log_warn "  [FAIL] $key -> $env"
        failed_entries+=("$key:$env")
      fi
    done
  done < "$dotenv_file"

  log_info "  imported (or simulated): $imported attempts"

  # C-02 / A-H-01: collect failures + exit 1 with detail list.
  # Partial-success rollback strategy: we do NOT auto-revert successful
  # pushes (vercel env add is idempotent with --force; subsequent re-runs
  # will be no-ops for already-correct entries). The caller is expected
  # to investigate the failed keys and re-run the script.
  if (( ${#failed_entries[@]} > 0 )); then
    log_error "  ${#failed_entries[@]} env push(es) failed out of $((imported + ${#failed_entries[@]})) total attempts:"
    local entry
    for entry in "${failed_entries[@]}"; do
      log_error "    - $entry"
    done
    log_error "  Recovery checklist:"
    log_error "    1. Verify vercel CLI auth:  vercel whoami"
    log_error "    2. Verify project link:     cat .vercel/project.json"
    log_error "    3. Inspect existing env:    vercel env ls <environment>"
    log_error "    4. Re-run (idempotent):     bash scripts/setup-vercel.sh"
    log_error "  Note: --force upsert means successful entries above are NOT rolled back."
    exit 1
  fi

  log_success "  env bulk import complete"
)

# ── Phase 4: custom domain (optional) ────────────────────────────────────────
phase_4_custom_domain() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 4] custom domain attach..."

  if [[ -z "$CUSTOM_DOMAIN" ]]; then
    log_info "  CUSTOM_DOMAIN not set → skipping"
    return 0
  fi
  if [[ "$VERCEL_MODE" == "env-only" ]]; then
    log_warn "  VERCEL_MODE=env-only → skipping Phase 4"
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "  DRY_RUN: would run 'vercel domains add $CUSTOM_DOMAIN'"
    return 0
  fi
  if [[ "$SKIP_CLI_CHECK" == "true" ]]; then
    log_warn "  SKIP_CLI_CHECK=true → skipping vercel domains add"
    return 0
  fi

  # `vercel domains add` is idempotent on the Vercel side: re-adding an existing
  # domain returns success (or a benign "already exists" message). We catch
  # non-zero only on hard failures (DNS not configured, ownership rejected).
  if vercel domains add "$CUSTOM_DOMAIN"; then
    log_success "  custom domain attached: $CUSTOM_DOMAIN"
  else
    log_warn "  vercel domains add returned non-zero — verify DNS / ownership"
    log_warn "  Manual: https://vercel.com/docs/projects/domains"
  fi
)

# ── Phase 5: git connect (preview branch settings) ───────────────────────────
phase_5_git_connect() (
  set -euo pipefail
  log_info ""
  log_info "[Phase 5] git connect (preview branch settings)..."

  if [[ "$VERCEL_MODE" == "env-only" ]] || [[ "$VERCEL_MODE" == "domain-only" ]]; then
    log_warn "  VERCEL_MODE=$VERCEL_MODE → skipping Phase 5"
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "  DRY_RUN: would run 'vercel git connect' (interactive — user manual)"
    return 0
  fi
  if [[ "$SKIP_CLI_CHECK" == "true" ]]; then
    log_warn "  SKIP_CLI_CHECK=true → skipping vercel git connect"
    return 0
  fi

  # `vercel git connect` is interactive. We surface the command rather than
  # invoking it from a subagent context where stdin is not a TTY.
  log_warn "  Preview branches require GitHub integration."
  log_warn "  USER MANUAL: run 'vercel git connect' in a terminal."
  log_info "  (Already-connected projects: this step is a no-op.)"
)

# ── main ──────────────────────────────────────────────────────────────────────
# Fail-fast wrapper: each phase is a subshell with localised `set -euo pipefail`.
# A non-zero phase return MUST stop the script. Explicit guard so file-top
# `set -e` is not required (caller-flag leak protection per H-03 / CLAUDE.md).
run_phase() {
  local fn="$1"
  if ! "$fn"; then
    log_error "==> $fn failed (exit $?). Aborting."
    exit 1
  fi
}

main() {
  log_info "==> setup-vercel.sh start (mode=$VERCEL_MODE, dry_run=$DRY_RUN, skip_env=$SKIP_ENV_IMPORT)"
  run_phase phase_1_cli_check
  run_phase phase_2_project_link
  run_phase phase_3_env_import
  run_phase phase_4_custom_domain
  run_phase phase_5_git_connect
  log_info ""
  log_success "==> setup-vercel.sh complete"
  log_info ""
  log_info "Next steps:"
  log_info "  - First deploy:        vercel --prod"
  log_info "  - Verify env list:     vercel env ls production"
  log_info "  - Check domain status: vercel domains ls"
}

main "$@"
