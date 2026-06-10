-- supabase/tests/rls_policies.test.sql
-- task-5 Step 3 (draft 08 §Phase 3 / Step 3.9-3.10): pgTAP RLS policy test scaffold (RED)。
--
-- これは RED scaffold である (期待される RLS 構成を文書化する目的)。
-- 実行には Step 3 migration (002-005) が apply 済であること + local Supabase stack (supabase start)
-- + pgTAP extension が必要。Supabase env 整備後 (user manual) に `supabase test db` で実行する。
-- 本 Step では実行しない (NO Supabase env、db push / pgTAP 実行は deferred)。
--
-- 検証する構成 (draft 08 §3.9 「RLS Policy 全体表 (25 policy)」を SSoT):
--   users           4  (select_own / select_admin / update_admin / insert_system)
--   allowed_users   4  (select_admin / insert_admin / update_admin / delete_admin)
--   audit_log       2  (select_admin / insert_system)
--   bots            5  (select_owner / insert_owner / update_owner / delete_owner / select_admin)
--   recordings      3  (select_owner / insert_system / select_admin)
--   transcripts     3  (select_owner / insert_system / select_admin)
--   calendar_events 2  (all_owner / select_admin)
--   webhook_events  2  (insert_system / select_admin)
--   ─────────────────────────────────────────
--   合計           25 policy
--
-- 本 scaffold が assert する内容 (構造検証、46 assertion):
--   (A) helper function 2 件の存在                                     →  2
--   (B) 8 table 全てで RLS が有効 (relrowsecurity = true)               →  8
--   (C) 各 table の policy 集合が draft §3.9 と完全一致 (policies_are)   →  8
--   (D) 各 table の合計 policy 数が期待値と一致 (25 件の内訳)            →  8
--   (E) 代表 policy の対象 command が一致 (policy_cmd_is)               → 12
--   (F) システム INSERT 拒否 policy が WITH CHECK (false) であること
--       + log_audit_event() の存在 (SECURITY DEFINER 集約経路、M-05)    →  8
--   ─────────────────────────────────────────
--   plan 合計                                                          → 46
--
-- 実 enforcement (5 role × table × operation の SET ROLE / RLS 動作検証、draft 08 §3.10 の 160 ケース) は
-- Step 8 (テスト合格) で Supabase env 上の本格 pgTAP として実装する。本 scaffold は構造検証に限定する。

BEGIN;

SELECT plan(46);

-- ============================================================================
-- (A) helper function の存在 (2 assertion)
-- ============================================================================
SELECT has_function(
  'public', 'is_admin', ARRAY[]::text[],
  'public.is_admin() helper function が存在する'
);
SELECT has_function(
  'public', 'is_member_or_above', ARRAY[]::text[],
  'public.is_member_or_above() helper function が存在する (H-02)'
);

-- ============================================================================
-- (B) 全 8 table で RLS が有効 (8 assertion)
-- ============================================================================
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass),
  true, 'public.users で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.allowed_users'::regclass),
  true, 'public.allowed_users で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_log'::regclass),
  true, 'public.audit_log で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bots'::regclass),
  true, 'public.bots で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.recordings'::regclass),
  true, 'public.recordings で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.transcripts'::regclass),
  true, 'public.transcripts で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.calendar_events'::regclass),
  true, 'public.calendar_events で RLS が有効'
);
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.webhook_events'::regclass),
  true, 'public.webhook_events で RLS が有効'
);

-- ============================================================================
-- (C) 各 table の policy 集合が draft §3.9 と完全一致 (8 assertion)
--     policies_are(schema, table, policies[], description)
-- ============================================================================
SELECT policies_are(
  'public', 'users',
  ARRAY['users_select_own', 'users_select_admin', 'users_update_admin', 'users_insert_system'],
  'users の policy 集合が draft §3.1 と一致 (4 件)'
);
SELECT policies_are(
  'public', 'allowed_users',
  ARRAY['allowed_users_select_admin', 'allowed_users_insert_admin',
        'allowed_users_update_admin', 'allowed_users_delete_admin'],
  'allowed_users の policy 集合が draft §3.2 と一致 (4 件、H-03 update 含む)'
);
SELECT policies_are(
  'public', 'audit_log',
  ARRAY['audit_log_select_admin', 'audit_log_insert_system'],
  'audit_log の policy 集合が draft §3.3 と一致 (2 件)'
);
SELECT policies_are(
  'public', 'bots',
  ARRAY['bots_select_owner', 'bots_insert_owner', 'bots_update_owner',
        'bots_delete_owner', 'bots_select_admin'],
  'bots の policy 集合が draft §3.4 と一致 (5 件)'
);
SELECT policies_are(
  'public', 'recordings',
  ARRAY['recordings_select_owner', 'recordings_insert_system', 'recordings_select_admin'],
  'recordings の policy 集合が draft §3.5 と一致 (3 件)'
);
SELECT policies_are(
  'public', 'transcripts',
  ARRAY['transcripts_select_owner', 'transcripts_insert_system', 'transcripts_select_admin'],
  'transcripts の policy 集合が draft §3.6 と一致 (3 件)'
);
SELECT policies_are(
  'public', 'calendar_events',
  ARRAY['calendar_events_all_owner', 'calendar_events_select_admin'],
  'calendar_events の policy 集合が draft §3.7 と一致 (2 件)'
);
SELECT policies_are(
  'public', 'webhook_events',
  ARRAY['webhook_events_insert_system', 'webhook_events_select_admin'],
  'webhook_events の policy 集合が draft §3.8 と一致 (2 件)'
);

