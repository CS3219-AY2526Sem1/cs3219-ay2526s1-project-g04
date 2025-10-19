-- migrations/999_seed_data.sql
-- Question Service: Dummy Data Seed 

BEGIN;

-- ==============================================================
-- Topics (canonical metadata)
-- ==============================================================

INSERT INTO topics (slug, display, color_hex) VALUES
  ('strings', 'Strings', '#F4A261'),
  ('algorithms', 'Algorithms', '#2A9D8F'),
  ('data-structures', 'Data Structures', '#E76F51'),
  ('arrays', 'Arrays', '#E9C46A'),
  ('bit-manipulation', 'Bit Manipulation', '#264653'),
  ('databases', 'Databases', '#8AB17D'),
  ('recursion', 'Recursion', '#B56576'),
  ('brainteaser', 'Brainteaser', '#9D4EDD')
ON CONFLICT (slug) DO UPDATE
  SET display = EXCLUDED.display,
      color_hex = EXCLUDED.color_hex;

-- ==============================================================
-- Questions (core catalog)
-- ==============================================================

WITH seed(id, title, difficulty, description, topics) AS (
  VALUES
  -- EASY
  ('reverse-a-string','Reverse a String','Easy','Reverse a character array in place using O(1) extra memory.','["strings","algorithms"]'),
  ('linked-list-cycle-detection','Linked List Cycle Detection','Easy','Detect whether a singly linked list contains a cycle.','["data-structures","algorithms"]'),
  ('roman-to-integer','Roman to Integer','Easy','Convert a Roman numeral string into its integer value.','["algorithms"]'),
  ('add-binary','Add Binary','Easy','Return the sum of two binary strings as a binary string.','["bit-manipulation","algorithms"]'),
  ('fibonacci-number','Fibonacci Number','Easy','Compute F(n) where F(0)=0, F(1)=1, and F(n)=F(n-1)+F(n-2).','["recursion","algorithms"]'),
  ('implement-stack-using-queues','Implement Stack using Queues','Easy','Build a LIFO stack using only standard queue operations.','["data-structures"]'),
  ('combine-two-tables','Combine Two Tables','Easy','SQL join to report names with city/state; show nulls if missing.','["databases"]'),

  -- MEDIUM
  ('repeated-dna-sequences','Repeated DNA Sequences','Medium','Find all 10-letter-long DNA sequences that occur more than once.','["algorithms","bit-manipulation"]'),
  ('course-schedule','Course Schedule','Medium','Determine if all courses can be finished given prerequisites.','["data-structures","algorithms"]'),
  ('lru-cache','LRU Cache Design','Medium','Design an LRU cache supporting O(1) get and put operations.','["data-structures"]'),
  ('longest-common-subsequence','Longest Common Subsequence','Medium','Return the length of the longest common subsequence of two strings.','["strings","algorithms"]'),
  ('rotate-image','Rotate Image','Medium','Rotate an n×n matrix 90° clockwise in place.','["arrays","algorithms"]'),
  ('airplane-seat-assignment-probability','Airplane Seat Assignment Probability','Medium','Compute the probability that the nth passenger gets their own seat.','["brainteaser"]'),
  ('validate-binary-search-tree','Validate Binary Search Tree','Medium','Check whether a binary tree satisfies BST ordering constraints.','["data-structures","algorithms"]'),

  -- HARD
  ('sliding-window-maximum','Sliding Window Maximum','Hard','For each window of size k, return the maximum element.','["arrays","algorithms"]'),
  ('n-queens','N-Queen Problem','Hard','Return all distinct solutions to the n-queens placement puzzle.','["algorithms"]'),
  ('serialize-and-deserialize-binary-tree','Serialize and Deserialize a Binary Tree','Hard','Design algorithms to serialize and deserialize a binary tree.','["data-structures","algorithms"]'),
  ('wildcard-matching','Wildcard Matching','Hard','Wildcard pattern matching with ? and * over the entire string.','["strings","algorithms"]'),
  ('chalkboard-xor-game','Chalkboard XOR Game','Hard','Determine whether Alice wins the XOR game under optimal play.','["brainteaser"]'),
  ('trips-and-users','Trips and Users','Hard','SQL: compute daily cancellation rate for unbanned users only.','["databases"]')
),

upsert_questions AS (
  INSERT INTO questions (
    id, title, body_md, difficulty, topics, attachments, status, version, rand_key, created_at, updated_at
  )
  SELECT
    s.id,
    s.title,
    ('# ' || s.title || E'\n\n' ||
     '**Difficulty:** ' || upper(s.difficulty) || E'\n' ||
     '**Topics:** ' || array_to_string( (SELECT array_agg(t) FROM jsonb_array_elements_text(s.topics::jsonb) AS t), ', ' ) || E'\n\n' ||
     s.description || E'\n\n_Imported sample data._'
    ),
    s.difficulty,
    s.topics::jsonb,
    '[]'::jsonb,
    'published',
    1,
    random(),
    now(),
    now()
  FROM seed s
  ON CONFLICT (id) DO UPDATE
    SET title       = EXCLUDED.title,
        body_md     = EXCLUDED.body_md,
        difficulty  = EXCLUDED.difficulty,
        topics      = EXCLUDED.topics,
        attachments = EXCLUDED.attachments,
        status      = 'published',
        updated_at  = now()
  RETURNING id, topics
)

-- ==============================================================
-- question_topics (relational mirror)
-- ==============================================================

INSERT INTO question_topics (question_id, topic_slug)
SELECT q.id, topic_slug
FROM upsert_questions q,
LATERAL jsonb_array_elements_text(q.topics) AS topic_slug
WHERE topic_slug IN (SELECT slug FROM topics)
ON CONFLICT DO NOTHING;

-- ==============================================================
-- question_versions (snapshot for v1)
-- ==============================================================

INSERT INTO question_versions (
  id, version, title, body_md, difficulty, topics, attachments, status, published_at
)
SELECT
  q.id,
  1,
  q.title,
  q.body_md,
  q.difficulty,
  q.topics,
  q.attachments,
  'published',
  now()
FROM questions q
ON CONFLICT (id, version) DO NOTHING;

-- ==============================================================
-- Optional: demo session reservation (for /select testing)
-- ==============================================================

INSERT INTO session_reservations (session_id, question_id, expires_at)
VALUES ('demo-session-1', 'reverse-a-string', now() + interval '10 minutes')
ON CONFLICT (session_id) DO NOTHING;

COMMIT;