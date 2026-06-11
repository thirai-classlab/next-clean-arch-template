-- supabase/migrations/002_users_table.sql
-- task-5 Step 3 (draft 08 §Phase 3 / Step 3.1): user_role / user_status enum + public.users projection table.
--
-- 目的:
--   auth.users (Supabase 標準) の projection として public.users を定義する。
--   006_auth_hook_domain_check.sql の signup_check_classlab_domain() trigger が
--   `INSERT INTO public.users (id, email, status, role, created_at, updated_at)
--    VALUES (NEW.id, v_email, v_status::user_status, v_default_role::user_role, ...)
--    ON CONFLICT (id) DO NOTHING` で参照するため、本 migration は 006 より先 (002) に apply される。
--
-- 006 との整合性 (必須):
--   - enum user_status は 'active' / 'pending' を含む (006 が v_status::user_status へ cast)
--   - enum user_role   は 'admin' / 'member' / 'viewer' を含む (006 が v_default_role::user_role へ cast)
--   - public.users.id は PRIMARY KEY (006 が ON CONFLICT (id) を使用)
--   - column 名は id / email / status / role / created_at / updated_at (006 の INSERT 列順と一致)
--
-- RLS policy 本体は 005_rls_policies.sql で集約定義する (本 file は ENABLE のみ)。
-- is_admin() helper も 005 で定義する (users_select_admin / users_update_admin が参照するため)。
--
-- scaffold 注記: 本 migration は committable scaffold である。実 apply (supabase db push) +
--   pgTAP 実行は Supabase env 整備後 (user manual) に行う。本 Step では apply しない。

-- 冪等性 (P5-R2 HIGH): supabase の migration history 経由の apply は 1 回限りだが、
--   `supabase db reset` 途中失敗後の再実行や、SQL file を既存 DB へ手動適用するケースで
--   duplicate-object error にならないよう、全 DDL に IF NOT EXISTS / 例外吸収 guard を付ける。
--   enum は CREATE TYPE IF NOT EXISTS が存在しないため DO ブロックで duplicate_object を吸収する。

-- enum: 3 role (draft 08 §3.1)
-- 順序は draft 08 の CREATE TYPE 定義に合わせる (admin / member / viewer)。
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- enum: user 承認 status (draft 08 §3.1)
-- pending = 承認待ち / active = 利用可 / suspended = 停止 (admin が拒否 or 凍結)。
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- public.users: auth.users の projection 行。
-- id は auth.users(id) への FK かつ PRIMARY KEY。auth.users 行削除時に CASCADE で同期削除。
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  display_name text,
  status user_status NOT NULL DEFAULT 'pending',
  role user_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- status / role での filter (admin panel の user 一覧 filter で使用、draft 08 §3.1)
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- RLS 有効化 (policy 本体は 005_rls_policies.sql)。
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
