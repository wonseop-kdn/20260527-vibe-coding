-- ============================================================
--  사업관리시스템 Supabase Schema
--  Supabase > SQL Editor에 전체 복사 후 실행하세요
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. 프로젝트 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT    NOT NULL,
  client        TEXT,
  manager       TEXT,
  amount        BIGINT  DEFAULT 0,
  contract_date DATE,
  deadline      DATE,
  status        TEXT    DEFAULT '진행중' CHECK (status IN ('대기','진행중','완료','보류')),
  current_phase TEXT    DEFAULT '수주'  CHECK (current_phase IN ('수주','발주','청구')),
  memo          TEXT,
  spec_text     TEXT,
  spec_analysis JSONB   DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. 프로세스 단계 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS steps (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       UUID    REFERENCES projects(id) ON DELETE CASCADE,
  phase            TEXT    NOT NULL CHECK (phase IN ('수주','발주','청구')),
  name             TEXT    NOT NULL,
  document_type    TEXT,
  direction        TEXT    DEFAULT 'internal' CHECK (direction IN ('outgoing','incoming','internal')),
  category         TEXT,
  approver         TEXT,
  approval_level   TEXT,
  requires_audit   BOOLEAN DEFAULT FALSE,
  regulation_ref   TEXT,
  is_conditional   BOOLEAN DEFAULT FALSE,
  condition_desc   TEXT,
  done             BOOLEAN DEFAULT FALSE,
  done_at          TIMESTAMPTZ,
  due_date         DATE,
  notes            TEXT,
  order_index      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. 사규 / 규정 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT,
  file_name   TEXT,
  file_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. 결재 규정 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_rules (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type    TEXT    NOT NULL,
  description      TEXT,
  amount_min       BIGINT  DEFAULT 0,
  amount_max       BIGINT,                    -- NULL = 상한 없음
  approver         TEXT    NOT NULL,
  approval_level   TEXT,
  requires_audit   BOOLEAN DEFAULT FALSE,
  regulation_id    UUID    REFERENCES regulations(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. 기본 템플릿 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  is_default  BOOLEAN DEFAULT FALSE,
  steps       JSONB   NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. 알림 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID    REFERENCES projects(id) ON DELETE CASCADE,
  step_id     UUID    REFERENCES steps(id)    ON DELETE CASCADE,
  type        TEXT    DEFAULT 'info' CHECK (type IN ('info','warning','danger','success')),
  title       TEXT    NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS (내부 도구 — 전체 허용) ────────────────────────────
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON projects       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON steps          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON regulations    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON approval_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON templates      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON notifications  FOR ALL USING (true) WITH CHECK (true);

-- ── 인덱스 ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_steps_project  ON steps(project_id);
CREATE INDEX IF NOT EXISTS idx_steps_phase    ON steps(phase);
CREATE INDEX IF NOT EXISTS idx_steps_due      ON steps(due_date);
CREATE INDEX IF NOT EXISTS idx_notif_project  ON notifications(project_id);

-- ── updated_at 트리거 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();
