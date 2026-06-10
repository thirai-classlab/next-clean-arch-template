-- supabase/migrations/007_jwt_custom_claim.sql
-- task-5 Step 4: 3 Role JWT custom claim hook (draft 08 §Phase 4 / Step 4.1).
--
-- 目的:
--   Supabase Auth が access_token (JWT) を発行する直前に呼ぶ custom_access_token_hook を定義し、
--   public.users.role / status を JWT の claims に user_role / user_status として注入する。
--   これにより RLS policy (auth.jwt() ->> 'user_role') と API / middleware の role 判定で
--   1 source of truth (public.users) を JWT 経由で参照できるようになる。
--
-- Supabase custom_access_token_hook contract (公式):
--   - 入力 event jsonb: { "user_id": "<uuid>", "claims": { ... 既存 claims ... }, ... }
--   - 出力       jsonb: 同形 event。claims を加工して返すと Supabase Auth がそれを JWT に焼き込む。
--   - 必ず event 全体 (claims を含む) を返す。claims のみ返すと token が壊れる。
--   - SECURITY DEFINER で function 所有者 (postgres) 権限で実行され、public.users を RLS バイパスで読む。
--   - 呼び出し元は supabase_auth_admin ロールのため、後述の GRANT が必須。
--
-- SET search_path = public: search_path injection 防止 (SECURITY DEFINER の鉄則、006 と同方針)。
-- STABLE: 同一 token 発行内で結果不変 (副作用なし、planner ヒント、draft 08 §4.1)。
--
-- 依存 (本 migration では未定義、Step 3 の 002_users_table.sql で作成済):
--   - public.users (id, role user_role, status user_status, ...) ← 002_users_table.sql
--   本 migration は AFTER 番号 (007) のため apply 順序上は上記が先に存在する。
--   scaffold 段階では本 file 単体 apply は不可 (EXPECTED、002-006 と同様)。
--
-- ⚠️ user-manual step (本 SQL の apply だけでは hook は有効化されない):
--   Supabase Dashboard > Authentication > Hooks > Custom Access Token で
--   public.custom_access_token_hook を選択して enable するか、
--   config.toml の [auth.hook.custom_access_token] enabled = true / uri = "pg-functions://postgres/public/custom_access_token_hook"
--   を設定する必要がある。本 migration は function 定義 + GRANT のみを scaffold する。

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- event から認証中 user の id と既存 claims を取り出す。
  v_user_id uuid := (event ->> 'user_id')::uuid;
  v_claims  jsonb := event -> 'claims';
  v_role    text;
  v_status  text;
BEGIN
  -- public.users から role / status を読む (SECURITY DEFINER で RLS バイパス)。
  SELECT role::text, status::text
    INTO v_role, v_status
  FROM public.users
  WHERE id = v_user_id;

  -- projection 行が未作成 (signup hook 実行前の極短い window 等) の場合の安全側 default。
  -- viewer / pending を注入することで「role 不明 = 最小権限」を保証する。
  IF v_role IS NULL THEN
    v_role := 'viewer';
    v_status := 'pending';
  END IF;

  -- claims に user_role / user_status を注入。
  -- jsonb_set で既存 claims を保ったまま 2 key を追加 / 上書きする。
  v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_role));
  v_claims := jsonb_set(v_claims, '{user_status}', to_jsonb(v_status));

  -- event 全体を返す (claims を差し替えた形)。claims のみ返すと token が壊れるため必ず event を返す。
  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'task-5 Step 4: Supabase custom_access_token_hook。public.users.role/status を JWT claims (user_role/user_status) に注入する。Dashboard / config.toml で hook enable が user-manual で必要。';

-- Supabase Auth (supabase_auth_admin ロール) が本 hook を実行できるよう EXECUTE を GRANT する (draft 08 §4.1)。
-- authenticated / anon / public からは REVOKE して、一般 client から hook を直接呼べないようにする
-- (hook は Auth 内部からのみ呼ばれるべきで、claims 偽装の入口にしない)。
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
