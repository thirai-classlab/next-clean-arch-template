-- supabase/migrations/010_domain_hook_config.sql
-- P5-R1 HIGH: signup domain hook の primary domain を config row で parameterize する。
--
-- 背景:
--   006_auth_hook_domain_check.sql の signup_check_classlab_domain() は
--   `IF v_domain = 'classlab.co.jp'` を hardcode しており、template を非 classlab org へ
--   deploy するには migration file の手編集が必要だった (downstream-use breaking)。
--   TypeScript 側は ALLOWED_ADMIN_EMAIL_DOMAIN (scripts/env-schema.ts D-H-01) で
--   既に動的化済のため、SQL 側にも対になる config 経路を導入して parity を取る。
--
-- 本 migration の内容:
--   (1) public.hook_config — trigger / hook が runtime に読む key-value config table
--   (2) 変更監査 trigger: hook_config への INSERT / UPDATE を audit_log に記録
--       (action='config.domain_changed'、P5 review HIGH: silent mutation の forensic trail)
--   (3) seed: key='allowed_email_domain', value='classlab.co.jp'
--       (既定値は従来挙動を保存。再 apply 時は ON CONFLICT DO NOTHING で既存値を尊重
--        = row 不書込 → trigger 不発 → audit row も重複しない)
--   (4) signup_check_classlab_domain() を config-row 駆動の実装で CREATE OR REPLACE
--       (function 名は migration 履歴 / pgTAP 互換のため 006 のまま維持)
--
-- 設定経路 (seeding contract):
--   scripts/setup-supabase.sh Phase 6b が env AUTH_ALLOWED_EMAIL_DOMAIN から upsert する。
--   - env 未設定          → 既存 row 維持 (本 migration の既定 'classlab.co.jp')
--   - env 設定 (非空)     → その domain を primary domain として upsert (先頭 '@' は strip)
--   - env 設定 (空文字)   → value='' = 「domain 制約なし」 (全 domain が branch (1) で auto-active。
--                           NextAuth 側 ALLOWED_ADMIN_EMAIL_DOMAIN 未指定 = 制約なし、と同一 semantics)
--
-- 冪等性 (P5-R2): 全 DDL は IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE guard 付き。

