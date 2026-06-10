-- supabase/tests/last_admin_protection.test.sql
-- task-5 Step 7 Round-1 HIGH (B SEC-H6): last-admin demotion protection pgTAP.
-- task-5 Step 7 Round-3 A MEDIUM-N2: BEFORE DELETE trigger の case 追加 (case 6-7、plan 5→7)。
-- task-5 Step 7 Round-5 D MEDIUM-1: trigger function を SECURITY DEFINER 化。
--   既存 7 case は behavior preserving (SECURITY DEFINER は trigger 内 SELECT COUNT(*) のみに影響、
--   UPDATE / DELETE 本体は引き続き invoker の RLS context で実行されるため case 5 等は変わらず PASS)。
--   case 5 が非 admin invoker での RLS reject (UPDATE 0 row) を既に検証しているため、
--   SECURITY DEFINER 昇格による「invoker 関係なく真の admin 総数で trigger 判定」効果は
--   case 1 / case 6 の throws_ok が引き続き SQLSTATE 23514 を要求する点で間接検証される。
--
-- これは RED scaffold である (期待される DB trigger 動作を文書化する目的)。
-- 実行には Step 3 migration (002-005) + 009_last_admin_protection.sql が apply 済であること
-- + local Supabase stack (supabase start) + pgTAP extension が必要。
-- 本 Step では実行しない (NO Supabase env、db push / pgTAP 実行は Step 8 DB-apply gate に deferred、
--  audit_log_actor_integrity / domain_check_hook / jwt_custom_claim / rls_policies と同条件)。
--
-- 起源: docs/draft/08_auth-sso-admin-review.md SEC-H6 / task-5 Step 7 Round-1 HIGH B SEC-H6。
--   admin self-demote / last-admin lockout 防止の 3 層防護 (DB / API / Test) の DB+Test 層検証。
--
-- 検証する 7 ケース:
--   case 1: 最後の admin を demote 試行 → reject (DB trigger が EXCEPTION)                    → 1
--   case 2: 2 人 admin 中の 1 人を demote → accept (admin 1 人残るので OK)                     → 1
--   case 3: self-demote (admin が自分を member に) → DB trigger は self check しない (role 数のみ) → 1
--           (admin 総数が 1 の self-demote は case 1 と同等に reject される。
--            admin 総数が 2 以上の self-demote は trigger 上は accept、self check は API 層担当)
--   case 4: admin が他 admin (≠ self) を demote (admin 総数 2 以上) → accept                  → 1
--   case 5: non-admin が他 admin を demote 試行 → 既存 RLS (users_update_admin) で reject     → 1
--          (本 trigger 配線後も既存 25 policy の用途は変わらない、回帰 guard)
--   case 6: 最後の admin を DELETE 試行 → reject (BEFORE DELETE trigger が EXCEPTION)         → 1
--           (Round-3 A MEDIUM-N2: DELETE 経路も admin 0 lockout を防ぐ)
--   case 7: 2 人 admin 中の 1 人を DELETE → accept (admin 1 人残るので OK)                    → 1
--   ─────────────────────────────────────────
--   plan 合計                                                                                → 7

BEGIN;

SELECT plan(7);

-- ============================================================================
-- fixture: admin / member の test user を auth.users + public.users へ用意。
-- public.users.id は auth.users(id) ON DELETE CASCADE への FK のため
-- auth.users seed を先に投入する (FK 制約: users_id_fkey 違反防止)。
-- member の UUID literal は元 'm1'/'m2' (invalid 16 進数) を 'b1'/'b2' に修正 (Step 8 Phase B)。
-- ============================================================================
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin-one@classlab.co.jp',   now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin-two@classlab.co.jp',   now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'member-one@classlab.co.jp',  now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b2', 'member-two@classlab.co.jp',  now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- 006 signup trigger が auto-propagate するため ON CONFLICT DO UPDATE で role 上書き。
INSERT INTO public.users (id, email, status, role, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin-one@classlab.co.jp',   'active', 'admin',  now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', 'admin-two@classlab.co.jp',   'active', 'admin',  now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', 'member-one@classlab.co.jp',  'active', 'member', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', 'member-two@classlab.co.jp',  'active', 'member', now(), now())
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      status = EXCLUDED.status,
      role = EXCLUDED.role,
      updated_at = now();

