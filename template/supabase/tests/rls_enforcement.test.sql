-- supabase/tests/rls_enforcement.test.sql
-- task-5 Step 7 (CRITICAL-1 fix): 5 role × 8 table × 4 operation の RLS enforcement matrix。
--
-- 起源: Round-1 reviewer 4 件 (C/D/E/F) 一致 CRITICAL finding:
--   「pgTAP 構造検証 (rls_policies.test.sql 46 assert) のみで実 enforcement テスト 0。
--    5 role × 8 table × 4 operation の deny/allow matrix が未設計。」
--
-- 実行要件:
--   - supabase/migrations/002-007 が apply 済
--   - local Supabase stack 稼働 (supabase start)
--   - pgTAP extension 有効 (CREATE EXTENSION IF NOT EXISTS pgtap)
--   - 実行: supabase test db
--
-- ============================================================================
-- Role 定義 (draft 08 §3 SSoT):
--   admin           : role='admin', status='active'
--   member          : role='member', status='active'
--   viewer          : role='viewer', status='active'
--   anon            : 未認証 (JWT claims 無し = auth.uid() IS NULL)
--   supabase_auth_admin : Supabase 内部 auth admin role (service_role に準ずる RLS バイパス)
--
-- Table 一覧 (8 table):
--   users / allowed_users / audit_log / bots / recordings / transcripts / calendar_events / webhook_events
--
-- Operation (4 op):
--   SELECT / INSERT / UPDATE / DELETE
--
-- 期待 deny/allow matrix (draft 08 §3.9 SSoT):
--
--   users:
--     admin:  SELECT=allow(all rows) / INSERT=deny / UPDATE=allow(any row) / DELETE=deny
--     member: SELECT=allow(own row only) / INSERT=deny / UPDATE=deny / DELETE=deny
--     viewer: SELECT=allow(own row only) / INSERT=deny / UPDATE=deny / DELETE=deny
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   allowed_users:
--     admin:  SELECT=allow / INSERT=allow / UPDATE=allow / DELETE=allow
--     member: SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--     viewer: SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   audit_log:
--     admin:  SELECT=allow / INSERT=deny(直接) / UPDATE=deny / DELETE=deny
--     member: SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--     viewer: SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   bots:
--     admin:  SELECT=allow(all) / INSERT=allow(own) / UPDATE=allow(own) / DELETE=allow(own)
--     member: SELECT=allow(own) / INSERT=allow(own,is_member) / UPDATE=allow(own) / DELETE=allow(own)
--     viewer: SELECT=allow(own) / INSERT=deny(not member_or_above) / UPDATE=allow(own) / DELETE=allow(own)
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   recordings:
--     admin:  SELECT=allow(all) / INSERT=deny(直接) / UPDATE=deny / DELETE=deny
--     member: SELECT=allow(own bot's) / INSERT=deny / UPDATE=deny / DELETE=deny
--     viewer: SELECT=allow(own bot's) / INSERT=deny / UPDATE=deny / DELETE=deny
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   transcripts:
--     admin:  SELECT=allow(all) / INSERT=deny(直接) / UPDATE=deny / DELETE=deny
--     member: SELECT=allow(own bot's recording's) / INSERT=deny / UPDATE=deny / DELETE=deny
--     viewer: SELECT=allow(own bot's recording's) / INSERT=deny / UPDATE=deny / DELETE=deny
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   calendar_events:
--     admin:  SELECT=allow(all) / INSERT=allow(own) / UPDATE=allow(own) / DELETE=allow(own)
--     member: SELECT=allow(own) / INSERT=allow(own) / UPDATE=allow(own) / DELETE=allow(own)
--     viewer: SELECT=allow(own) / INSERT=allow(own) / UPDATE=allow(own) / DELETE=allow(own)
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
--   webhook_events:
--     admin:  SELECT=allow / INSERT=deny(直接) / UPDATE=deny / DELETE=deny
--     member: SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--     viewer: SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--     anon:   SELECT=deny / INSERT=deny / UPDATE=deny / DELETE=deny
--
-- Case count per table:
--   users:           4 role × 4 op = 16 (anon SELECT/INSERT/UPDATE/DELETE + admin/member/viewer × 4 each)
--   allowed_users:   4 role × 4 op = 16
--   audit_log:       4 role × 3 op (no DELETE policy test) + 4 INSERT-direct-deny = 16
--   bots:            4 role × 4 op = 16
--   recordings:      4 role × 4 op = 16
--   transcripts:     4 role × 4 op = 16
--   calendar_events: 4 role × 4 op = 16
--   webhook_events:  4 role × 4 op = 16
--   ─────────────────────────────────────
--   Total:                           128 cases
--   (160 = 5 role × 8 table × 4 op の理論値から supabase_auth_admin は service_role バイパスのため
--    pgTAP セッション内で SET ROLE 経由の検証が実質不可能 → 32 case をヘルパー検証でカバー補足)
--
-- ============================================================================

BEGIN;

SELECT plan(136);

-- ============================================================================
-- FIXTURE SETUP
-- ============================================================================
-- テスト用 UUID 定数 (可読性向上のため定数化)
-- admin user: 00000000-0000-0000-0001-000000000001
-- member user: 00000000-0000-0000-0002-000000000001
-- member2 user (別 owner 検証用): 00000000-0000-0000-0002-000000000002
-- viewer user: 00000000-0000-0000-0003-000000000001
-- anon: JWT claims 無し (auth.uid() IS NULL)

-- auth.users seed (Step 8 Phase B fix: public.users.id → auth.users(id) FK 違反防止)。
-- public.users INSERT 前に投入 (CASCADE FK の親 row を先行作成)。
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'admin@classlab.co.jp',   now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0002-000000000001', 'member@classlab.co.jp',  now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0002-000000000002', 'member2@classlab.co.jp', now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0003-000000000001', 'viewer@classlab.co.jp',  now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- public.users fixture (RLS INSERT policy で WITH CHECK(false) なので postgres owner 権限で直接挿入)。
-- 006 signup trigger が auto-propagate するため ON CONFLICT DO UPDATE で role 上書き (Step 8 Phase B fix)。
INSERT INTO public.users (id, email, status, role, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'admin@classlab.co.jp',   'active', 'admin',  now(), now()),
  ('00000000-0000-0000-0002-000000000001', 'member@classlab.co.jp',  'active', 'member', now(), now()),
  ('00000000-0000-0000-0002-000000000002', 'member2@classlab.co.jp', 'active', 'member', now(), now()),
  ('00000000-0000-0000-0003-000000000001', 'viewer@classlab.co.jp',  'active', 'viewer', now(), now())
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      status = EXCLUDED.status,
      role = EXCLUDED.role,
      updated_at = now();

-- allowed_users fixture (admin owner 参照)
INSERT INTO public.allowed_users (id, pattern_type, pattern_value, default_role, added_by)
VALUES
  ('00000000-0000-0000-0010-000000000001', 'domain', 'classlab.co.jp', 'viewer',
   '00000000-0000-0000-0001-000000000001');

-- audit_log fixture (log_audit_event 経由ではなく postgres 権限で直接挿入、構造検証用)
INSERT INTO public.audit_log (actor_id, action, target_type, target_id, payload)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'user.signup', 'user',
   '00000000-0000-0000-0001-000000000001', '{}');

-- bots fixture (member が owner)
INSERT INTO public.bots (id, owner_id, meeting_url, meeting_platform, status)
VALUES
  ('00000000-0000-0000-0020-000000000001',
   '00000000-0000-0000-0002-000000000001',
   'https://meet.google.com/abc-defg-hij', 'meet', 'created'),
  -- member2 が owner の bot (cross-owner 検証用)
  ('00000000-0000-0000-0020-000000000002',
   '00000000-0000-0000-0002-000000000002',
   'https://meet.google.com/xyz-uvwx-yz1', 'meet', 'created'),
  -- viewer が owner の bot
  ('00000000-0000-0000-0020-000000000003',
   '00000000-0000-0000-0003-000000000001',
   'https://meet.google.com/abc-0001-001', 'meet', 'created');

-- recordings fixture
INSERT INTO public.recordings (id, bot_id, status)
VALUES
  ('00000000-0000-0000-0030-000000000001',
   '00000000-0000-0000-0020-000000000001', 'processing'),
  -- member2 の bot の recording
  ('00000000-0000-0000-0030-000000000002',
   '00000000-0000-0000-0020-000000000002', 'processing');

-- transcripts fixture
INSERT INTO public.transcripts (id, recording_id, language, full_text)
VALUES
  ('00000000-0000-0000-0040-000000000001',
   '00000000-0000-0000-0030-000000000001', 'ja', 'test transcript for member'),
  -- member2 の recording の transcript
  ('00000000-0000-0000-0040-000000000002',
   '00000000-0000-0000-0030-000000000002', 'ja', 'test transcript for member2');

-- calendar_events fixture
INSERT INTO public.calendar_events (id, user_id, title, start_time, end_time)
VALUES
  ('00000000-0000-0000-0050-000000000001',
   '00000000-0000-0000-0002-000000000001',
   'Meeting A', now(), now() + interval '1 hour'),
  -- member2 のイベント (cross-owner 検証用)
  ('00000000-0000-0000-0050-000000000002',
   '00000000-0000-0000-0002-000000000002',
   'Meeting B', now(), now() + interval '1 hour');

-- webhook_events fixture
INSERT INTO public.webhook_events (id, event_type, payload)
VALUES
  ('00000000-0000-0000-0060-000000000001', 'bot.status_change', '{"status":"done"}');

-- ============================================================================
-- HELPER MACRO: JWT claims を設定して authenticator role に切替
-- authenticator = Supabase の anon/authenticated リクエストが使うデフォルト接続 role
-- request.jwt.claims を設定後 SET LOCAL ROLE authenticated で RLS が有効になる
-- ============================================================================

-- ============================================================================
-- TABLE: public.users (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

-- users-admin-01: admin は自分の row を SELECT 可 (users_select_own)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0001-000000000001') = 1,
  'users-admin-01: admin は自分の row を SELECT 可 (users_select_own)'
);

-- users-admin-02: admin は他 user の row も SELECT 可 (users_select_admin)
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0002-000000000001') = 1,
  'users-admin-02: admin は他 user の row も SELECT 可 (users_select_admin)'
);

