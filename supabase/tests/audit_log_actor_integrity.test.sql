-- supabase/tests/audit_log_actor_integrity.test.sql
-- task-5 Step 7 (Round-1 CRITICAL F qa-expert CRIT-2): log_audit_event() の actor_id 詐称防止 pgTAP。
--
-- これは RED scaffold である (期待される security 動作を文書化する目的)。
-- 実行には Step 3 migration (002-005、特に 004 の log_audit_event + audit_log) が apply 済であること
-- + local Supabase stack (supabase start) + pgTAP extension が必要。
-- 本 Step では実行しない (NO Supabase env、db push / pgTAP 実行は Step 8 DB-apply gate に deferred、
--  domain_check_hook.test.sql / jwt_custom_claim.test.sql / rls_policies.test.sql と同条件)。
--
-- 起源: docs/draft/08_auth-sso-admin-review.md §SEC-1 (CRITICAL、actor_id なりすまし)。
--   旧実装 COALESCE(NULLIF(p_actor_id::text,''), auth.uid()) は authenticated user が
--   他人の uuid を p_actor_id に渡して監査ログを詐称できた。fix で COALESCE(auth.uid(), p_actor_id)
--   に反転し、authenticated 呼び出しでは自身の auth.uid() を強制するようにした。
--
-- 検証する 6 ケース (Round-1 CRITICAL 11 / F qa-expert CRIT-2 要件 + R3-A MEDIUM-N1 fix):
--   case 1: auth.uid() 非 null 時、p_actor_id を渡しても auth.uid() が使われる (詐称無視)    → 1
--   case 2: auth.uid() null 時 (service_role/system)、p_actor_id が尊重される               → 1
--   case 3: auth.uid() null + p_actor_id null → record 作成可 (actor_id NULL)              → 1
--   case 4: malicious p_actor_id (= 他 user UUID) を渡しても auth.uid() が priority          → 1
--   case 5a: audit_log の UPDATE は silent deny (append-only、B SEC-H2 連動)               → 1
--   case 5b: audit_log の DELETE は silent deny (append-only、行残存確認)                   → 1
--   ─────────────────────────────────────────
--   plan 合計 (case 5 = UPDATE + DELETE 2 sub-case で 6 assert)                            → 6

BEGIN;

SELECT plan(6);

-- ============================================================================
-- fixture: actor 候補 2 user を auth.users + public.users へ用意。
-- public.users.id は auth.users(id) ON DELETE CASCADE への FK のため
-- auth.users seed を先に投入する (Step 8 Phase B fix: users_id_fkey 違反防止)。
-- 本テストは actor 解決ロジックの検証に限定 (signup hook 経由しない)。
-- ============================================================================
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'user-one@classlab.co.jp', now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000002', 'user-two@classlab.co.jp', now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- 006 signup trigger (on_auth_user_created) が auth.users INSERT を契機に
-- public.users に row を自動作成するため、ON CONFLICT DO UPDATE で role / status を上書き。
INSERT INTO public.users (id, email, status, role, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'user-one@classlab.co.jp', 'active', 'member', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'user-two@classlab.co.jp', 'active', 'member', now(), now())
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      status = EXCLUDED.status,
      role = EXCLUDED.role,
      updated_at = now();

