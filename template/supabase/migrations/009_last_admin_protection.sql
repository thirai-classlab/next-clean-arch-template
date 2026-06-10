-- supabase/migrations/009_last_admin_protection.sql
-- task-5 Step 7 Round-1 HIGH (B SEC-H6): last-admin demotion protection (DB layer).
--
-- 目的:
--   public.users.role を 'admin' から他 role に変更する UPDATE で、変更後に admin が
--   1 人も残らなくなる場合は EXCEPTION で reject し、admin 0 状態の lockout を構造的に防止する。
--   API layer (changeUserRoleAction) の self-demote guard と組み合わせた 3 層防護の DB 層担当。
--
-- 起源: docs/draft/08_auth-sso-admin-review.md / task-5 Step 7 Round-1 HIGH B SEC-H6。
--   admin が自分自身を demote すると admin 0 状態で誰も role 変更できなくなる lockout 事故
--   (race-safe には API 層単独では足りず、DB トランザクション内の trigger が必要)。
--
-- 設計判断 (race-safe / self check 分離):
--   - DB trigger は role 数のみ check し、self / other の区別はしない (auth.uid() に依存しない)。
--     → service_role / migration script / 内部バッチからの誤 demote も同様に防げる。
--   - self-demote (admin が自分自身を member に変更) は API layer (changeUserRoleAction) で reject。
--     → DB trigger の対象外 (DB layer は self check しない、テスト case 3 で明示)。
--   - admin 総数 1 のときの demote が DB trigger で reject される (case 1)。
--   - admin 総数 2 以上のときは他 admin の demote OK (case 2 / case 4)。
--
-- SECURITY DEFINER: 本 trigger function は SECURITY DEFINER で動作する (Round-5 D MEDIUM-1 修正)。
--   起源: task-5 Step 7 Round-4 C R4-MEDIUM-1。Round-1〜3 では INVOKER だったが、authenticated
--   non-admin user が DELETE / UPDATE を試行した際、SELECT COUNT(*) FROM public.users が invoker
--   (authenticator) の RLS context で実行され、users_select_admin (USING is_admin()) +
--   users_select_own (USING auth.uid() = id) policy の下で non-admin user は admin 行が見えず
--   count=0 を返す → IF v_admin_count <= 1 が常に true → EXCEPTION で reject される副作用は
--   保たれるが、より複雑な経路 (admin が自分のセッションで service_role を impersonate する場合や
--   将来 RLS policy が変更された場合) で count 不一致による誤判定リスクが残る。
--   defense-in-depth として SECURITY DEFINER に昇格し、function owner (postgres) の権限で
--   COUNT を実行することで RLS を bypass し真の admin 総数を取得する。
--
-- SET search_path = public, pg_temp: SECURITY DEFINER の必須対応 (search_path injection 防止)。
--   SECURITY DEFINER function は呼び出し元の search_path を継承するため、攻撃者が
--   search_path に malicious schema を先頭挿入すると意図しない関数/table が解決される。
--   `SET search_path = public, pg_temp` で固定化して injection 経路を遮断する。
--
-- 依存: 002 (public.users + user_role enum)。本 migration は public.users.role を参照する。
-- 本 migration は committable scaffold (実 apply は Supabase env 整備後、Step 8 で live verify)。