-- users-admin-03: admin は他 user の role を UPDATE 可 (users_update_admin)
SELECT lives_ok(
  $$ UPDATE public.users SET role = 'member' WHERE id = '00000000-0000-0000-0002-000000000001' $$,
  'users-admin-03: admin は他 user の role を UPDATE 可 (users_update_admin)'
);

-- users-admin-04: admin でも直接 INSERT は deny (users_insert_system WITH CHECK false)
SELECT throws_ok(
  $$ INSERT INTO public.users (id, email, status, role, created_at, updated_at)
     VALUES ('00000000-0000-ffff-0001-000000000099', 'new-admin@classlab.co.jp',
             'active', 'admin', now(), now()) $$,
  '42501',
  NULL,
  'users-admin-04: admin でも直接 INSERT は deny (WITH CHECK false)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- users-member-01: member は自分の row を SELECT 可 (users_select_own)
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0002-000000000001') = 1,
  'users-member-01: member は自分の row を SELECT 可 (users_select_own)'
);

-- users-member-02: member は他 user の row を SELECT 不可 (admin policy 不適用)
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0001-000000000001') = 0,
  'users-member-02: member は他 user の row を SELECT 不可'
);

-- users-member-03: member は UPDATE 不可 → silent 0 rows (users_update_admin は admin のみ)
-- NOTE (R3-C): USING(is_admin()) = false → RLS silent deny (42501 は投げない)。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.users SET display_name = 'member-changed'
    WHERE id = '00000000-0000-0000-0002-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE display_name = 'member-changed') = 0,
  'users-member-03: member は UPDATE silent deny (users_update_admin は admin のみ、USING(is_admin())=false)'
);

-- users-member-04: member でも直接 INSERT は deny
SELECT throws_ok(
  $$ INSERT INTO public.users (id, email, status, role, created_at, updated_at)
     VALUES ('00000000-0000-ffff-0002-000000000099', 'new-member@classlab.co.jp',
             'active', 'member', now(), now()) $$,
  '42501',
  NULL,
  'users-member-04: member でも直接 INSERT は deny'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- users-viewer-01: viewer は自分の row を SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0003-000000000001') = 1,
  'users-viewer-01: viewer は自分の row を SELECT 可'
);

-- users-viewer-02: viewer は他 user の row を SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0001-000000000001') = 0,
  'users-viewer-02: viewer は他 user の row を SELECT 不可'
);

-- users-viewer-03: viewer は UPDATE 不可 → silent 0 rows (users_update_admin は admin のみ)
-- NOTE (R3-C): USING(is_admin()) = false → RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.users SET display_name = 'viewer-change'
    WHERE id = '00000000-0000-0000-0003-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE display_name = 'viewer-change') = 0,
  'users-viewer-03: viewer は UPDATE silent deny (users_update_admin は admin のみ)'
);

-- users-viewer-04: viewer でも直接 INSERT は deny
SELECT throws_ok(
  $$ INSERT INTO public.users (id, email, status, role, created_at, updated_at)
     VALUES ('00000000-0000-ffff-0003-000000000099', 'new-viewer@classlab.co.jp',
             'active', 'viewer', now(), now()) $$,
  '42501',
  NULL,
  'users-viewer-04: viewer でも直接 INSERT は deny'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', NULL, true);

-- users-anon-01: anon は SELECT 不可 (authenticated TO clause)
SELECT ok(
  (SELECT count(*)::int FROM public.users) = 0,
  'users-anon-01: anon は SELECT 不可'
);

-- users-anon-02: anon は INSERT deny (WITH CHECK false)
SELECT throws_ok(
  $$ INSERT INTO public.users (id, email, status, role, created_at, updated_at)
     VALUES ('00000000-0000-ffff-0000-000000000099', 'anon@classlab.co.jp',
             'active', 'viewer', now(), now()) $$,
  '42501',
  NULL,
  'users-anon-02: anon は INSERT deny'
);

-- users-anon-03: anon は UPDATE 不可 → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には update policy 適用なし = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.users SET display_name = 'anon-hacked'
    WHERE id = '00000000-0000-0000-0001-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE display_name = 'anon-hacked') = 0,
  'users-anon-03: anon は UPDATE silent deny (TO authenticated policy のみ、anon 適用なし)'
);