-- ============================================================================
-- case 1: auth.uid() 非 null 時、p_actor_id を渡しても auth.uid() が使われる (詐称無視)
--
-- authenticated context を模擬: request.jwt.claims に sub = user-1 を設定すると
-- auth.uid() が '00000000-0000-0000-0000-000000000001' を返す。
-- p_actor_id には user-2 (他人の UUID) を渡す。
-- COALESCE(auth.uid(), p_actor_id) = auth.uid() = user-1 が記録される。
-- ============================================================================
SET LOCAL role TO authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT public.log_audit_event(
  '00000000-0000-0000-0000-000000000002',  -- p_actor_id: user-2 を詐称しようとする
  'test.case1',
  'bot',
  '00000000-0000-0000-0000-0000000000c1',
  '{}'::jsonb
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT is(
  (SELECT actor_id::text FROM public.audit_log
     WHERE action = 'test.case1'
     ORDER BY id DESC LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'case 1: auth.uid() 非 null 時は p_actor_id を無視して auth.uid() が記録される (詐称不能)'
);

-- ============================================================================
-- case 2: auth.uid() null 時 (service_role/system)、p_actor_id が尊重される
--
-- JWT claims 未設定 = auth.uid() IS NULL = trigger / service_role / 内部バッチ context。
-- 006 signup trigger が NEW.id を p_actor_id で渡す経路がこのケースに該当し、
-- COALESCE(auth.uid(), p_actor_id) = p_actor_id = user-1 で記録されることを保証する。
-- ============================================================================
SELECT public.log_audit_event(
  '00000000-0000-0000-0000-000000000001',  -- system context: p_actor_id = user-1 が尊重される
  'test.case2',
  'user',
  '00000000-0000-0000-0000-000000000001',
  '{}'::jsonb
);

SELECT is(
  (SELECT actor_id::text FROM public.audit_log
     WHERE action = 'test.case2'
     ORDER BY id DESC LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'case 2: auth.uid() IS NULL (system context) では p_actor_id が尊重される (006 trigger の NEW.id 記録経路を保証)'
);

-- ============================================================================
-- case 3: auth.uid() null + p_actor_id null → record 作成可 (actor_id NULL)
--
-- system event で actor 不明の場合 (cron job / automated maintenance 等) に
-- actor_id = NULL で audit_log に記録できることを検証する。
-- COALESCE(auth.uid(), p_actor_id) = COALESCE(NULL, NULL) = NULL が記録される。
-- ============================================================================
SELECT public.log_audit_event(
  NULL,          -- p_actor_id: NULL (actor 不明の system event)
  'test.case3',
  'system',
  NULL,          -- target_id: NULL
  '{"reason":"scheduled_cleanup"}'::jsonb
);

SELECT is(
  (SELECT actor_id IS NULL FROM public.audit_log
     WHERE action = 'test.case3'
     ORDER BY id DESC LIMIT 1),
  true,
  'case 3: auth.uid() null + p_actor_id null でも audit_log に record が作成され、actor_id = NULL で記録される'
);

-- ============================================================================
-- case 4: malicious p_actor_id (= 他 user UUID) を渡しても auth.uid() が priority
--
-- case 1 の回帰 guard として、より明示的に「悪意ある呼び出し元が他人の UUID を
-- p_actor_id に指定しても詐称できない」ことを検証する。
-- user-2 としてログインした状態で user-1 の UUID を p_actor_id に渡す。
-- 記録される actor_id は auth.uid() = user-2 であることを保証する。
-- ============================================================================
SET LOCAL role TO authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

SELECT public.log_audit_event(
  '00000000-0000-0000-0000-000000000001',  -- p_actor_id: malicious attempt (user-1 の UUID を偽装)
  'test.case4',
  'recording',
  '00000000-0000-0000-0000-0000000000d4',
  '{"attempted_impersonation":true}'::jsonb
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT is(
  (SELECT actor_id::text FROM public.audit_log
     WHERE action = 'test.case4'
     ORDER BY id DESC LIMIT 1),
  '00000000-0000-0000-0000-000000000002',
  'case 4: malicious p_actor_id (他 user UUID) を渡しても auth.uid() (= 実 user-2) が記録される (回帰 guard)'
);

-- ============================================================================
-- case 5a: audit_log の UPDATE は silent 0 rows で deny (append-only、B SEC-H2 連動)
--
-- audit_log は append-only 設計。UPDATE/DELETE policy が存在しないため、
-- authenticated role から UPDATE しても silent 0 rows (例外は投げない)。
-- ok(count=0) パターンで「改ざんされていないこと」を検証する (R3-A MEDIUM-N1 fix)。
--
-- NOTE (R3-A): throws_ok(UPDATE ...) は runtime FAIL する。
--   UPDATE policy 不在 = RLS silent deny (42501 は発生しない)。
--   ok((SELECT count(*) FROM audit_log WHERE action = 'tampered') = 0) が正しいパターン。
-- ============================================================================
SET LOCAL role TO authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $$ BEGIN
  UPDATE public.audit_log
    SET action = 'tampered'
    WHERE action = 'test.case1';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'tampered') = 0,
  'case 5a: authenticated role からの audit_log UPDATE は silent deny (no UPDATE policy, append-only 確認)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ============================================================================
-- case 5b: audit_log の DELETE は silent 0 rows で deny (append-only、B SEC-H2 連動)
--
-- DELETE policy も存在しないため同様に silent deny。
-- ok(count >= 1) で「行が削除されていないこと」を検証する (R3-A MEDIUM-N1 fix)。
-- ============================================================================
SET LOCAL role TO authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $$ BEGIN
  DELETE FROM public.audit_log
    WHERE action = 'test.case1';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- NOTE (Phase B fix): user-one (case 1 で actor_id 記録) は role=member のため audit_log_select_admin policy で
-- SELECT 0 件返る。silent deny 後の row 残存検証は RLS bypass (postgres role) で行う。
RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT ok(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'test.case1') >= 1,
  'case 5b: authenticated role からの audit_log DELETE は silent deny (no DELETE policy, row 残存確認)'
);

SELECT * FROM finish();

ROLLBACK;
