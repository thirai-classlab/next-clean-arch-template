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
--   (1) primary domain (既定 classlab.co.jp) → status = 'active', role = 'member'        → 2 asserts
--   (2) allow_list 一致 (domain) → public.users.status = 'active', role = allow_list の default_role → 2 asserts (Round-3 追加)
--   (3) 未登録の外部 domain      → public.users.status = 'pending', role = 'viewer'     → 2 asserts
--   + 前提オブジェクト確認       → 2 asserts
--   + P5-R1 config-row 駆動 (010_domain_hook_config.sql):
--     (4) hook_config table + 既定 seed 値 + 変更監査 trigger の存在                      → 3 asserts
--     (5) config を別 domain に変更 → audit_log に config.domain_changed (old/new) 記録
--         + 新 domain が active/member、旧 primary は pending                             → 5 asserts
--     (6) config = '' (空文字) → 制約なし、任意 domain が active/member                  → 2 asserts
--   + P5-R4 fail-closed (006/010 FAILURE MODE 注記):
--     (7) public.users schema 破壊時、signup INSERT が例外で ROLLBACK (fail-closed)       → 1 assert
--   ─────────────────────────────────────────
--   plan 合計                                                                             → 19
--
-- 各ケースは auth.users へ INSERT (= サインアップ模擬) し、AFTER INSERT trigger
-- (on_auth_user_created) が public.users projection を期待通り作成することを assert する。

BEGIN;

SELECT plan(19);

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

-- ============================================================================
-- ケース (4): P5-R1 — hook_config table + 既定 seed (010_domain_hook_config.sql)
-- ============================================================================
SELECT has_table(
  'public', 'hook_config',
  'public.hook_config table が存在する (010)'
);

SELECT is(
  (SELECT value FROM public.hook_config WHERE key = 'allowed_email_domain'),
  'classlab.co.jp',
  'hook_config.allowed_email_domain の migration 既定値は classlab.co.jp (従来挙動の保存)'
);

-- P5 review HIGH: hook_config の変更監査 trigger が配線されている (010 (2))
SELECT has_trigger(
  'public', 'hook_config', 'on_hook_config_change',
  'hook_config に on_hook_config_change audit trigger が設定されている (P5 review HIGH)'
);

-- ============================================================================
-- ケース (5): P5-R1 — config を別 domain に変更すると trigger が runtime に追従する
-- ============================================================================
UPDATE public.hook_config
SET value = 'partner2.example.io', updated_at = now()
WHERE key = 'allowed_email_domain';

-- P5 review HIGH: config 変更が audit_log に action=config.domain_changed で記録される
-- (forensic trail。直近の config.domain_changed row が今の UPDATE に対応する)
SELECT is(
  (SELECT payload->>'old_value' FROM public.audit_log
   WHERE action = 'config.domain_changed'
   ORDER BY id DESC LIMIT 1),
  'classlab.co.jp',
  'config 変更 audit row: old_value = 旧 primary domain (classlab.co.jp)'
);
SELECT is(
  (SELECT payload->>'new_value' FROM public.audit_log
   WHERE action = 'config.domain_changed'
   ORDER BY id DESC LIMIT 1),
  'partner2.example.io',
  'config 変更 audit row: new_value = 新 primary domain (partner2.example.io)'
);

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000004', 'kenji@partner2.example.io');

SELECT is(
  (SELECT status::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000004'),
  'active',
  'config 変更後: 新 primary domain (partner2.example.io) user は status=active'
);
SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000004'),
  'member',
  'config 変更後: 新 primary domain user は role=member'
);

-- 旧 primary (classlab.co.jp) は allow_list にも無いので pending へ降格する (hardcode が残っていない証明)
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000005', 'jiro@classlab.co.jp');

SELECT is(
  (SELECT status::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000005'),
  'pending',
  'config 変更後: 旧 primary domain (classlab.co.jp) user は status=pending (hardcode 撤去の証明)'
);

-- ============================================================================
-- ケース (6): P5-R1 — config = '' (空文字) は「制約なし」(NextAuth 側 semantics と parity)
-- ============================================================================
UPDATE public.hook_config
SET value = '', updated_at = now()
WHERE key = 'allowed_email_domain';

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000006', 'anyone@totally-random.example.net');

SELECT is(
  (SELECT status::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000006'),
  'active',
  'config 空文字: 任意 domain の user が status=active (制約なし)'
);
SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-000000000006'),
  'member',
  'config 空文字: 任意 domain の user が role=member (制約なし)'
);

-- config を既定値に戻す (以降のケースが従来挙動前提でも安全なように。tx 全体は最後に ROLLBACK)
UPDATE public.hook_config
SET value = 'classlab.co.jp', updated_at = now()
WHERE key = 'allowed_email_domain';

-- ============================================================================
-- ケース (7): P5-R4 — fail-closed 検証 (public.users schema 破壊 → signup が例外で拒否)
-- ============================================================================
-- 006/010 header の FAILURE MODE 注記どおり、trigger 内の未処理例外 (ここでは
-- 将来 migration による schema 不整合を column rename で模擬) は auth.users INSERT
-- transaction ごと ROLLBACK し、signup を拒否する (fail-closed) ことを検証する。
ALTER TABLE public.users RENAME COLUMN status TO status_broken;

SELECT throws_ok(
  $$ INSERT INTO auth.users (id, email)
     VALUES ('00000000-0000-0000-0000-000000000007', 'victim@classlab.co.jp') $$,
  NULL,
  NULL,
  'fail-closed: public.users schema 破壊時、signup INSERT は例外で拒否される (silent fail-open しない)'
);

-- schema を復旧 (tx 全体は最後に ROLLBACK するが、後続 assert 追加時の安全のため明示復旧)
ALTER TABLE public.users RENAME COLUMN status_broken TO status;

SELECT * FROM finish();

ROLLBACK;