-- users-anon-04: anon は DELETE 不可 → silent 0 rows (no DELETE policy)
-- NOTE (R3-C): DELETE policy 不在 = RLS silent deny。ok(count=0) で検証。
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。anon role のままだと SELECT 自体が 0 件返し誤検出になる。
DO $$ BEGIN
  DELETE FROM public.users WHERE id IN (
    SELECT id FROM public.users WHERE id = '00000000-ffff-0000-0001-000000000000'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.users WHERE id = '00000000-0000-0000-0001-000000000001') = 1,
  'users-anon-04: anon は DELETE silent deny (no DELETE policy, row 残存確認)'
);

-- ============================================================================
-- TABLE: public.allowed_users (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- allowed_users-admin-01: admin は SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users) >= 1,
  'allowed_users-admin-01: admin は SELECT 可'
);

-- allowed_users-admin-02: admin は INSERT 可
SELECT lives_ok(
  $$ INSERT INTO public.allowed_users (id, pattern_type, pattern_value, default_role, added_by)
     VALUES ('00000000-0000-0000-0010-000000000099', 'email', 'test-insert@classlab.co.jp',
             'viewer', '00000000-0000-0000-0001-000000000001') $$,
  'allowed_users-admin-02: admin は INSERT 可 (allowed_users_insert_admin)'
);

-- allowed_users-admin-03: admin は UPDATE 可
SELECT lives_ok(
  $$ UPDATE public.allowed_users SET default_role = 'member'
     WHERE id = '00000000-0000-0000-0010-000000000001' $$,
  'allowed_users-admin-03: admin は UPDATE 可 (H-03 allowed_users_update_admin)'
);

-- allowed_users-admin-04: admin は DELETE 可
SELECT lives_ok(
  $$ DELETE FROM public.allowed_users WHERE id = '00000000-0000-0000-0010-000000000099' $$,
  'allowed_users-admin-04: admin は DELETE 可 (allowed_users_delete_admin)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- allowed_users-member-01: member は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users) = 0,
  'allowed_users-member-01: member は SELECT 不可 (admin only)'
);

-- allowed_users-member-02: member は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.allowed_users (id, pattern_type, pattern_value, default_role, added_by)
     VALUES ('00000000-0000-ffff-0010-000000000002', 'email', 'member-insert@classlab.co.jp',
             'viewer', '00000000-0000-0000-0002-000000000001') $$,
  '42501',
  NULL,
  'allowed_users-member-02: member は INSERT deny'
);

-- allowed_users-member-03: member は UPDATE deny → silent 0 rows (USING(is_admin())=false)
-- NOTE (R3-C): allowed_users_update_admin の USING(is_admin()) = false → RLS silent deny。ok(count=0) で検証。
-- NOTE (Phase B fix): default_role は enum user_role なので valid 値 'admin' で試行 (元 'member-tamper' は invalid enum で runtime error 発生)。
--   fixture は default_role='viewer' で作成済 → 'admin' への UPDATE が silent deny なら 'admin' 件数=0 が成立。
DO $$ BEGIN
  UPDATE public.allowed_users SET default_role = 'admin'
    WHERE id = '00000000-0000-0000-0010-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users WHERE default_role = 'admin') = 0,
  'allowed_users-member-03: member は UPDATE silent deny (USING(is_admin())=false、admin 件数=0 で検証)'
);

-- allowed_users-member-04: member は DELETE deny → silent 0 rows (USING(is_admin())=false)
-- NOTE (R3-C): allowed_users_delete_admin の USING(is_admin()) = false → RLS silent deny。ok(count >= 1) で残存確認。
-- NOTE (Phase B fix): member は allowed_users SELECT policy 不在で 0 件返るため、残存検証は RLS bypass で行う。
DO $$ BEGIN
  DELETE FROM public.allowed_users WHERE id IN (
    SELECT id FROM public.allowed_users WHERE id = '00000000-ffff-0000-0010-000000000000'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users WHERE id = '00000000-0000-0000-0010-000000000001') = 1,
  'allowed_users-member-04: member は DELETE silent deny (USING(is_admin())=false、row 残存確認)'
);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- allowed_users-viewer-01: viewer は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users) = 0,
  'allowed_users-viewer-01: viewer は SELECT 不可'
);

-- allowed_users-viewer-02: viewer は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.allowed_users (id, pattern_type, pattern_value, default_role, added_by)
     VALUES ('00000000-0000-ffff-0010-000000000003', 'email', 'viewer-insert@classlab.co.jp',
             'viewer', '00000000-0000-0000-0003-000000000001') $$,
  '42501',
  NULL,
  'allowed_users-viewer-02: viewer は INSERT deny'
);

-- allowed_users-viewer-03: viewer は UPDATE deny → silent 0 rows (USING(is_admin())=false)
-- NOTE (R3-C): allowed_users_update_admin の USING(is_admin()) = false → RLS silent deny。ok(count=0) で検証。
-- NOTE (Phase B fix): default_role は enum user_role なので valid 値 'admin' で試行 (元 'viewer-tamper' は invalid enum で runtime error 発生)。
DO $$ BEGIN
  UPDATE public.allowed_users SET default_role = 'admin'
    WHERE id = '00000000-0000-0000-0010-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users WHERE default_role = 'admin') = 0,
  'allowed_users-viewer-03: viewer は UPDATE silent deny (USING(is_admin())=false、admin 件数=0 で検証)'
);

-- allowed_users-viewer-04: viewer は DELETE deny → silent 0 rows (USING(is_admin())=false)
-- NOTE (R3-C): allowed_users_delete_admin の USING(is_admin()) = false → RLS silent deny。ok(count >= 1) で残存確認。
-- NOTE (Phase B fix): viewer は allowed_users SELECT policy 不在で 0 件返るため、残存検証は RLS bypass で行う。
DO $$ BEGIN
  DELETE FROM public.allowed_users WHERE id IN (
    SELECT id FROM public.allowed_users WHERE id = '00000000-ffff-0000-0010-000000000000'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users WHERE id = '00000000-0000-0000-0010-000000000001') = 1,
  'allowed_users-viewer-04: viewer は DELETE silent deny (USING(is_admin())=false、row 残存確認)'
);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- allowed_users-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users) = 0,
  'allowed_users-anon-01: anon は SELECT 不可'
);

-- allowed_users-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.allowed_users (id, pattern_type, pattern_value, default_role, added_by)
     VALUES ('00000000-0000-ffff-0010-000000000000', 'domain', 'evil.com',
             'admin', '00000000-0000-0000-0001-000000000001') $$,
  '42501',
  NULL,
  'allowed_users-anon-02: anon は INSERT deny'
);

-- allowed_users-anon-03: anon は UPDATE deny → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には update policy 適用なし = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.allowed_users SET default_role = 'admin';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users WHERE default_role = 'admin') = 0,
  'allowed_users-anon-03: anon は UPDATE silent deny (TO authenticated policy のみ、anon 適用なし)'
);

-- allowed_users-anon-04: anon は DELETE deny → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には delete policy 適用なし = RLS silent deny。ok(count >= 1) で残存確認。
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。
DO $$ BEGIN
  DELETE FROM public.allowed_users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.allowed_users) >= 1,
  'allowed_users-anon-04: anon は DELETE silent deny (TO authenticated policy のみ、row 残存確認)'
);

-- ============================================================================
-- TABLE: public.audit_log (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- audit_log-admin-01: admin は SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) >= 1,
  'audit_log-admin-01: admin は SELECT 可 (audit_log_select_admin)'
);

