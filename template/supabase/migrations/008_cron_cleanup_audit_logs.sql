-- supabase/migrations/008_cron_cleanup_audit_logs.sql
-- task-5 Step 6 (draft 08 §Phase 6 / task file Step 6): audit_log 90 日 retention cleanup。
--
-- 目的:
--   91 日以上前の public.audit_log row を削除し、削除件数を monitoring 用 table
--   public.audit_log_cleanup に記録する SQL function を提供する。
--   日次トリガーは Vercel Cron (`0 18 * * *` UTC = 03:00 JST) が
--   /api/cron/audit-cleanup route を叩き、route が service_role client 経由で
--   本 function を rpc 呼び出しする (route-driven、pg_cron 不使用)。
--
-- 設計判断 (pg_cron vs route-driven DELETE):
--   draft 08 §Phase 6 / task file は「pg_cron 経由」と「Vercel Cron」の両方を言及するが、
--   authoritative trigger は Vercel Cron が route を叩く方式である。pg_cron は local
--   Supabase で clean に使えるとは限らず (extension 有効化が環境依存)、本 POC では強制しない。
--   → 本 migration は「再利用可能な cleanup SQL function」のみを提供し、scheduling は
--     Vercel Cron に委ねる (Simplicity First)。pg_cron schedule 行は意図的に含めない。
--
-- C-03 維持 (004_audit_logs_table.sql の comment 参照):
--   cleanup_old_audit_logs() は破壊的 (DELETE) なため authenticated / anon / public には
--   EXECUTE GRANT しない。service_role のみが呼べる (Vercel Cron route の service_role client 経由)。
--   非破壊の log_audit_event() (004) が authenticated GRANT を持つのと対称的な設計判断。
--
-- 依存: 004 (public.audit_log)。本 migration は audit_log.created_at を参照して DELETE する。
-- 本 migration は committable scaffold (実 apply は Supabase env 整備後、Step 8 で live verify)。

-- ============================================================================
-- public.audit_log_cleanup: cleanup 実行の monitoring record (削除件数 + 実行時刻)
-- ============================================================================
-- 各 cron 実行ごとに 1 row 追加し、削除件数 / cutoff / 実行時刻を残す。
-- admin がいつ何件削除されたかを監査できるようにする (audit_log 自体は削除されるため別 table)。
CREATE TABLE public.audit_log_cleanup (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  retention_days integer NOT NULL,
  cutoff timestamptz NOT NULL,
  deleted_count bigint NOT NULL
);

CREATE INDEX idx_audit_log_cleanup_ran_at ON public.audit_log_cleanup(ran_at DESC);

ALTER TABLE public.audit_log_cleanup ENABLE ROW LEVEL SECURITY;

-- admin のみ SELECT 可 (monitoring 閲覧、audit_log_select_admin と同方針)。
CREATE POLICY audit_log_cleanup_select_admin ON public.audit_log_cleanup
  FOR SELECT TO authenticated USING (public.is_admin());

-- 直接 INSERT は全拒否 (C-02 同方針)。実 INSERT は cleanup_old_audit_logs() (SECURITY DEFINER) のみ。
CREATE POLICY audit_log_cleanup_insert_system ON public.audit_log_cleanup
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- ============================================================================
-- public.cleanup_old_audit_logs(): 91 日以上前の audit_log を削除し件数を返す
-- ============================================================================
-- SECURITY DEFINER で function 所有者権限で実行し、audit_log_insert_system /
-- audit_log_cleanup_insert_system policy を RLS バイパスして DELETE / INSERT する。
-- SET search_path = public: SECURITY DEFINER の search_path injection 防止 (004/006/007 と同方針)。
--
-- 引数: p_retention_days (default 91) — 何日より前を削除するか。
-- 返り値: 削除した row 数 (bigint)。route が JSON で返して monitoring に使う。
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  p_retention_days integer DEFAULT 91
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff  timestamptz := now() - make_interval(days => p_retention_days);
  v_deleted bigint;
BEGIN
  -- 91 日以上前の row を削除し、削除件数を取得する。
  WITH deleted AS (
    DELETE FROM public.audit_log
    WHERE created_at < v_cutoff
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  -- monitoring record を残す (admin が削除件数を後から監査できる)。
  INSERT INTO public.audit_log_cleanup (ran_at, retention_days, cutoff, deleted_count)
  VALUES (now(), p_retention_days, v_cutoff, v_deleted);

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_audit_logs(integer) IS
  'task-5 Step 6: p_retention_days (default 91) より前の audit_log を削除し件数を返す。Vercel Cron (03:00 JST 日次) が /api/cron/audit-cleanup route 経由で service_role client から rpc 呼び出しする。破壊的のため service_role のみ EXECUTE 可 (C-03)。';

-- C-03: 破壊的 (DELETE) function のため authenticated / anon / public には GRANT しない。
-- service_role のみが呼べる (Vercel Cron route の service_role client 経由)。
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs(integer)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs(integer)
  TO service_role;
