-- supabase/tests/domain_check_hook.test.sql
-- task-5 Step 2: pgTAP test scaffold for signup_check_classlab_domain() Auth Hook.
-- task-5 Step 7 Round-3 D MEDIUM: case 2 に role assertion を追加 (plan 7→8)。
--
-- これは RED scaffold である (期待動作を文書化する目的)。
-- 実行には Step 3 (migration 002-005: public.users / allowed_users / audit_log + log_audit_event) が
-- apply 済であること + local Supabase stack (supabase start) + pgTAP extension が必要。
-- Step 3 完了 + Supabase env 整備後に `supabase test db` で実行する (本 Step では実行しない)。
--
-- 検証する 3 ケース (draft 08 §Step 2.5 完了条件の中核 3 シナリオ):
--   (1) @classlab.co.jp        → public.users.status = 'active', role = 'member'        → 2 asserts
--   (2) allow_list 一致 (domain) → public.users.status = 'active', role = allow_list の default_role → 2 asserts (Round-3 追加)
--   (3) 未登録の外部 domain      → public.users.status = 'pending', role = 'viewer'     → 2 asserts
--   + 前提オブジェクト確認       → 2 asserts
--   ─────────────────────────────────────────
--   plan 合計                                                                             → 8
--
-- 各ケースは auth.users へ INSERT (= サインアップ模擬) し、AFTER INSERT trigger
-- (on_auth_user_created) が public.users projection を期待通り作成することを assert する。

BEGIN;

SELECT plan(8);

-- 前提オブジェクトの存在確認 (Step 3 migration が apply されていること) -----------------
SELECT has_function(
  'public', 'signup_check_classlab_domain', ARRAY[]::text[],
  'signup_check_classlab_domain() function が存在する'
);

SELECT has_trigger(
  'auth', 'users', 'on_auth_user_created',
  'auth.users に on_auth_user_created trigger が設定されている'
);

-- テスト用 fixture: allow list に外部 domain を 1 件登録 (case 2 用) ----------------------
-- added_by は NOT NULL FK のため、先にダミー admin user を public.users へ用意する。
-- (本 fixture は Step 3 の table 定義に依存。scaffold 段階では実行不可。)
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000000aa', 'admin@classlab.co.jp');

INSERT INTO public.allowed_users (pattern_type, pattern_value, default_role, added_by)
VALUES ('domain', 'partner.example.com', 'viewer', '00000000-0000-0000-0000-0000000000aa');

-- ケース (1): @classlab.co.jp → active / member ----------------------------------------
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'taro@classlab.co.jp');

SELECT is(
  (SELECT status::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001'),
  'active',
  'classlab.co.jp user は status=active'
);
SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001'),
  'member',
  'classlab.co.jp user は role=member'
);

-- ケース (2): allow_list domain 一致 → active / default_role ----------------------------
-- task-5 Step 7 Round-3 D MEDIUM: status のみ検証だった case 2 に role assertion を追加。
-- allow_list の default_role ('viewer') が public.users.role に正しく反映されることを検証する。
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000002', 'hanako@partner.example.com');

SELECT is(
  (SELECT status::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000002'),
  'active',
  'allow_list 登録 domain の user は status=active'
);

SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000002'),
  'viewer',
  'allow_list 登録 domain の user は role=allow_list.default_role (viewer)'
);

-- ケース (3): 未登録の外部 domain → pending / viewer -------------------------------------
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000003', 'guest@unknown.example.org');

SELECT is(
  (SELECT status::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000003'),
  'pending',
  '未登録 domain の user は status=pending'
);
SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000003'),
  'viewer',
  '未登録 domain の user は role=viewer'
);

SELECT * FROM finish();

ROLLBACK;