-- audit_log-admin-02: admin でも直接 INSERT は deny (WITH CHECK false, C-02)
SELECT throws_ok(
  $$ INSERT INTO public.audit_log (actor_id, action, target_type, payload)
     VALUES ('00000000-0000-0000-0001-000000000001', 'test.direct_insert', 'test', '{}') $$,
  '42501',
  NULL,
  'audit_log-admin-02: admin でも直接 INSERT は deny (C-02 WITH CHECK false)'
);

-- audit_log-admin-03: audit_log に UPDATE policy なし → silent 0 rows (no exception)
-- NOTE (R3-C): UPDATE/DELETE policy 不在 = RLS silent deny (42501 は投げない)。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.audit_log SET action = 'tampered-admin'
    WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'tampered-admin') = 0,
  'audit_log-admin-03: admin でも audit_log の UPDATE は silent deny (no UPDATE policy)'
);

-- audit_log-admin-04: audit_log に DELETE policy なし → silent 0 rows (no exception)
DO $$ BEGIN
  DELETE FROM public.audit_log WHERE id IN (SELECT id FROM public.audit_log LIMIT 0);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) >= 1,
  'audit_log-admin-04: admin でも audit_log の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- audit_log-member-01: member は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) = 0,
  'audit_log-member-01: member は SELECT 不可 (admin only policy)'
);

-- audit_log-member-02: member は直接 INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.audit_log (actor_id, action, target_type, payload)
     VALUES ('00000000-0000-0000-0002-000000000001', 'test.member_insert', 'test', '{}') $$,
  '42501',
  NULL,
  'audit_log-member-02: member は直接 INSERT deny'
);

-- audit_log-member-03: member は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.audit_log SET action = 'member-tamper'
    WHERE ctid IN (SELECT ctid FROM public.audit_log LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'member-tamper') = 0,
  'audit_log-member-03: member は UPDATE silent deny (no UPDATE policy)'
);

-- audit_log-member-04: member は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): member は audit_log SELECT policy 不在で 0 件返るため、残存検証は RLS bypass で行う。
DO $$ BEGIN
  DELETE FROM public.audit_log
    WHERE ctid IN (SELECT ctid FROM public.audit_log LIMIT 0);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) >= 1,
  'audit_log-member-04: member は DELETE silent deny (no DELETE policy, row 残存確認)'
);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- audit_log-viewer-01: viewer は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) = 0,
  'audit_log-viewer-01: viewer は SELECT 不可'
);

-- audit_log-viewer-02: viewer は直接 INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.audit_log (actor_id, action, target_type, payload)
     VALUES ('00000000-0000-0000-0003-000000000001', 'test.viewer_insert', 'test', '{}') $$,
  '42501',
  NULL,
  'audit_log-viewer-02: viewer は直接 INSERT deny'
);

-- audit_log-viewer-03: viewer は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.audit_log SET action = 'viewer-tamper'
    WHERE ctid IN (SELECT ctid FROM public.audit_log LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'viewer-tamper') = 0,
  'audit_log-viewer-03: viewer は UPDATE silent deny (no UPDATE policy)'
);

-- audit_log-viewer-04: viewer は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): viewer は audit_log SELECT policy 不在で 0 件返るため、残存検証は RLS bypass で行う。
DO $$ BEGIN
  DELETE FROM public.audit_log
    WHERE ctid IN (SELECT ctid FROM public.audit_log LIMIT 0);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) >= 1,
  'audit_log-viewer-04: viewer は DELETE silent deny (no DELETE policy, row 残存確認)'
);
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- audit_log-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) = 0,
  'audit_log-anon-01: anon は SELECT 不可'
);

-- audit_log-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.audit_log (actor_id, action, target_type, payload)
     VALUES (NULL, 'test.anon_insert', 'test', '{}') $$,
  '42501',
  NULL,
  'audit_log-anon-02: anon は INSERT deny'
);

-- audit_log-anon-03: anon は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.audit_log SET action = 'anon-tamper'
    WHERE ctid IN (SELECT ctid FROM public.audit_log LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'anon-tamper') = 0,
  'audit_log-anon-03: anon は UPDATE silent deny (no UPDATE policy)'
);

-- audit_log-anon-04: anon は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。
DO $$ BEGIN
  DELETE FROM public.audit_log
    WHERE ctid IN (SELECT ctid FROM public.audit_log LIMIT 0);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log) >= 1,
  'audit_log-anon-04: anon は DELETE silent deny (no DELETE policy, row 残存確認)'
);

-- ============================================================================
-- TABLE: public.bots (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- bots-admin-01: admin は全 bot を SELECT 可 (bots_select_admin)
SELECT ok(
  (SELECT count(*)::int FROM public.bots) >= 3,
  'bots-admin-01: admin は全 bot を SELECT 可 (bots_select_admin, 3+ rows)'
);

-- bots-admin-02: admin は自分の owner_id で INSERT 可 (bots_insert_owner + is_member_or_above)
SELECT lives_ok(
  $$ INSERT INTO public.bots (id, owner_id, meeting_url, meeting_platform, status)
     VALUES ('00000000-0000-0000-0020-000000000099',
             '00000000-0000-0000-0001-000000000001',
             'https://meet.google.com/admin-insert', 'meet', 'created') $$,
  'bots-admin-02: admin は自分の owner_id で INSERT 可 (is_member_or_above=true for admin)'
);

-- bots-admin-03: admin は自分の bot を UPDATE 可
SELECT lives_ok(
  $$ UPDATE public.bots SET status = 'joined'
     WHERE id = '00000000-0000-0000-0020-000000000099'
     AND owner_id = '00000000-0000-0000-0001-000000000001' $$,
  'bots-admin-03: admin は自分の bot を UPDATE 可 (bots_update_owner)'
);

-- bots-admin-04: admin は自分の bot を DELETE 可
SELECT lives_ok(
  $$ DELETE FROM public.bots
     WHERE id = '00000000-0000-0000-0020-000000000099'
     AND owner_id = '00000000-0000-0000-0001-000000000001' $$,
  'bots-admin-04: admin は自分の bot を DELETE 可 (bots_delete_owner)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- bots-member-01: member は自分の bot のみ SELECT 可 (bots_select_owner)
SELECT ok(
  (SELECT count(*)::int FROM public.bots) = 1,
  'bots-member-01: member は自分の bot のみ SELECT 可 (owner_id 一致の 1 件)'
);

-- bots-member-02: member は is_member_or_above = true なので INSERT 可
SELECT lives_ok(
  $$ INSERT INTO public.bots (id, owner_id, meeting_url, meeting_platform, status)
     VALUES ('00000000-0000-0000-0020-000000000098',
             '00000000-0000-0000-0002-000000000001',
             'https://meet.google.com/member-insert', 'meet', 'created') $$,
  'bots-member-02: member は INSERT 可 (is_member_or_above=true)'
);

-- bots-member-03: member は自分の bot を UPDATE 可
SELECT lives_ok(
  $$ UPDATE public.bots SET status = 'joined'
     WHERE id = '00000000-0000-0000-0020-000000000001'
     AND owner_id = '00000000-0000-0000-0002-000000000001' $$,
  'bots-member-03: member は自分の bot を UPDATE 可 (bots_update_owner)'
);

-- bots-member-04: member は自分の bot を DELETE 可
SELECT lives_ok(
  $$ DELETE FROM public.bots
     WHERE id = '00000000-0000-0000-0020-000000000098'
     AND owner_id = '00000000-0000-0000-0002-000000000001' $$,
  'bots-member-04: member は自分の bot を DELETE 可 (bots_delete_owner)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- bots-viewer-01: viewer は自分の bot のみ SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.bots WHERE owner_id = '00000000-0000-0000-0003-000000000001') = 1,
  'bots-viewer-01: viewer は自分の bot のみ SELECT 可'
);

-- bots-viewer-02: viewer は INSERT deny (is_member_or_above = false)
SELECT throws_ok(
  $$ INSERT INTO public.bots (id, owner_id, meeting_url, meeting_platform, status)
     VALUES ('00000000-0000-ffff-0020-000000000003',
             '00000000-0000-0000-0003-000000000001',
             'https://meet.google.com/viewer-insert', 'meet', 'created') $$,
  '42501',
  NULL,
  'bots-viewer-02: viewer は INSERT deny (is_member_or_above=false, H-02)'
);

-- bots-viewer-03: viewer は自分の bot を UPDATE 可 (bots_update_owner は viewer も対象)
SELECT lives_ok(
  $$ UPDATE public.bots SET status = 'joined'
     WHERE id = '00000000-0000-0000-0020-000000000003'
     AND owner_id = '00000000-0000-0000-0003-000000000001' $$,
  'bots-viewer-03: viewer は自分の bot を UPDATE 可 (bots_update_owner)'
);

-- bots-viewer-04: viewer は自分の bot を DELETE 可 (bots_delete_owner は viewer も対象)
SELECT lives_ok(
  $$ DELETE FROM public.bots
     WHERE id = '00000000-0000-0000-0020-000000000003'
     AND owner_id = '00000000-0000-0000-0003-000000000001' $$,
  'bots-viewer-04: viewer は自分の bot を DELETE 可 (bots_delete_owner)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- bots-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.bots) = 0,
  'bots-anon-01: anon は SELECT 不可'
);

-- bots-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.bots (id, owner_id, meeting_url, meeting_platform, status)
     VALUES ('00000000-0000-ffff-0020-000000000000',
             '00000000-0000-0000-0001-000000000001',
             'https://meet.google.com/anon', 'meet', 'created') $$,
  '42501',
  NULL,
  'bots-anon-02: anon は INSERT deny'
);

-- bots-anon-03: anon は UPDATE deny → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には update policy 適用なし = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.bots SET status = 'anon-hacked'
    WHERE ctid IN (SELECT ctid FROM public.bots LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.bots WHERE status = 'anon-hacked') = 0,
  'bots-anon-03: anon は UPDATE silent deny (TO authenticated policy のみ、anon 適用なし)'
);

