-- supabase/migrations/005_rls_policies.sql
-- task-5 Step 3 (draft 08 §Phase 3 / Step 3.1-3.9): 8 table の RLS policy 25 件 + helper function 2 件。
--
-- draft 08 §3.9 「RLS Policy 全体表 (25 policy)」が SSoT:
--   users           4: select_own / select_admin / update_admin / insert_system
--   allowed_users   4: select_admin / insert_admin / update_admin (H-03) / delete_admin
--   audit_log       2: select_admin / insert_system
--   bots            5: select_owner / insert_owner / update_owner / delete_owner / select_admin
--   recordings      3: select_owner / insert_system / select_admin
--   transcripts     3: select_owner / insert_system / select_admin
--   calendar_events 2: all_owner / select_admin
--   webhook_events  2: insert_system / select_admin
--   ─────────────────────────────────────────
--   合計           25 policy
--
-- ※ task file は「24 RLS policy」と記載するが、draft 08 §3.9 で H-03 (allowed_users_update_admin) 追加により
--   24 → 25 に更新済。draft が SSoT のため本 file は 25 policy を定義する (discrepancy はレポートで明示)。
--
-- helper function (002/003/004 の table を参照する policy が使うため本 file で定義):
--   - public.is_admin()           : 呼び出し元が active な admin か
--   - public.is_member_or_above() : 呼び出し元が active な admin / member か (viewer は read-only、H-02)
--   両者とも STABLE + SECURITY DEFINER + SET search_path = public (draft 08 §3.1 / §3.4)。
--
-- 依存: 002 (users + enum) / 003 (allowed_users / bots / recordings / transcripts / calendar_events / webhook_events) /
--       004 (audit_log)。全 table の ENABLE ROW LEVEL SECURITY は各 table の migration 側で実施済。
-- 本 migration は committable scaffold (実 apply は Supabase env 整備後、pgTAP 実行も同様に deferred)。

-- ============================================================================
-- helper functions
-- ============================================================================
-- is_admin(): 呼び出し元 (auth.uid()) が role='admin' かつ status='active' か (draft 08 §3.1)。
-- STABLE: 同一 statement 内で結果不変 (planner 最適化)。SECURITY DEFINER で users SELECT を RLS バイパス。
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

-- is_member_or_above(): 呼び出し元が admin / member かつ active か (H-02、draft 08 §3.4)。
-- viewer は read-only のため INSERT 系 policy の WITH CHECK で本 helper を使用する。
CREATE OR REPLACE FUNCTION public.is_member_or_above()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'member')
      AND status = 'active'
  );
$$;

-- ============================================================================
-- public.users (4 policy) — draft 08 §3.1
-- ============================================================================
-- 1: 本人 row のみ SELECT 可
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2: admin は全 user SELECT 可
CREATE POLICY users_select_admin ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 3: admin のみ UPDATE 可 (role / status 変更)
CREATE POLICY users_update_admin ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4: 直接 INSERT は全拒否 (C-02、anon / authenticated 両方明示)。
--    実際の INSERT は signup_check_classlab_domain() (SECURITY DEFINER、006) のみが RLS バイパスで実施。
CREATE POLICY users_insert_system ON public.users
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- ============================================================================
-- public.allowed_users (4 policy) — draft 08 §3.2 (H-03 で update_admin 追加)
-- ============================================================================
CREATE POLICY allowed_users_select_admin ON public.allowed_users
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY allowed_users_insert_admin ON public.allowed_users
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- H-03: UPDATE policy (元設計の DELETE+INSERT は race condition リスクのため UPDATE を直接許可)
CREATE POLICY allowed_users_update_admin ON public.allowed_users
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY allowed_users_delete_admin ON public.allowed_users
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================================
-- public.audit_log (2 policy) — draft 08 §3.3
-- ============================================================================
-- admin のみ SELECT 可
CREATE POLICY audit_log_select_admin ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- 直接 INSERT は全拒否 (C-02)。実際の INSERT は log_audit_event() (SECURITY DEFINER、004) 経由のみ。
CREATE POLICY audit_log_insert_system ON public.audit_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- ============================================================================
-- public.bots (5 policy) — draft 08 §3.4
-- ============================================================================
-- owner は自分の bot を SELECT 可
CREATE POLICY bots_select_owner ON public.bots
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- H-02: INSERT は member 以上のみ (viewer の bot 作成禁止)。owner_id は自分自身。
CREATE POLICY bots_insert_owner ON public.bots
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_member_or_above());

CREATE POLICY bots_update_owner ON public.bots
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY bots_delete_owner ON public.bots
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- admin は全 bot SELECT 可 (override)
CREATE POLICY bots_select_admin ON public.bots
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================================
-- public.recordings (3 policy) — draft 08 §3.5
-- ============================================================================
-- bot owner は SELECT 可
CREATE POLICY recordings_select_owner ON public.recordings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bots WHERE id = recordings.bot_id AND owner_id = auth.uid()
  ));

-- 直接 INSERT は全拒否 (C-02 / H-05)。実 INSERT は webhook handler の service_role client (RLS バイパス)。
CREATE POLICY recordings_insert_system ON public.recordings
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- admin は全 SELECT 可
CREATE POLICY recordings_select_admin ON public.recordings
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================================
-- public.transcripts (3 policy) — draft 08 §3.6
-- ============================================================================
-- recording → bot owner 経由で SELECT 可
CREATE POLICY transcripts_select_owner ON public.transcripts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recordings r JOIN public.bots b ON r.bot_id = b.id
    WHERE r.id = transcripts.recording_id AND b.owner_id = auth.uid()
  ));

-- 直接 INSERT は全拒否 (C-02 / H-05)。実 INSERT は webhook handler の service_role client (RLS バイパス)。
CREATE POLICY transcripts_insert_system ON public.transcripts
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- admin は全 SELECT 可
CREATE POLICY transcripts_select_admin ON public.transcripts
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================================
-- public.calendar_events (2 policy) — draft 08 §3.7
-- ============================================================================
-- owner は自分の calendar_event を全操作可 (CRUD)
CREATE POLICY calendar_events_all_owner ON public.calendar_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- admin は全 SELECT 可
CREATE POLICY calendar_events_select_admin ON public.calendar_events
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================================
-- public.webhook_events (2 policy) — draft 08 §3.8
-- ============================================================================
-- 直接 INSERT は全拒否 (C-02 / H-05)。実 INSERT は webhook handler の service_role client (RLS バイパス)。
CREATE POLICY webhook_events_insert_system ON public.webhook_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- admin は全 SELECT 可
CREATE POLICY webhook_events_select_admin ON public.webhook_events
  FOR SELECT TO authenticated USING (public.is_admin());
