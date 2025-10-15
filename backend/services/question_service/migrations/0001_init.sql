-- migrations/0001_init.sql
-- Question Service: initial schema + indexes

-- =========================
-- Core tables
-- =========================

CREATE TABLE IF NOT EXISTS questions (
  id             text PRIMARY KEY,
  title          text NOT NULL,
  body_md        text NOT NULL,
  difficulty     text NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  topics         jsonb NOT NULL DEFAULT '[]',              -- array of topic slugs
  attachments    jsonb NOT NULL DEFAULT '[]',
  status         text NOT NULL CHECK (status IN ('draft','published','archived')),
  version        int  NOT NULL DEFAULT 1,
  rand_key       double precision NOT NULL DEFAULT random(),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  tsv_en tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_md,''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS question_versions (
  id             text NOT NULL,
  version        int  NOT NULL,
  title          text NOT NULL,
  body_md        text NOT NULL,
  difficulty     text NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  topics         jsonb NOT NULL DEFAULT '[]',
  attachments    jsonb NOT NULL DEFAULT '[]',
  status         text NOT NULL CHECK (status IN ('draft','published','archived')),
  published_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (id, version)
);

CREATE TABLE IF NOT EXISTS session_reservations (
  session_id     text PRIMARY KEY,
  question_id    text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL
);

-- Canonical topic metadata (slug → display/color)
CREATE TABLE IF NOT EXISTS topics (
  slug        text PRIMARY KEY,           -- e.g. "graphs"
  display     text NOT NULL,              -- e.g. "Graphs"
  color_hex   text NOT NULL               -- e.g. "#5B8DEF"
);

-- Relational mirror for analytics/join-heavy use-cases
CREATE TABLE IF NOT EXISTS question_topics (
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  topic_slug  text NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
  PRIMARY KEY (question_id, topic_slug)
);

-- =========================
-- Triggers
-- =========================

-- Keep questions.updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================
-- Indexes
-- =========================

-- Hot read path: filter by status+difficulty and sort by updated_at DESC
CREATE INDEX IF NOT EXISTS idx_questions_status_diff_updated_desc
  ON questions (status, difficulty, updated_at DESC);

-- Random selection helper (avoid ORDER BY random())
CREATE INDEX IF NOT EXISTS idx_questions_rand_key
  ON questions (rand_key);

-- Topics jsonb filters (any/all)
CREATE INDEX IF NOT EXISTS idx_questions_topics_gin
  ON questions USING GIN (topics jsonb_path_ops);

-- Full-text search over title+body:
-- Partial index for Published content to keep it small & fast.
CREATE INDEX IF NOT EXISTS idx_questions_tsv_en_published
  ON questions USING GIN (tsv_en)
  WHERE status = 'Published';

-- Topic lookup convenience
CREATE INDEX IF NOT EXISTS idx_topics_color ON topics (color_hex);

-- =========================
-- Optional seed (comment out in prod)
-- =========================
-- INSERT INTO topics (slug, display, color_hex) VALUES
--   ('arrays', 'Arrays', '#FFB020'),
--   ('graphs', 'Graphs', '#5B8DEF')
-- ON CONFLICT (slug) DO NOTHING;
--
-- INSERT INTO questions (id, title, body_md, difficulty, topics, status)
-- VALUES
--   ('two-sum', 'Two Sum', 'Find two numbers…', 'Easy', '["arrays"]', 'published'),
--   ('graph-traversal', 'Graph Traversal', 'BFS/DFS…', 'Medium', '["graphs"]', 'published')
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO question_topics (question_id, topic_slug) VALUES
--   ('two-sum', 'arrays'),
--   ('graph-traversal', 'graphs')
-- ON CONFLICT DO NOTHING;