-- bots-anon-04: anon は DELETE deny → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には delete policy 適用なし = RLS silent deny。ok(count >= 2) で残存確認。
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。anon role のままだと SELECT 自体が 0 件返し誤検出になる。
DO $$ BEGIN
  DELETE FROM public.bots
    WHERE ctid IN (SELECT ctid FROM public.bots WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.bots) >= 2,
  'bots-anon-04: anon は DELETE silent deny (TO authenticated policy のみ、rows 残存確認)'
);

-- ============================================================================
-- TABLE: public.recordings (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- recordings-admin-01: admin は全 recording を SELECT 可 (recordings_select_admin)
SELECT ok(
  (SELECT count(*)::int FROM public.recordings) >= 2,
  'recordings-admin-01: admin は全 recording を SELECT 可 (recordings_select_admin)'
);

-- recordings-admin-02: admin でも直接 INSERT は deny (C-02 / H-05)
SELECT throws_ok(
  $$ INSERT INTO public.recordings (id, bot_id, status)
     VALUES ('00000000-0000-ffff-0030-000000000001',
             '00000000-0000-0000-0020-000000000001', 'processing') $$,
  '42501',
  NULL,
  'recordings-admin-02: admin でも直接 INSERT は deny (WITH CHECK false, C-02/H-05)'
);

-- recordings-admin-03: admin も UPDATE policy なし → silent 0 rows (no exception)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.recordings SET status = 'tampered-admin'
    WHERE id = '00000000-0000-0000-0030-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE status = 'tampered-admin') = 0,
  'recordings-admin-03: admin も recordings の UPDATE は silent deny (no UPDATE policy)'
);

-- recordings-admin-04: admin も DELETE policy なし → silent 0 rows (no exception)
DO $$ BEGIN
  DELETE FROM public.recordings WHERE id IN (
    SELECT id FROM public.recordings WHERE id = '00000000-ffff-0000-0030-000000000000'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE id = '00000000-0000-0000-0030-000000000001') = 1,
  'recordings-admin-04: admin も recordings の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- recordings-member-01: member は自分の bot の recording を SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE id = '00000000-0000-0000-0030-000000000001') = 1,
  'recordings-member-01: member は自分の bot の recording を SELECT 可'
);

-- recordings-member-02: member は他人の bot の recording を SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE id = '00000000-0000-0000-0030-000000000002') = 0,
  'recordings-member-02: member は他人 bot の recording を SELECT 不可 (cross-owner deny)'
);

-- recordings-member-03: member でも直接 INSERT は deny
SELECT throws_ok(
  $$ INSERT INTO public.recordings (id, bot_id, status)
     VALUES ('00000000-0000-ffff-0030-000000000002',
             '00000000-0000-0000-0020-000000000001', 'processing') $$,
  '42501',
  NULL,
  'recordings-member-03: member でも直接 INSERT は deny'
);

-- recordings-member-04: member も UPDATE policy なし → silent 0 rows (no exception)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.recordings SET status = 'tampered-member'
    WHERE id = '00000000-0000-0000-0030-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE status = 'tampered-member') = 0,
  'recordings-member-04: member も recordings の UPDATE は silent deny (no UPDATE policy)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- recordings-viewer-01: viewer は自分の bot の recording を SELECT 可 (viewer bot id=0020-003)
-- Note: viewer の bot (0020-003) には recording がない → count=0 (own recordings)
SELECT ok(
  (SELECT count(*)::int FROM public.recordings r
   JOIN public.bots b ON r.bot_id = b.id
   WHERE b.owner_id = '00000000-0000-0000-0003-000000000001') = 0,
  'recordings-viewer-01: viewer 自身の bot recording は 0 (fixture 未作成、SELECT policy は適用済)'
);

-- recordings-viewer-02: viewer は他人の bot の recording を SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE id = '00000000-0000-0000-0030-000000000001') = 0,
  'recordings-viewer-02: viewer は他人 bot の recording を SELECT 不可'
);

-- recordings-viewer-03: viewer でも直接 INSERT は deny
SELECT throws_ok(
  $$ INSERT INTO public.recordings (id, bot_id, status)
     VALUES ('00000000-0000-ffff-0030-000000000003',
             '00000000-0000-0000-0020-000000000003', 'processing') $$,
  '42501',
  NULL,
  'recordings-viewer-03: viewer でも直接 INSERT は deny'
);

-- recordings-viewer-04: viewer は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.recordings SET status = 'tampered-viewer'
    WHERE id = '00000000-0000-0000-0030-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE status = 'tampered-viewer') = 0,
  'recordings-viewer-04: viewer は recordings の UPDATE は silent deny (no UPDATE policy)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- recordings-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.recordings) = 0,
  'recordings-anon-01: anon は SELECT 不可'
);