-- ============================================================================
-- case 1: 最後の admin を demote 試行 → reject
--
-- precondition: admin-one + admin-two の 2 人 admin がいる状態から、まず admin-two を delete し
--   admin が 1 人 (admin-one) のみになった状態を作る。
-- 操作:        admin-one (= 唯一の admin) を member に demote しようとする。
-- 期待:        DB trigger prevent_last_admin_demotion が EXCEPTION (SQLSTATE 23514) を投げる。
--
-- 注意:        DELETE は trigger 対象外 (delete でも admin が 0 になるが本 task は UPDATE 防護のみ)。
--             admin 0 を作る経路は別途規範化対象 (本 task は role 変更による lockout のみカバー)。
-- ============================================================================
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-0000000000a2';

SELECT throws_ok(
  $q$
    UPDATE public.users
    SET role = 'member'
    WHERE id = '00000000-0000-0000-0000-0000000000a1'
  $q$,
  '23514',  -- check_violation (prevent_last_admin_demotion の RAISE ERRCODE)
  NULL,     -- message regex: NULL = 内容不問 (message は 'Cannot demote the last admin...' 形式)
  'case 1: 最後の admin を demote しようとすると DB trigger が EXCEPTION (SQLSTATE 23514) で reject'
);

-- case 1 で trigger が発火し UPDATE が rollback された (本 transaction では admin-one は admin のまま)。
-- case 2 用に admin-two を再投入する (case 1 で delete した分)。
INSERT INTO public.users (id, email, status, role, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'admin-two@classlab.co.jp', 'active', 'admin', now(), now());

-- ============================================================================
-- case 2: 2 人 admin 中の 1 人を demote → accept
--
-- precondition: admin-one + admin-two の 2 人 admin がいる状態 (case 1 後に restore 済)。
-- 操作:        admin-two を member に demote。
-- 期待:        admin-one が残るので trigger は素通り、UPDATE 成功 (admin-two.role = 'member')。
-- ============================================================================
UPDATE public.users
SET role = 'member'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-0000000000a2'),
  'member',
  'case 2: 2 人 admin 中の 1 人 (admin-two) の demote は trigger 通過、UPDATE 成功 (role=member)'
);

-- case 3 用に admin-two を admin に戻す (admin 総数を 2 に restore)。
UPDATE public.users
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- ============================================================================
-- case 3: DB trigger は self check しない (role 数のみ判定)
--
-- 起源:        本 task の規範 (B SEC-H6) は DB layer = role 数 / API layer = self check の分業。
-- precondition: admin-one + admin-two の 2 人 admin (admin 総数 2)。
-- 操作:        admin-one (= 仮想の "self" user) を member に demote。
--             DB trigger は session の auth.uid() を見ない (RLS / API 層が見る)。
-- 期待:        admin 総数 2 → 1 でも admin が 1 人残るので trigger 通過、UPDATE 成功。
--             (admin 総数 1 のときに同じ操作をすると case 1 と同じく reject される、
--              これは self / other の区別なく一律に role 数のみで判定するため)
-- 注意:        本 case が示すのは「DB trigger が self を区別しない」という設計判断であり、
--             self-demote の最終防止は API layer (changeUserRoleAction) が担当する (規範通り)。
-- ============================================================================
UPDATE public.users
SET role = 'member'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-0000000000a1'),
  'member',
  'case 3: DB trigger は self check しない (admin 2 → 1 への self-demote は role 数判定上は accept、self check は API 層担当)'
);

-- case 4 用に admin-one を admin に戻す (admin 総数を 2 に restore)。
UPDATE public.users
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

-- ============================================================================
-- case 4: admin が他 admin (≠ self) を demote (admin 総数 2 以上) → accept
--
-- precondition: admin-one + admin-two の 2 人 admin (admin 総数 2)。
-- 操作:        admin-two を viewer に demote (admin 同士の demote 操作)。
-- 期待:        admin-one が残るので trigger 通過、UPDATE 成功 (admin-two.role = 'viewer')。
--             member 以外の role (viewer) への demote でも同じ判定が働くことの回帰 guard。
-- ============================================================================
UPDATE public.users
SET role = 'viewer'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

SELECT is(
  (SELECT role::text FROM public.users WHERE id = '00000000-0000-0000-0000-0000000000a2'),
  'viewer',
  'case 4: admin が他 admin を viewer に demote (admin 総数 2 → 1) は trigger 通過、UPDATE 成功 (role=viewer)'
);

