-- supabase/migrations/003_allowed_users_table.sql
-- task-5 Step 3 (draft 08 §Phase 3 / Step 3.2, 3.4-3.8): allowed_users + domain tables の table 定義。
--
-- 本 file の対象 table (draft 08 §3 の 8 table のうち users / audit_log を除く 6 table):
--   - public.allowed_users   (admin allow list、Step 3.2)        ← 006 が pattern_type / pattern_value / default_role 参照
--   - public.bots            (Recall.ai bot lifecycle、Step 3.4)
--   - public.recordings      (signed URL + expires、Step 3.5)
--   - public.transcripts     (bot transcript、Step 3.6)
--   - public.calendar_events (Recall calendar 連携、Step 3.7)
--   - public.webhook_events  (idempotency、Step 3.8)
--
-- 006 との整合性 (必須):
--   public.allowed_users は 006 の EXISTS サブクエリで以下を参照する:
--     WHERE (pattern_type = 'email'  AND pattern_value = v_email)
--        OR (pattern_type = 'domain' AND pattern_value = v_domain)
--   かつ SELECT coalesce(default_role::text, 'viewer') ... で default_role を参照。
--   → pattern_type は 'email' / 'domain' の 2 値、pattern_value は text、default_role は user_role。
--
-- C-01 (draft 08): pattern_value は必ず LOWER(TRIM()) で格納する (CHECK constraint で強制)。
--   006 の比較が LOWER(TRIM(NEW.email)) と一致するため、allow list 側も正規化必須。
--
-- 依存: 002 (public.users / user_role enum)。allowed_users.added_by が public.users(id) を参照。
-- RLS policy 本体 + index の一部は 005_rls_policies.sql で集約。本 file は table + index + ENABLE。
-- 本 migration は committable scaffold (実 apply は Supabase env 整備後)。

-- allowed_users の pattern 種別 (draft 08 §3.2)。
CREATE TYPE allowed_pattern_type AS ENUM ('email', 'domain');

-- ============================================================================
-- public.allowed_users: admin allow list (非 classlab domain の自動 active 化登録)
-- ============================================================================
CREATE TABLE public.allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type allowed_pattern_type NOT NULL,
  -- C-01: 格納値は必ず正規化済 (LOWER + TRIM)。006 の v_email / v_domain と一致させる。
  pattern_value text NOT NULL CHECK (pattern_value = lower(trim(pattern_value))),
  default_role user_role NOT NULL DEFAULT 'viewer',
  added_by uuid NOT NULL REFERENCES public.users(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (pattern_type, pattern_value)
);

-- 006 の EXISTS サブクエリ (pattern_type + pattern_value 一致) を高速化。
CREATE INDEX idx_allowed_users_lookup ON public.allowed_users(pattern_type, pattern_value);

ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- public.bots: Recall.ai bot lifecycle (draft 08 §3.4)
-- ============================================================================
CREATE TABLE public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recall_bot_id text UNIQUE,            -- Recall.ai 側 bot ID
  meeting_url text NOT NULL,
  meeting_platform text NOT NULL,       -- 'zoom' | 'meet' | 'teams' | etc
  status text NOT NULL DEFAULT 'created',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  left_at timestamptz
);

CREATE INDEX idx_bots_owner ON public.bots(owner_id);
CREATE INDEX idx_bots_status ON public.bots(status);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- public.recordings: bot の録画 (draft 08 §3.5)
-- ============================================================================
CREATE TABLE public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  recording_url text,
  duration_seconds integer,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_recordings_bot ON public.recordings(bot_id);

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- public.transcripts: 録画の文字起こし (draft 08 §3.6)
-- ============================================================================
CREATE TABLE public.transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'ja',
  full_text text,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{speaker, start, end, text}]
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transcripts_recording ON public.transcripts(recording_id);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- public.calendar_events: Recall calendar 連携 (draft 08 §3.7)
-- ============================================================================
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recall_event_id text UNIQUE,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  meeting_url text,
  bot_id uuid REFERENCES public.bots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_user ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_time);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- public.webhook_events: Recall.ai webhook idempotency (draft 08 §3.8)
-- ============================================================================
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,             -- 例: 'bot.status_change'
  payload jsonb NOT NULL,
  signature text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX idx_webhook_events_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_events_received ON public.webhook_events(received_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