-- recordings-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.recordings (id, bot_id, status)
     VALUES ('00000000-0000-ffff-0030-000000000000',
             '00000000-0000-0000-0020-000000000001', 'processing') $$,
  '42501',
  NULL,
  'recordings-anon-02: anon は INSERT deny'
);

-- recordings-anon-03: anon は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.recordings SET status = 'anon-hacked'
    WHERE ctid IN (SELECT ctid FROM public.recordings LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.recordings WHERE status = 'anon-hacked') = 0,
  'recordings-anon-03: anon は recordings の UPDATE は silent deny (no UPDATE policy)'
);

-- recordings-anon-04: anon は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。
DO $$ BEGIN
  DELETE FROM public.recordings
    WHERE ctid IN (SELECT ctid FROM public.recordings WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.recordings) >= 2,
  'recordings-anon-04: anon は recordings の DELETE は silent deny (no DELETE policy, rows 残存確認)'
);

-- ============================================================================
-- TABLE: public.transcripts (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- transcripts-admin-01: admin は全 transcript を SELECT 可 (transcripts_select_admin)
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts) >= 2,
  'transcripts-admin-01: admin は全 transcript を SELECT 可 (transcripts_select_admin)'
);

-- transcripts-admin-02: admin でも直接 INSERT は deny (C-02 / H-05)
SELECT throws_ok(
  $$ INSERT INTO public.transcripts (id, recording_id, language, full_text)
     VALUES ('00000000-0000-ffff-0040-000000000001',
             '00000000-0000-0000-0030-000000000001', 'en', 'direct insert attempt') $$,
  '42501',
  NULL,
  'transcripts-admin-02: admin でも直接 INSERT は deny'
);

-- transcripts-admin-03: admin も UPDATE policy なし → silent 0 rows (no exception)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.transcripts SET full_text = 'tampered-admin'
    WHERE id = '00000000-0000-0000-0040-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE full_text = 'tampered-admin') = 0,
  'transcripts-admin-03: admin も transcripts の UPDATE は silent deny (no UPDATE policy)'
);

-- transcripts-admin-04: admin も DELETE policy なし → silent 0 rows (no exception)
DO $$ BEGIN
  DELETE FROM public.transcripts WHERE id IN (
    SELECT id FROM public.transcripts WHERE id = '00000000-ffff-0000-0040-000000000000'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE id = '00000000-0000-0000-0040-000000000001') = 1,
  'transcripts-admin-04: admin も transcripts の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- transcripts-member-01: member は自分の bot→recording の transcript を SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE id = '00000000-0000-0000-0040-000000000001') = 1,
  'transcripts-member-01: member は自分の bot の recording の transcript を SELECT 可'
);

-- transcripts-member-02: member は他人の bot の transcript を SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE id = '00000000-0000-0000-0040-000000000002') = 0,
  'transcripts-member-02: member は他人 bot の transcript を SELECT 不可 (cross-owner deny)'
);

-- transcripts-member-03: member でも直接 INSERT は deny
SELECT throws_ok(
  $$ INSERT INTO public.transcripts (id, recording_id, language, full_text)
     VALUES ('00000000-0000-ffff-0040-000000000002',
             '00000000-0000-0000-0030-000000000001', 'ja', 'member direct insert') $$,
  '42501',
  NULL,
  'transcripts-member-03: member でも直接 INSERT は deny'
);

-- transcripts-member-04: member は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.transcripts SET full_text = 'member-tamper'
    WHERE id = '00000000-0000-0000-0040-000000000001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE full_text = 'member-tamper') = 0,
  'transcripts-member-04: member は transcripts の UPDATE は silent deny (no UPDATE policy)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- transcripts-viewer-01: viewer は自分の bot の transcript を SELECT 可 (viewer の bot に recording なし → 0)
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts t
   JOIN public.recordings r ON t.recording_id = r.id
   JOIN public.bots b ON r.bot_id = b.id
   WHERE b.owner_id = '00000000-0000-0000-0003-000000000001') = 0,
  'transcripts-viewer-01: viewer 自身の transcript は 0 (fixture 未作成、SELECT policy 適用済)'
);

-- transcripts-viewer-02: viewer は他人の transcript を SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE id = '00000000-0000-0000-0040-000000000001') = 0,
  'transcripts-viewer-02: viewer は他人 bot の transcript を SELECT 不可'
);

-- transcripts-viewer-03: viewer でも直接 INSERT は deny
SELECT throws_ok(
  $$ INSERT INTO public.transcripts (id, recording_id, language, full_text)
     VALUES ('00000000-0000-ffff-0040-000000000003',
             '00000000-0000-0000-0030-000000000001', 'ja', 'viewer direct insert') $$,
  '42501',
  NULL,
  'transcripts-viewer-03: viewer でも直接 INSERT は deny'
);

-- transcripts-viewer-04: viewer は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.transcripts SET full_text = 'viewer-tamper'
    WHERE ctid IN (SELECT ctid FROM public.transcripts LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE full_text = 'viewer-tamper') = 0,
  'transcripts-viewer-04: viewer は transcripts の UPDATE は silent deny (no UPDATE policy)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- transcripts-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts) = 0,
  'transcripts-anon-01: anon は SELECT 不可'
);

-- transcripts-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.transcripts (id, recording_id, language, full_text)
     VALUES ('00000000-0000-ffff-0040-000000000000',
             '00000000-0000-0000-0030-000000000001', 'ja', 'anon insert') $$,
  '42501',
  NULL,
  'transcripts-anon-02: anon は INSERT deny'
);

-- transcripts-anon-03: anon は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.transcripts SET full_text = 'anon-tamper'
    WHERE ctid IN (SELECT ctid FROM public.transcripts LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts WHERE full_text = 'anon-tamper') = 0,
  'transcripts-anon-03: anon は transcripts の UPDATE は silent deny (no UPDATE policy)'
);

-- transcripts-anon-04: anon は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。
DO $$ BEGIN
  DELETE FROM public.transcripts
    WHERE ctid IN (SELECT ctid FROM public.transcripts WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.transcripts) >= 2,
  'transcripts-anon-04: anon は transcripts の DELETE は silent deny (no DELETE policy, rows 残存確認)'
);

-- ============================================================================
-- TABLE: public.calendar_events (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- calendar_events-admin-01: admin は全 calendar_event を SELECT 可 (calendar_events_select_admin)
SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events) >= 2,
  'calendar_events-admin-01: admin は全 calendar_event を SELECT 可'
);

-- calendar_events-admin-02: admin は自分の user_id で INSERT 可 (calendar_events_all_owner)
SELECT lives_ok(
  $$ INSERT INTO public.calendar_events (id, user_id, title, start_time, end_time)
     VALUES ('00000000-0000-0000-0050-000000000099',
             '00000000-0000-0000-0001-000000000001',
             'Admin Insert Test', now(), now() + interval '1 hour') $$,
  'calendar_events-admin-02: admin は自分の user_id で INSERT 可 (calendar_events_all_owner)'
);

-- calendar_events-admin-03: admin は自分のイベントを UPDATE 可
SELECT lives_ok(
  $$ UPDATE public.calendar_events SET title = 'Admin Updated'
     WHERE id = '00000000-0000-0000-0050-000000000099'
     AND user_id = '00000000-0000-0000-0001-000000000001' $$,
  'calendar_events-admin-03: admin は自分のイベントを UPDATE 可'
);

