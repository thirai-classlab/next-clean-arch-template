-- supabase/migrations/006_auth_hook_domain_check.sql
-- task-5 Step 2: Domain check Auth Hook (draft 08 §Phase 2 / Step 2.1-2.2).
--
-- 目的:
--   Google OAuth で auth.users に行が INSERT された直後に、email の domain を判定して
--   public.users projection 行を作成し、status (active / pending) と default role を決定する。
--   全判定結果を public.audit_log に記録する (log_audit_event 経由)。
--
-- 3-branch ロジック:
--   (1) domain == 'classlab.co.jp'                 → status='active', role='member'  (社内 SSO 自動承認)
--   (2) public.allowed_users に email / domain 一致 → status='active', role=該当 entry の default_role
--   (3) 上記いずれも該当しない                       → status='pending', role='viewer' (admin 承認待ち)
--
-- 依存 (本 migration では未定義、Step 3 の migration 002-005 で作成される前提):
--   - public.users           (id, email, status, role, created_at, updated_at)  ← 002_users_table.sql
--   - public.allowed_users   (pattern_type, pattern_value, default_role)         ← 003_allowed_users_table.sql
--   - public.audit_log + public.log_audit_event()                                ← 004_audit_logs_table.sql
--   本 migration は AFTER 番号 (006) のため、apply 順序上は上記が先に存在する。
--   scaffold 段階 (Step 3 未完) では本 file 単体 apply は不可 (EXPECTED)。
--
-- SECURITY DEFINER: function 所有者 (postgres) 権限で実行され、RLS をバイパスして
--   public.users / public.audit_log へ INSERT する。WITH CHECK(false) policy 下でも
--   SECURITY DEFINER 経由なら INSERT 可能 (draft 08 C-02 設計)。
-- SET search_path = public: search_path injection 防止 (SECURITY DEFINER の鉄則)。

CREATE OR REPLACE FUNCTION public.signup_check_classlab_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- C-01: LOWER/TRIM 正規化を関数冒頭で実施し、大小文字混在 (@CLASSLAB.CO.JP) や
  --       末尾空白 (@classlab.co.jp ) による pending 誤分類を防ぐ。
  --       allowed_users.pattern_value も LOWER(TRIM()) で格納される (CHECK constraint、Step 3)。
  v_email        text := lower(trim(NEW.email));
  v_domain       text := split_part(v_email, '@', 2);
  v_status       text := 'pending';
  v_default_role text := 'viewer';
BEGIN
  -- branch (1): @classlab.co.jp は社内 SSO として自動 active + member role。
  --             サブドメイン (@sub.classlab.co.jp) は別 domain 扱いで自動 active 対象外 (draft 08 M-01)。
  IF v_domain = 'classlab.co.jp' THEN
    v_status := 'active';
    v_default_role := 'member';

  -- branch (2): allow list に email 完全一致 or domain 一致がある場合は active 化。
  --             default_role が指定されていればそれを採用、無ければ viewer。
  ELSIF EXISTS (
    SELECT 1
    FROM public.allowed_users
    WHERE (pattern_type = 'email'  AND pattern_value = v_email)
       OR (pattern_type = 'domain' AND pattern_value = v_domain)
  ) THEN
    v_status := 'active';
    SELECT coalesce(default_role::text, 'viewer')
      INTO v_default_role
    FROM public.allowed_users
    WHERE (pattern_type = 'email'  AND pattern_value = v_email)
       OR (pattern_type = 'domain' AND pattern_value = v_domain)
    LIMIT 1;

  -- branch (3): 上記いずれも該当しない外部 domain → pending (admin 承認待ち)。
  --             v_status / v_default_role は宣言時の default (pending / viewer) のまま。
  END IF;

  -- public.users に projection 行を作成。
  -- ON CONFLICT (id) DO NOTHING: 同一 auth.users.id で trigger が二重発火しても冪等。
  INSERT INTO public.users (id, email, status, role, created_at, updated_at)
  VALUES (NEW.id, v_email, v_status::user_status, v_default_role::user_role, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- audit log: signup と domain-check の判定結果を記録。
  -- log_audit_event() は SECURITY DEFINER 経由で audit_log へ INSERT する (draft 08 M-05)。
  PERFORM public.log_audit_event(
    NEW.id,
    'user.signup',
    'user',
    NEW.id,
    jsonb_build_object(
      'email',  v_email,
      'domain', v_domain,
      'status', v_status,
      'role',   v_default_role
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.signup_check_classlab_domain() IS
  'task-5 Step 2: AFTER INSERT ON auth.users trigger function. classlab.co.jp 自動 active / allow_list 一致 active / 他 pending を判定し public.users projection + audit_log を作成する。';

-- AFTER INSERT trigger: auth.users への row 追加 (Google OAuth サインアップ) 完了後に発火。
-- FOR EACH ROW: 1 user ごとに 1 回実行。
-- 冪等のため DROP IF EXISTS してから CREATE (再 apply / supabase db reset 対応)。
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.signup_check_classlab_domain();
