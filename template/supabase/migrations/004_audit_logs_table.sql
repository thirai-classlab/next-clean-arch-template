-- supabase/migrations/004_audit_logs_table.sql
-- task-5 Step 3 (draft 08 §Phase 3 / Step 3.3): public.audit_log table + log_audit_event() function。
--
-- 目的:
--   全 API / hook / trigger からの監査ログ書込を log_audit_event() (SECURITY DEFINER) 1 箇所に集約する (M-05)。
--   006_auth_hook_domain_check.sql の signup_check_classlab_domain() が
--     PERFORM public.log_audit_event(NEW.id, 'user.signup', 'user', NEW.id, jsonb_build_object(...))
--   と 5 positional 引数で呼ぶため、本 file は 006 より先 (004) に apply される。
--
-- 006 との整合性 (必須):
--   - function 名は public.log_audit_event
--   - 引数順は (p_actor_id uuid, p_action text, p_target_type text, p_target_id uuid, p_payload jsonb, ...)
--   - 5 番目 (p_payload) までは 006 が positional で渡す。6/7 番目 (p_ip_address / p_user_agent) は DEFAULT 付き
--     → 006 の 5 引数呼び出しが解決可能 (signature 一致)
--   - audit_log table が存在し、log_audit_event() が INSERT する
--
-- 依存: 002 (public.users)。audit_log.actor_id が public.users(id) を参照。
-- RLS policy 本体 (audit_log_select_admin / audit_log_insert_system) は 005_rls_policies.sql で集約。
-- 本 file は table + index + ENABLE + log_audit_event() function + GRANT。
-- 本 migration は committable scaffold (実 apply は Supabase env 整備後)。

-- ============================================================================
-- public.audit_log: 全 mutation の監査ログ (draft 08 §3.3)
-- ============================================================================
-- 冪等性 (P5-R2 HIGH): 再 apply / 手動適用で duplicate-object error にならないよう
--   IF NOT EXISTS guard を table / index に付ける (function は CREATE OR REPLACE で元々冪等)。
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,                 -- 例: 'user.signup' / 'bot.create' / 'role.change'
  target_type text NOT NULL,            -- 例: 'user' / 'bot' / 'recording'
  target_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- public.log_audit_event(): audit_log への統一書込 wrapper (M-05 / NEW-N-02)
-- ============================================================================
-- SECURITY DEFINER で関数所有者権限で実行し、audit_log_insert_system policy
-- (WITH CHECK (false)) を RLS バイパスで通過して INSERT する。
-- SET search_path = public: SECURITY DEFINER の search_path injection 防止。
--
-- NEW-N-02 (actor_id impersonation 防止):
--   認証済み呼び出し元 (auth.uid() IS NOT NULL = authenticated JWT を持つ API 呼び出し) は
--   p_actor_id を詐称しても無視され、強制的に自身の auth.uid() が actor として記録される。
--   p_actor_id が尊重されるのは auth.uid() が NULL の system context のみ:
--     - trigger 経由 (006 signup_check_classlab_domain は end-user JWT を持たない signup tx 内で
--       実行されるため auth.uid() IS NULL → p_actor_id = NEW.id が記録される)
--     - service_role / 内部バッチ (end-user セッション無し)
--   INSERT 行は COALESCE(auth.uid(), p_actor_id) で解決する。
--   (旧実装は COALESCE(NULLIF(p_actor_id::text,''), auth.uid()) で「空/NULL 時のみ補完」
--    だったため、authenticated user が他人の uuid を p_actor_id に渡して監査ログを詐称できた。
--    SEC-1 fix で actor 解決を反転し、authenticated 呼び出しでは詐称不能にした。)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, payload, ip_address, user_agent, created_at)
  VALUES
    (
      -- SEC-1: authenticated 呼び出し元は自身の auth.uid() を強制 (詐称不能)。
      -- system/trigger/service_role context (auth.uid() IS NULL) のみ p_actor_id を尊重する。
      COALESCE(auth.uid(), p_actor_id),
      p_action, p_target_type, p_target_id, p_payload, p_ip_address, p_user_agent, now()
    );
END;
$$;

COMMENT ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb, inet, text) IS
  'task-5 Step 3 (M-05): audit_log への統一書込 SECURITY DEFINER wrapper。全 API / hook / trigger から本関数経由で INSERT し書込経路を 1 箇所に集約する。';

-- NEW-N-02: authenticated に EXECUTE GRANT (anon / public は禁止)。
-- API endpoint (anon key createClient = authenticated ロール) からの log_audit_event() 呼び出しを
-- 許可する一方、anon / public からの直接呼び出しは拒否する。
-- 破壊的な cleanup_old_audit_logs() (Step 6) への authenticated GRANT は別途禁止 (C-03)。
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb, inet, text)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb, inet, text)
  TO authenticated, service_role;