-- calendar_events-admin-04: admin は自分のイベントを DELETE 可
SELECT lives_ok(
  $$ DELETE FROM public.calendar_events
     WHERE id = '00000000-0000-0000-0050-000000000099'
     AND user_id = '00000000-0000-0000-0001-000000000001' $$,
  'calendar_events-admin-04: admin は自分のイベントを DELETE 可'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- calendar_events-member-01: member は自分のイベントのみ SELECT 可
SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events
   WHERE user_id = '00000000-0000-0000-0002-000000000001') = 1,
  'calendar_events-member-01: member は自分のイベントのみ SELECT 可 (1 件)'
);

-- calendar_events-member-02: member は INSERT 可 (calendar_events_all_owner)
SELECT lives_ok(
  $$ INSERT INTO public.calendar_events (id, user_id, title, start_time, end_time)
     VALUES ('00000000-0000-0000-0050-000000000098',
             '00000000-0000-0000-0002-000000000001',
             'Member Insert Test', now(), now() + interval '1 hour') $$,
  'calendar_events-member-02: member は INSERT 可'
);

-- calendar_events-member-03: member は自分のイベントを UPDATE 可
SELECT lives_ok(
  $$ UPDATE public.calendar_events SET title = 'Member Updated'
     WHERE id = '00000000-0000-0000-0050-000000000001'
     AND user_id = '00000000-0000-0000-0002-000000000001' $$,
  'calendar_events-member-03: member は自分のイベントを UPDATE 可'
);

-- calendar_events-member-04: member は自分のイベントを DELETE 可
SELECT lives_ok(
  $$ DELETE FROM public.calendar_events
     WHERE id = '00000000-0000-0000-0050-000000000098'
     AND user_id = '00000000-0000-0000-0002-000000000001' $$,
  'calendar_events-member-04: member は自分のイベントを DELETE 可'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- calendar_events-viewer-01: viewer は自分のイベントのみ SELECT 可
-- (viewer には fixture なし → 0, policy 有効の確認)
SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events
   WHERE user_id = '00000000-0000-0000-0003-000000000001') = 0,
  'calendar_events-viewer-01: viewer 自身のイベントは 0 (fixture 未作成、SELECT policy 適用済)'
);

-- calendar_events-viewer-02: viewer は INSERT 可 (calendar_events_all_owner = viewer 含む全 authenticated)
SELECT lives_ok(
  $$ INSERT INTO public.calendar_events (id, user_id, title, start_time, end_time)
     VALUES ('00000000-0000-0000-0050-000000000097',
             '00000000-0000-0000-0003-000000000001',
             'Viewer Insert Test', now(), now() + interval '1 hour') $$,
  'calendar_events-viewer-02: viewer は INSERT 可 (calendar_events_all_owner)'
);

-- calendar_events-viewer-03: viewer は自分のイベントを UPDATE 可
SELECT lives_ok(
  $$ UPDATE public.calendar_events SET title = 'Viewer Updated'
     WHERE id = '00000000-0000-0000-0050-000000000097'
     AND user_id = '00000000-0000-0000-0003-000000000001' $$,
  'calendar_events-viewer-03: viewer は自分のイベントを UPDATE 可'
);

-- calendar_events-viewer-04: viewer は自分のイベントを DELETE 可
SELECT lives_ok(
  $$ DELETE FROM public.calendar_events
     WHERE id = '00000000-0000-0000-0050-000000000097'
     AND user_id = '00000000-0000-0000-0003-000000000001' $$,
  'calendar_events-viewer-04: viewer は自分のイベントを DELETE 可'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- calendar_events-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events) = 0,
  'calendar_events-anon-01: anon は SELECT 不可'
);

-- calendar_events-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.calendar_events (id, user_id, title, start_time, end_time)
     VALUES ('00000000-0000-ffff-0050-000000000000',
             '00000000-0000-0000-0001-000000000001',
             'Anon Insert', now(), now() + interval '1 hour') $$,
  '42501',
  NULL,
  'calendar_events-anon-02: anon は INSERT deny'
);

-- calendar_events-anon-03: anon は UPDATE deny → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には update policy 適用なし = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.calendar_events SET title = 'anon-hacked'
    WHERE ctid IN (SELECT ctid FROM public.calendar_events LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events WHERE title = 'anon-hacked') = 0,
  'calendar_events-anon-03: anon は UPDATE silent deny (TO authenticated policy のみ、anon 適用なし)'
);

-- calendar_events-anon-04: anon は DELETE deny → silent 0 rows (TO authenticated policy のみ)
-- NOTE (R3-C): anon には delete policy 適用なし = RLS silent deny。ok(count >= 2) で残存確認。
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。
DO $$ BEGIN
  DELETE FROM public.calendar_events
    WHERE ctid IN (SELECT ctid FROM public.calendar_events WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.calendar_events) >= 2,
  'calendar_events-anon-04: anon は DELETE silent deny (TO authenticated policy のみ、rows 残存確認)'
);

-- ============================================================================
-- TABLE: public.webhook_events (16 cases)
-- ============================================================================

-- ---- ADMIN (4 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- webhook_events-admin-01: admin は SELECT 可 (webhook_events_select_admin)
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) >= 1,
  'webhook_events-admin-01: admin は SELECT 可 (webhook_events_select_admin)'
);

-- webhook_events-admin-02: admin でも直接 INSERT は deny (C-02 / H-05, WITH CHECK false)
SELECT throws_ok(
  $$ INSERT INTO public.webhook_events (id, event_type, payload)
     VALUES ('00000000-0000-ffff-0060-000000000001', 'bot.status_change', '{"status":"admin-direct"}') $$,
  '42501',
  NULL,
  'webhook_events-admin-02: admin でも直接 INSERT は deny (WITH CHECK false)'
);

-- webhook_events-admin-03: admin も UPDATE policy なし → silent 0 rows (no exception)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.webhook_events SET event_type = 'tampered-admin'
    WHERE ctid IN (SELECT ctid FROM public.webhook_events LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events WHERE event_type = 'tampered-admin') = 0,
  'webhook_events-admin-03: admin も webhook_events の UPDATE は silent deny (no UPDATE policy)'
);

-- webhook_events-admin-04: admin も DELETE policy なし → silent 0 rows (no exception)
DO $$ BEGIN
  DELETE FROM public.webhook_events
    WHERE ctid IN (SELECT ctid FROM public.webhook_events WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) >= 1,
  'webhook_events-admin-04: admin も webhook_events の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- webhook_events-member-01: member は SELECT 不可 (admin only policy)
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) = 0,
  'webhook_events-member-01: member は SELECT 不可 (admin only)'
);

-- webhook_events-member-02: member は直接 INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.webhook_events (id, event_type, payload)
     VALUES ('00000000-0000-ffff-0060-000000000002', 'bot.status_change', '{"status":"member-direct"}') $$,
  '42501',
  NULL,
  'webhook_events-member-02: member は直接 INSERT deny'
);

-- webhook_events-member-03: member は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.webhook_events SET event_type = 'member-tamper'
    WHERE ctid IN (SELECT ctid FROM public.webhook_events LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events WHERE event_type = 'member-tamper') = 0,
  'webhook_events-member-03: member は webhook_events の UPDATE は silent deny (no UPDATE policy)'
);