-- ============================================================================
-- (1) public.hook_config
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hook_config (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hook_config IS
  'P5-R1: DB trigger / auth hook が runtime に読む key-value config。書込経路は migration seed + setup-supabase.sh Phase 6b (postgres / service_role、RLS バイパス) のみ。変更は on_hook_config_change trigger が audit_log に記録する。';
COMMENT ON COLUMN public.hook_config.value IS
  'key=allowed_email_domain: signup 時に auto-active + member role を与える primary domain (lower/trim 正規化済、@ なし)。空文字 = 制約なし (全 domain auto-active)。';

-- RLS: admin のみ SELECT 可 (可視化用)。INSERT/UPDATE/DELETE policy は定義しない = default deny。
-- 実書込は postgres (migration / setup script) と service_role が RLS バイパスで行う。
-- (SELECT ...) initplan wrapper は 005 の P5-R3 方針に従う。
ALTER TABLE public.hook_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hook_config_select_admin ON public.hook_config;
CREATE POLICY hook_config_select_admin ON public.hook_config
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- ============================================================================
-- (2) hook_config 変更監査 trigger (P5 review HIGH)
-- ============================================================================
-- hook_config は migration seed / setup-supabase.sh Phase 6b / service_role から
-- 書込まれるが、変更履歴が audit_log に残らないと allowed_email_domain が
-- silent に変わり得る (signup 毎の audit row に resolved primary_domain は載るが、
-- config row 自体の change event の代替にはならない)。INSERT / UPDATE を
-- AFTER trigger で log_audit_event() (004) に記録し forensic trail を確保する。
--   - action='config.domain_changed' (現状 key は allowed_email_domain のみ。
--     将来 key が増えたら payload.key で判別する)
--   - actor_id: system context (migration / postgres / setup script) では auth.uid() が
--     NULL のため NULL で記録。authenticated 経由なら SEC-1 解決則で auth.uid() が優先。
--   - target_id: audit_log.target_id は uuid 型のため NULL とし、text PK (key) は
--     payload 側に記録する。
--   - FAIL-CLOSED: log_audit_event 失敗時は config 書込ごと ROLLBACK
--     (security > availability、006/010 の FAILURE MODE 方針と同一)。
--   - 冪等性: seed の ON CONFLICT DO NOTHING / 同値 upsert skip では row が書かれず
--     trigger 不発 = 再 apply で audit row は重複しない。
CREATE OR REPLACE FUNCTION public.log_hook_config_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NULL,                      -- system context (auth.uid() があれば SEC-1 でそちらが記録される)
    'config.domain_changed',
    'hook_config',
    NULL,                      -- target_id は uuid 型のため text PK (key) は payload で記録
    jsonb_build_object(
      'key',       NEW.key,
      'old_value', CASE WHEN TG_OP = 'UPDATE' THEN OLD.value ELSE NULL END,
      'new_value', NEW.value,
      'op',        TG_OP
    )
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_hook_config_change() IS
  'P5 review HIGH (010): hook_config の INSERT/UPDATE を audit_log に action=config.domain_changed で記録する AFTER trigger function。old_value/new_value/op を payload に保存 (forensic trail)。';

-- trigger 経由専用 function のため直接 EXECUTE は不許可 (004 の REVOKE 方針と対称)。
REVOKE EXECUTE ON FUNCTION public.log_hook_config_change() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS on_hook_config_change ON public.hook_config;
CREATE TRIGGER on_hook_config_change
  AFTER INSERT OR UPDATE ON public.hook_config
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hook_config_change();

-- ============================================================================
-- (3) seed (従来挙動の保存。既存 deployment の値は上書きしない)
-- ============================================================================
-- trigger (2) より後段のため、初回 seed も audit_log に記録される (op=INSERT)。
INSERT INTO public.hook_config (key, value)
VALUES ('allowed_email_domain', 'classlab.co.jp')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- (4) signup_check_classlab_domain() — config-row 駆動版で置換
-- ============================================================================
-- 006 の hardcode 版 (`IF v_domain = 'classlab.co.jp'`) を置き換える。
-- 3-branch ロジック / SECURITY DEFINER / search_path / 冪等 INSERT / audit_log は 006 と同一。
-- trigger (on_auth_user_created) は同名 function を指したままなので再作成不要。
--
-- ⚠ FAILURE MODE — FAIL-CLOSED (P5-R4、006 header の FAILURE MODE 注記と同一):
--   未処理例外は signup transaction ごと ROLLBACK され、全新規 signup が拒否される。
--   hook_config row 不在は例外にせず value='' (制約なし) と同等に扱う (config 欠落で
--   signup 全停止しない)。schema 不整合 (public.users / audit_log 破壊) は意図的に
--   fail-closed のまま (security > availability)。
CREATE OR REPLACE FUNCTION public.signup_check_classlab_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- C-01: LOWER/TRIM 正規化 (006 と同一)。
  v_email          text := lower(trim(NEW.email));
  v_domain         text := split_part(v_email, '@', 2);
  v_status         text := 'pending';
  v_default_role   text := 'viewer';
  v_primary_domain text;
BEGIN
  -- P5-R1: primary domain を config row から runtime 解決 (旧: 'classlab.co.jp' hardcode)。
  -- row 不在 (SELECT INTO が NULL のまま) は '' = 制約なし、と同等に扱う。
  SELECT lower(trim(value)) INTO v_primary_domain
  FROM public.hook_config
  WHERE key = 'allowed_email_domain';
  v_primary_domain := coalesce(v_primary_domain, '');

  -- branch (1): primary domain 一致 (または制約なし) → 自動 active + member role。
  --             サブドメインは別 domain 扱いで自動 active 対象外 (draft 08 M-01 を維持)。
  IF v_primary_domain = '' OR v_domain = v_primary_domain THEN
    v_status := 'active';
    v_default_role := 'member';

  -- branch (2): allow list に email 完全一致 or domain 一致がある場合は active 化。
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
  END IF;

  -- public.users projection (冪等: ON CONFLICT DO NOTHING、006 と同一)。
  INSERT INTO public.users (id, email, status, role, created_at, updated_at)
  VALUES (NEW.id, v_email, v_status::user_status, v_default_role::user_role, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- audit log (006 と同一、判定結果 + 解決済 primary_domain を記録)。
  PERFORM public.log_audit_event(
    NEW.id,
    'user.signup',
    'user',
    NEW.id,
    jsonb_build_object(
      'email',          v_email,
      'domain',         v_domain,
      'status',         v_status,
      'role',           v_default_role,
      'primary_domain', v_primary_domain
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.signup_check_classlab_domain() IS
  'P5-R1 (010): AFTER INSERT ON auth.users trigger function (config-row 駆動版)。public.hook_config(key=allowed_email_domain) の primary domain 一致で auto-active + member、allow_list 一致で active、他は pending。value 空文字 = 制約なし。FAIL-CLOSED: 未処理例外は signup transaction ごと ROLLBACK (006 header の FAILURE MODE 注記参照)。function 名は migration 履歴互換のため 006 のまま維持。';
