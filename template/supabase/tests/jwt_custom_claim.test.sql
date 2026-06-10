-- supabase/tests/jwt_custom_claim.test.sql
-- task-5 Step 4: pgTAP test scaffold for custom_access_token_hook() (RED)。
--
-- これは RED scaffold である (期待動作を文書化する目的)。
-- 実行には migration 002 (public.users + enum) + 007 (custom_access_token_hook) が apply 済であること
-- + local Supabase stack (supabase start) + pgTAP extension が必要。
-- 本 Step では実行しない (NO Supabase env、db push / pgTAP 実行は deferred)。
--
-- 検証する内容 (draft 08 §Phase 4 / Step 4.1):
--   (A) custom_access_token_hook(jsonb) function の存在                                →  1
--   (B) 既知 admin user の event を渡すと claims.user_role = 'admin' が注入される       →  1
--   (C) 既知 admin user の event を渡すと claims.user_status = 'active' が注入される    →  1
--   (D) projection 行が無い user では安全側 default (user_role='viewer')               →  1
--   (E) 既存 claims (sub / email 等) が保持される (claims を破壊しない)                 →  1
--   ─────────────────────────────────────────
--   plan 合計                                                                          →  5
--
-- GRANT (supabase_auth_admin への EXECUTE) の検証は Supabase env 上の役割が必要なため Step 8 に回す。

BEGIN;

SELECT plan(5);

-- (A) function の存在 ---------------------------------------------------------------------
SELECT has_function(
  'public', 'custom_access_token_hook', ARRAY['jsonb'],
  'custom_access_token_hook(jsonb) function が存在する'
);

-- fixture: admin user を auth.users + public.users へ用意 (signup hook 経由ではなく直接 INSERT)。
-- auth.users INSERT は on_auth_user_created trigger を発火させるため、まず classlab admin を作り
-- その後 role を admin へ昇格させる (projection 行は trigger が作成済)。
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin@classlab.co.jp');
UPDATE public.users
  SET role = 'admin', status = 'active'
  WHERE id = '00000000-0000-0000-0000-0000000000a1';

-- (B) claims.user_role = 'admin' --------------------------------------------------------
SELECT is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-0000000000a1',
      'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1')
    )
  ) #>> '{claims,user_role}',
  'admin',
  'admin user の event で claims.user_role = admin が注入される'
);

-- (C) claims.user_status = 'active' -----------------------------------------------------
SELECT is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-0000000000a1',
      'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1')
    )
  ) #>> '{claims,user_status}',
  'active',
  'admin user の event で claims.user_status = active が注入される'
);

-- (D) projection 行が無い user は安全側 default (viewer) --------------------------------
SELECT is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-0000000000ff',
      'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000ff')
    )
  ) #>> '{claims,user_role}',
  'viewer',
  'projection 行が無い user は user_role = viewer (最小権限 default)'
);

-- (E) 既存 claims が保持される ----------------------------------------------------------
SELECT is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-0000000000a1',
      'claims', jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'email', 'admin@classlab.co.jp')
    )
  ) #>> '{claims,email}',
  'admin@classlab.co.jp',
  '既存 claims (email) が hook 通過後も保持される'
);

SELECT * FROM finish();

ROLLBACK;