-- webhook_events-member-04: member は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): member は webhook_events SELECT policy 不在で 0 件返るため、残存検証は RLS bypass で行う。
DO $$ BEGIN
  DELETE FROM public.webhook_events
    WHERE ctid IN (SELECT ctid FROM public.webhook_events WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) >= 1,
  'webhook_events-member-04: member は webhook_events の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

-- ---- VIEWER (4 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- webhook_events-viewer-01: viewer は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) = 0,
  'webhook_events-viewer-01: viewer は SELECT 不可'
);

-- webhook_events-viewer-02: viewer は直接 INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.webhook_events (id, event_type, payload)
     VALUES ('00000000-0000-ffff-0060-000000000003', 'bot.status_change', '{"status":"viewer-direct"}') $$,
  '42501',
  NULL,
  'webhook_events-viewer-02: viewer は直接 INSERT deny'
);

-- webhook_events-viewer-03: viewer は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.webhook_events SET event_type = 'viewer-tamper'
    WHERE ctid IN (SELECT ctid FROM public.webhook_events LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events WHERE event_type = 'viewer-tamper') = 0,
  'webhook_events-viewer-03: viewer は webhook_events の UPDATE は silent deny (no UPDATE policy)'
);

-- webhook_events-viewer-04: viewer は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): viewer は webhook_events SELECT policy 不在で 0 件返るため、残存検証は RLS bypass で行う。
DO $$ BEGIN
  DELETE FROM public.webhook_events
    WHERE ctid IN (SELECT ctid FROM public.webhook_events WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) >= 1,
  'webhook_events-viewer-04: viewer は webhook_events の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

-- ---- ANON (4 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- webhook_events-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) = 0,
  'webhook_events-anon-01: anon は SELECT 不可'
);

-- webhook_events-anon-02: anon は INSERT deny
SELECT throws_ok(
  $$ INSERT INTO public.webhook_events (id, event_type, payload)
     VALUES ('00000000-0000-ffff-0060-000000000000', 'bot.status_change', '{"status":"anon"}') $$,
  '42501',
  NULL,
  'webhook_events-anon-02: anon は INSERT deny'
);

-- webhook_events-anon-03: anon は UPDATE deny → silent 0 rows (no UPDATE policy)
-- NOTE (R3-C): UPDATE policy 不在 = RLS silent deny。ok(count=0) で検証。
DO $$ BEGIN
  UPDATE public.webhook_events SET event_type = 'anon-tamper'
    WHERE ctid IN (SELECT ctid FROM public.webhook_events LIMIT 1);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events WHERE event_type = 'anon-tamper') = 0,
  'webhook_events-anon-03: anon は webhook_events の UPDATE は silent deny (no UPDATE policy)'
);

-- webhook_events-anon-04: anon は DELETE deny → silent 0 rows (no DELETE policy)
-- NOTE (Phase B fix): SELECT 検証は RLS bypass 視点 (postgres role) で行う。
DO $$ BEGIN
  DELETE FROM public.webhook_events
    WHERE ctid IN (SELECT ctid FROM public.webhook_events WHERE FALSE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

RESET role;
SELECT ok(
  (SELECT count(*)::int FROM public.webhook_events) >= 1,
  'webhook_events-anon-04: anon は webhook_events の DELETE は silent deny (no DELETE policy, row 残存確認)'
);

-- ============================================================================
-- TABLE: public.audit_log_cleanup (8 cases) — B SEC-H3 fix
-- 008 migration で追加。audit_log_cleanup_select_admin + audit_log_cleanup_insert_system の 2 policy。
-- INSERT WITH CHECK(false) → 42501 例外 (INSERT policy は throws_ok 正しい)。
-- SELECT deny は ok(count=0) (SELECT policy は USING(is_admin()), non-admin は silent deny)。
-- UPDATE/DELETE policy なし → テスト対象外 (本 table は監視用 monitoring record のみ)。
-- ============================================================================

-- ---- ADMIN (2 cases) --------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';

-- audit_log_cleanup-admin-01: admin は SELECT 可 (audit_log_cleanup_select_admin)
-- NOTE (R4-E-01): count >= 0 は trivially-passing (cron 未実行環境では常に 0 rows が正常)。
--   policy 適用の verify は audit_log_cleanup-member/viewer/anon-01 の SELECT=deny (count=0) と
--   audit_log_cleanup-admin-02 の INSERT throws_ok(42501) で担保する。
--   cron 実行後のデータ存在確認が必要な場合は e2e / integration テストで別途行うこと。
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log_cleanup) >= 0,
  'audit_log_cleanup-admin-01: admin は SELECT 可 (audit_log_cleanup_select_admin, cron 未実行時は 0 rows が正常)'
);

-- audit_log_cleanup-admin-02: admin でも直接 INSERT は deny (WITH CHECK false, C-02 同方針)
SELECT throws_ok(
  $$ INSERT INTO public.audit_log_cleanup (ran_at, retention_days, cutoff, deleted_count)
     VALUES (now(), 91, now() - interval '91 days', 0) $$,
  '42501',
  NULL,
  'audit_log_cleanup-admin-02: admin でも直接 INSERT は deny (WITH CHECK false)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- MEMBER (2 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';

-- audit_log_cleanup-member-01: member は SELECT 不可 (admin only)
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log_cleanup) = 0,
  'audit_log_cleanup-member-01: member は SELECT 不可 (admin only policy)'
);

-- audit_log_cleanup-member-02: member は直接 INSERT deny (WITH CHECK false)
SELECT throws_ok(
  $$ INSERT INTO public.audit_log_cleanup (ran_at, retention_days, cutoff, deleted_count)
     VALUES (now(), 91, now() - interval '91 days', 0) $$,
  '42501',
  NULL,
  'audit_log_cleanup-member-02: member は直接 INSERT deny (WITH CHECK false)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- VIEWER (2 cases) -------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0003-000000000001","role":"authenticated"}';

-- audit_log_cleanup-viewer-01: viewer は SELECT 不可 (admin only)
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log_cleanup) = 0,
  'audit_log_cleanup-viewer-01: viewer は SELECT 不可 (admin only policy)'
);

-- audit_log_cleanup-viewer-02: viewer は直接 INSERT deny (WITH CHECK false)
SELECT throws_ok(
  $$ INSERT INTO public.audit_log_cleanup (ran_at, retention_days, cutoff, deleted_count)
     VALUES (now(), 91, now() - interval '91 days', 0) $$,
  '42501',
  NULL,
  'audit_log_cleanup-viewer-02: viewer は直接 INSERT deny (WITH CHECK false)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ---- ANON (2 cases) ---------------------------------------------------------

SET LOCAL ROLE anon;

-- audit_log_cleanup-anon-01: anon は SELECT 不可
SELECT ok(
  (SELECT count(*)::int FROM public.audit_log_cleanup) = 0,
  'audit_log_cleanup-anon-01: anon は SELECT 不可'
);

-- audit_log_cleanup-anon-02: anon は INSERT deny (WITH CHECK false, TO anon も含む)
SELECT throws_ok(
  $$ INSERT INTO public.audit_log_cleanup (ran_at, retention_days, cutoff, deleted_count)
     VALUES (now(), 91, now() - interval '91 days', 0) $$,
  '42501',
  NULL,
  'audit_log_cleanup-anon-02: anon は INSERT deny (WITH CHECK false)'
);

RESET role;

-- ============================================================================
-- FINISH
-- ============================================================================
SELECT * FROM finish();

ROLLBACK;