-- case 5 用に admin-two を admin に戻す (admin 総数を 2 に restore)。
UPDATE public.users
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- ============================================================================
-- case 5: non-admin が他 admin を demote 試行 → 既存 RLS (users_update_admin) で reject
--
-- 起源:        既存 25 RLS policy の users_update_admin (admin のみ public.users UPDATE 可) が
--             本 trigger 追加後も維持されていることの回帰 guard。
-- precondition: admin-one + admin-two の 2 人 admin + member-one がいる。
-- 操作:        member-one (non-admin) として認証 context を作り、admin-two の role を member に
--             変更しようとする。
-- 期待:        UPDATE 件数 = 0 (RLS が WHERE 句に false を足して 0 row match 扱い)。
--             SQL 自体は成功するが、affected row = 0 となるのが PostgreSQL RLS の挙動。
-- 注意:        RLS は throws_ok ではなく affected row count で検証する (audit_log_actor_integrity
--             case 5 と異なるのは、users_update_admin は SELECT を許可しているため row 自体は見える
--             点。WITH CHECK 違反は EXCEPTION だが USING 違反は silent 0 row)。
-- ============================================================================
SET LOCAL role TO authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}',
  true
);

-- member-one (non-admin) として admin-two の demote を試行。
-- RLS users_update_admin の USING (is_admin()) が false を返すため、UPDATE 対象 0 row。
WITH affected AS (
  UPDATE public.users
  SET role = 'member'
  WHERE id = '00000000-0000-0000-0000-0000000000a2'
  RETURNING id
)
SELECT is(
  (SELECT count(*)::integer FROM affected),
  0,
  'case 5: non-admin (member) が admin の demote を試行しても RLS users_update_admin が 0 row 扱いで reject (回帰 guard)'
);

RESET role;
SELECT set_config('request.jwt.claims', NULL, true);

-- ============================================================================
-- case 6: 最後の admin を DELETE 試行 → reject (BEFORE DELETE trigger)
--
-- task-5 Step 7 Round-3 A MEDIUM-N2: DELETE 経路でも admin 0 状態 lockout を防ぐ。
-- precondition: admin-one + admin-two の 2 人 admin がいる状態から、admin-two を先に
--   member に demote し、admin が 1 人 (admin-one) のみになった状態を作る。
-- 操作:        admin-one (= 唯一の admin) を DELETE しようとする。
-- 期待:        DB trigger prevent_last_admin_deletion が EXCEPTION (SQLSTATE 23514) を投げる。
-- ============================================================================
-- case 5 後: admin-two は case 5 で member demote が 0 row だったため admin のまま。
-- admin-two を demote して admin 1 人状態を作る。
UPDATE public.users
SET role = 'member'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

SELECT throws_ok(
  $q$
    DELETE FROM public.users
    WHERE id = '00000000-0000-0000-0000-0000000000a1'
  $q$,
  '23514',  -- check_violation (prevent_last_admin_deletion の RAISE ERRCODE)
  NULL,     -- message regex: NULL = 内容不問
  'case 6: 最後の admin を DELETE しようとすると BEFORE DELETE trigger が EXCEPTION (SQLSTATE 23514) で reject'
);

-- case 6 で DELETE が reject された (admin-one はまだ存在)。
-- case 7 用に admin-two を admin に戻す。
UPDATE public.users
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- ============================================================================
-- case 7: 2 人 admin 中の 1 人を DELETE → accept (admin 1 人残るので OK)
--
-- precondition: admin-one + admin-two の 2 人 admin がいる状態 (case 6 後に restore 済)。
-- 操作:        admin-two を DELETE。
-- 期待:        admin-one が残るので BEFORE DELETE trigger は素通り、DELETE 成功。
--             (行が消えているため SELECT 結果が NULL になる)
-- ============================================================================
DELETE FROM public.users
WHERE id = '00000000-0000-0000-0000-0000000000a2';

SELECT is(
  (SELECT id::text FROM public.users WHERE id = '00000000-0000-0000-0000-0000000000a2'),
  NULL,
  'case 7: 2 人 admin 中の 1 人 (admin-two) の DELETE は trigger 通過、DELETE 成功 (行が消える)'
);

SELECT * FROM finish();

ROLLBACK;
