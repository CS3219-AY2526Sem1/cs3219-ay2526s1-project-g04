-- 0002_add_attachments.sql
-- Create normalized attachments table + optional backfill

CREATE TABLE IF NOT EXISTS attachments (
  id          BIGSERIAL PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  object_key  TEXT NOT NULL,              -- S3 key like "q/{id}/img1.png"
  mime        TEXT,
  byte_size   INT,
  alt         TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate keys per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_attachments_question_key
  ON attachments (question_id, object_key);

-- ---------- backfill from questions.attachments JSON ----------
-- Expect each JSON object to look like:
-- { "object_key": "...", "mime": "...", "byte_size": 123, "alt": "diagram" }

WITH j AS (
  SELECT
    q.id AS question_id,
    (a->>'object_key') AS object_key,
    (a->>'mime')       AS mime,
    NULLIF(a->>'byte_size','')::INT AS byte_size,
    (a->>'alt')        AS alt
  FROM questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.attachments) AS a
)
INSERT INTO attachments (question_id, object_key, mime, byte_size, alt)
SELECT question_id, object_key, mime, byte_size, alt
FROM j
ON CONFLICT (question_id, object_key) DO NOTHING;

-- ---------- Optional clean-up ----------
-- If you are fully moving to the normalized table, you can drop the JSON columns.
-- Comment these out if your API still reads from JSON fields.
-- ALTER TABLE questions DROP COLUMN attachments;
-- ALTER TABLE question_versions DROP COLUMN attachments;