-- ============================================================================
-- prevent_last_admin_demotion(): BEFORE UPDATE trigger function
--
-- 発火条件: OLD.role = 'admin' AND NEW.role != 'admin' (admin → other への demote のみ)
-- 動作:     SELECT COUNT(*) FROM public.users WHERE role = 'admin' <= 1 なら EXCEPTION
--          → 「最後の admin」の demote を構造的に reject
-- 非対象:  OLD.role != 'admin' (member → admin promote 等) / OLD.role = NEW.role (no-op)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_last_admin_demotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_count integer;
BEGIN
  -- admin → other への demote のみ判定対象 (promote / 同一 role 更新は素通り)
  IF OLD.role = 'admin' AND NEW.role IS DISTINCT FROM OLD.role AND NEW.role <> 'admin' THEN
    -- 現在の admin 総数を取得 (UPDATE 前の状態: OLD 行はまだ admin としてカウントされる)
    -- SECURITY DEFINER により function owner (postgres) の権限で実行され RLS を bypass、
    -- non-admin invoker context でも真の admin 総数を取得できる (Round-5 D MEDIUM-1)。
    SELECT COUNT(*) INTO v_admin_count
    FROM public.users
    WHERE role = 'admin';

    -- demote 後に admin が 1 人未満になる場合は reject
    -- (現在 admin が 1 人のみで、その 1 人を demote しようとしている = 最後の admin)
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION
        'Cannot demote the last admin (user_id=%): system must retain at least 1 admin',
        OLD.id
        USING ERRCODE = '23514';  -- check_violation
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- trigger 配線: public.users の role 列 UPDATE 時に発火
--
-- BEFORE UPDATE OF role: role 列の変更を伴う UPDATE のみで発火 (email 更新等では発火しない、
--   無関係 trigger overhead 回避)。
-- FOR EACH ROW: 各 row ごとに発火 (bulk UPDATE でも 1 行ずつ判定)。
-- ============================================================================
DROP TRIGGER IF EXISTS prevent_last_admin_demotion_trigger ON public.users;
CREATE TRIGGER prevent_last_admin_demotion_trigger
  BEFORE UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_demotion();

-- ============================================================================
-- prevent_last_admin_deletion(): BEFORE DELETE trigger function
--
-- task-5 Step 7 Round-3 A MEDIUM-N2: BEFORE DELETE trigger 追加。
-- admin row を DELETE する経路でも admin 0 状態の lockout が起きうるため、
-- BEFORE UPDATE と同等の保護を DELETE にも適用する。
--
-- 発火条件: DELETE 対象行の role = 'admin'
-- 動作:     SELECT COUNT(*) FROM public.users WHERE role = 'admin' <= 1 なら EXCEPTION
-- 非対象:  role != 'admin' の row 削除 (member / viewer は素通り)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_count integer;
BEGIN
  -- admin row の DELETE のみ判定対象 (non-admin row は素通り)
  IF OLD.role = 'admin' THEN
    -- DELETE 前の admin 総数 (OLD 行はまだカウントされている)
    -- SECURITY DEFINER により function owner (postgres) の権限で実行され RLS を bypass、
    -- non-admin invoker context (RLS で admin 行が見えない) でも真の admin 総数を取得できる
    -- (Round-5 D MEDIUM-1: defense-in-depth、authenticated non-admin が DELETE 試行時の誤判定防止)。
    SELECT COUNT(*) INTO v_admin_count
    FROM public.users
    WHERE role = 'admin';

    -- 削除後に admin が 0 人になる場合は reject
    -- (現在 admin が 1 人のみで、その 1 人を DELETE しようとしている = 最後の admin)
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION
        'Cannot delete the last admin (user_id=%): system must retain at least 1 admin',
        OLD.id
        USING ERRCODE = '23514';  -- check_violation
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- trigger 配線: public.users の DELETE 時に発火
DROP TRIGGER IF EXISTS prevent_last_admin_deletion_trigger ON public.users;
CREATE TRIGGER prevent_last_admin_deletion_trigger
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_deletion();

-- ============================================================================
-- C-03 整合 + Round-5 D MEDIUM-1:
--   prevent_last_admin_demotion() / prevent_last_admin_deletion() は SECURITY DEFINER で動作。
--   trigger function は BEFORE UPDATE OF role / BEFORE DELETE で自動発火するため明示 EXECUTE GRANT は不要
--   (trigger は table の DML 権限を持つ session の DML 操作で発火し、function 自体への EXECUTE は不要)。
--
--   Owner 想定: postgres (Supabase migration 適用時の default owner)。owner 変更時は本 trigger も
--   再評価する (`ALTER FUNCTION ... OWNER TO ...` 実行時、SECURITY DEFINER の意味が変わるため)。
-- ============================================================================
