-- ============================================================
-- KDN 사업관리 시스템 - Supabase Schema v2
-- ============================================================

-- ------------------------------------------------------------
-- 1. custom_notifications 테이블
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT,
  message       TEXT,
  scheduled_at  TIMESTAMPTZ,
  is_fired      BOOLEAN     DEFAULT FALSE,
  is_active     BOOLEAN     DEFAULT TRUE,
  project_id    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on custom_notifications"
  ON custom_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 2. feedback_requests 테이블
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_requests (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT  NOT NULL,
  description TEXT,
  priority    TEXT  DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status      TEXT  DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'done', 'rejected')),
  category    TEXT  DEFAULT '기능개선',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on feedback_requests"
  ON feedback_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. regulations 테이블에 컬럼 추가
-- ------------------------------------------------------------
ALTER TABLE regulations
  ADD COLUMN IF NOT EXISTS version    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