-- ============================================================================
-- (D) 各 table の policy 件数が期待値と一致 (8 assertion、合計 25 の内訳検証)
-- ============================================================================
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'),
  4, 'users の policy 件数 = 4'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'allowed_users'),
  4, 'allowed_users の policy 件数 = 4'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log'),
  2, 'audit_log の policy 件数 = 2'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bots'),
  5, 'bots の policy 件数 = 5'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings'),
  3, 'recordings の policy 件数 = 3'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transcripts'),
  3, 'transcripts の policy 件数 = 3'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events'),
  2, 'calendar_events の policy 件数 = 2'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_events'),
  2, 'webhook_events の policy 件数 = 2'
);

-- ============================================================================
-- (E) 代表 policy の対象 command が draft 設計と一致 (12 assertion)
--     policy_cmd_is(schema, table, policy, command, description)
--     command 値: SELECT / INSERT / UPDATE / DELETE / ALL
-- ============================================================================
SELECT policy_cmd_is('public', 'users', 'users_select_own', 'SELECT',
  'users_select_own は SELECT 用');
SELECT policy_cmd_is('public', 'users', 'users_update_admin', 'UPDATE',
  'users_update_admin は UPDATE 用');
SELECT policy_cmd_is('public', 'users', 'users_insert_system', 'INSERT',
  'users_insert_system は INSERT 用');
SELECT policy_cmd_is('public', 'allowed_users', 'allowed_users_update_admin', 'UPDATE',
  'allowed_users_update_admin は UPDATE 用 (H-03)');
SELECT policy_cmd_is('public', 'allowed_users', 'allowed_users_delete_admin', 'DELETE',
  'allowed_users_delete_admin は DELETE 用');
SELECT policy_cmd_is('public', 'audit_log', 'audit_log_select_admin', 'SELECT',
  'audit_log_select_admin は SELECT 用');
SELECT policy_cmd_is('public', 'audit_log', 'audit_log_insert_system', 'INSERT',
  'audit_log_insert_system は INSERT 用');
SELECT policy_cmd_is('public', 'bots', 'bots_insert_owner', 'INSERT',
  'bots_insert_owner は INSERT 用 (member 以上、H-02)');
SELECT policy_cmd_is('public', 'bots', 'bots_delete_owner', 'DELETE',
  'bots_delete_owner は DELETE 用');
SELECT policy_cmd_is('public', 'recordings', 'recordings_insert_system', 'INSERT',
  'recordings_insert_system は INSERT 用');
SELECT policy_cmd_is('public', 'calendar_events', 'calendar_events_all_owner', 'ALL',
  'calendar_events_all_owner は ALL (CRUD) 用');
SELECT policy_cmd_is('public', 'webhook_events', 'webhook_events_select_admin', 'SELECT',
  'webhook_events_select_admin は SELECT 用');

-- ============================================================================
-- (F) システム INSERT 拒否 policy の WITH CHECK が false (C-02) + log_audit_event 存在 (8 assertion)
--     pg_policies.with_check は CREATE POLICY ... WITH CHECK (false) で 'false' 文字列になる。
--     直接 INSERT を全拒否し、SECURITY DEFINER function (006 / webhook handler) 経由のみ許可する設計。
-- ============================================================================
SELECT is(
  (SELECT with_check FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_insert_system'),
  'false', 'users_insert_system は WITH CHECK (false) で直接 INSERT 全拒否 (C-02)'
);
SELECT is(
  (SELECT with_check FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_log_insert_system'),
  'false', 'audit_log_insert_system は WITH CHECK (false) (C-02、log_audit_event 経由のみ)'
);
SELECT is(
  (SELECT with_check FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'recordings_insert_system'),
  'false', 'recordings_insert_system は WITH CHECK (false) (C-02 / H-05、webhook service_role 経由のみ)'
);
SELECT is(
  (SELECT with_check FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'transcripts' AND policyname = 'transcripts_insert_system'),
  'false', 'transcripts_insert_system は WITH CHECK (false) (C-02 / H-05)'
);
SELECT is(
  (SELECT with_check FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'webhook_events' AND policyname = 'webhook_events_insert_system'),
  'false', 'webhook_events_insert_system は WITH CHECK (false) (C-02 / H-05)'
);
-- log_audit_event() は audit_log への唯一の正規書込経路 (M-05、SECURITY DEFINER で RLS バイパス)。
SELECT has_function(
  'public', 'log_audit_event',
  ARRAY['uuid', 'text', 'text', 'uuid', 'jsonb', 'inet', 'text'],
  'public.log_audit_event(uuid,text,text,uuid,jsonb,inet,text) が存在する (M-05、006 が 5 引数で呼ぶ)'
);
-- 006 が cast する enum 2 種が存在する (内部整合: 002 の enum を 006 / 005 が参照)。
SELECT has_type('public', 'user_role',   'enum user_role が存在する (006 が ::user_role で cast)');
SELECT has_type('public', 'user_status', 'enum user_status が存在する (006 が ::user_status で cast)');

SELECT * FROM finish();

ROLLBACK;
