# Milestone D2

## Question Service (Database Decision)

### **Choice of Database**

We chose **PostgreSQL** because it’s reliable, consistent, and supports powerful features like **JSONB**, **full-text search**, and **relational joins**.

These are essential for storing flexible question data, performing fast searches, and supporting our idempotent question selection logic.

---

### **How Data Will Be Modeled and Queried**

#### **Core Tables / Prisma Models**

| Model               | Purpose                                                 | Key Fields                                                                                                                                   |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `questions`         | Main table storing all current question data.           | `id`, `title`, `body_md`, `difficulty`, `topics (jsonb)`, `attachments (jsonb)`, `status`, `version`, `rand_key`, `created_at`, `updated_at` |
| `question_versions` | Snapshot of a published version of a question.          | `(id, version)` PK, snapshot of question fields, `published_at`                                                                              |
| `topics`            | Catalog of available topics.                            | `slug` PK, `display`, `color_hex`                                                                                                            |
| `question_topics`   | Join table linking questions and topics (many-to-many). | `(question_id, topic_slug)` PK                                                                                                               |
| `reservations`      | Tracks idempotent question selections per session.      | `matching_id` PK, `question_id`, `expires_at`                                                                                                |

#### **Indexes**

- `(status, difficulty, updated_at DESC)` → for filtering and sorting
- `btree(rand_key)` → for random selection
- `GIN(topics jsonb_path_ops)` → for efficient topic filtering
- `tsv_en` (generated column) → PostgreSQL full-text search on title + body_md

#### **Query Patterns**

- **Get published question by ID**
  → `WHERE id = ? AND status = 'published'`
- **List/filter questions**
  → Filter by difficulty, topics (`topics @> [...]`), or text (`tsv_en @@ plainto_tsquery(?)`); ordered by `updated_at DESC`
  → `/questions` returns **published** questions only (paginated)
- **Admin listing**
  → `/admin/questions` includes all statuses; same filters plus `status`
- **Create/Update/Publish**
  - Create draft: `/admin/questions`
  - Partial update: `/admin/questions/{id}` (PATCH)
  - Publish: `/admin/questions/{id}/publish` →
    - Copy to `question_versions` (new version)
    - Mark head as `published`
    - Increment version number
- **Archive (soft delete)**
  → `/admin/questions/{id}` (DELETE) → `status='archived'`
- **Selection (idempotent)**
  → `/select`
  1. Filter by `status='published'`, optional `difficulty`, `topics`
  2. Exclude any `recent_ids`
  3. Pick one random question (`ORDER BY rand_key LIMIT 1`)
  4. Record in `reservations` with `matching_id` and `expires_at=now()+10min`
  5. If the same `matching_id` repeats before expiry, return the same question

#### **Content Handling**

- Only **Markdown (`body_md`)** is stored in the database.
- On read, the service dynamically converts it into **sanitized HTML (`body_html`)** before returning it.
- Markdown can reference internal attachments using
  `pp://<object_key>` or `/attachments/<object_key>` — these are automatically rewritten into **signed S3/CDN URLs** in the response.
- **`body_html`** is thus _regenerated on every read_, ensuring rendering and sanitization are always up to date.

---

### **How It Integrates With Other Services**

#### **Authentication & Authorization**

- Secured using **JWT (RS256)**, validated via `JWT_ISSUER` and `JWKS_URL`.
- Roles:
  - `admin` → full CRUD and publishing
  - `service` → internal system access (e.g. matching)
  - optional `anonymous` → read-only (controlled by `.env`)

#### **With Matching Service**

- Matching requests a random, suitable question via:

  ```json
  {
    "matching_id": "sess-123",
    "difficulty": "Medium",
    "topics": ["graphs"],
    "recent_ids": ["palindrome-linked-list"]
  }
  ```

- The Question Service returns one **published** question.
- **Idempotent**: same `matching_id` within 10 minutes returns the same result.
- No message queues — communication is purely **REST-based**.

#### **With Collaboration Service**

- Collaboration calls `GET /questions/{id}` to render the question inside a shared editor.
- Response includes:
  - `title`,
  - `body_html` (rendered and sanitized),
  - `attachments` with **signed S3 URLs**, and
  - `topics` with display colors for UI badges.

## Demo code

### 1) Health & readiness

```bash
curl -s http://localhost:3000/healthz | jq
curl -s http://localhost:3000/readyz | jq

```

### 2) List published questions (filters: difficulty/topics/q)

```bash
# Plain list
curl -s http://localhost:3000/questions | jq

# Filter by difficulty
curl -s "http://localhost:3000/questions?difficulty=Medium" | jq

```

### 3) Read one question by id

```bash
curl -s http://localhost:3000/questions/reverse-a-string | jq

```

### 4) Selection API (idempotent by matching_id for 10 minutes)

```bash
# First selection for this session_id → returns a question
curl -s -X POST 'http://localhost:3000/select' \
-H 'Content-Type: application/json' \
-d '{"matching_id":"sess-123","difficulty":"Easy","topics":["algorithms"]}' | jq

# Repeat with the same session_id → returns the SAME question (idempotent)
curl -s -X POST 'http://localhost:3000/select' \
-H 'Content-Type: application/json' \
-d '{"matching_id":"sess-123","difficulty":"Easy","topics":["algorithms"]}' | jq

```

### 5) (Admin) Create a draft and publish it

````bash
# Create a draft question
curl -s -X POST http://localhost:3000/admin/questions \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -d '{
    "title": "Find the Maximum Subarray Sum",
    "body_md": "Given an integer array **nums**, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\\n\\nExample:\\n```js\\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\\nOutput: 6\\nExplanation: [4,-1,2,1] has the largest sum = 6.\\n```\\n\\n**Follow-up:** Try to implement it with O(1) extra space using Kadane\\'s algorithm.",
    "difficulty": "Medium",
    "topics": ["algorithms"],
    "attachments": []
  }' | tee /tmp/question.json | jq

# Extract the question id (slugified title)
QUESTION_ID=$(jq -r '.id' /tmp/question.json)

# 3️⃣ Publish the draft
curl -s -X POST http://localhost:3000/admin/questions/${QUESTION_ID}/publish \
  -H "x-role: admin" | jq

````

````bash
# 1) Create draft
curl -s -X POST http://localhost:3000/admin/questions \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -d '{
    "title": "Serialize and Deserialize a Binary Tree",
    "body_md": "Design algorithms to **serialize** a binary tree to a string and **deserialize** the string back to the same tree.\\n\\nYou may choose any valid format (e.g., level-order with null markers). Ensure that deserializing the serialized string reconstructs an *identical* structure.\\n\\n**Example (Level-order, `null` as marker):**\\n```\\nInput tree:   [1,2,3,null,null,4,5]\\nSerialize ->  \"1,2,3,null,null,4,5\"\\nDeserialize -> same tree\\n```\\n**Follow-up:** Discuss time/space complexity and trade-offs of DFS vs BFS encodings.",
    "difficulty": "Hard",
    "topics": ["data-structures"],
    "attachments": []
  }' | tee /tmp/q3.json | jq

# 2) Extract id (slug from title)
QUESTION_ID=$(jq -r '.id' /tmp/q3.json)

# 3) Publish it
curl -s -X POST http://localhost:3000/admin/questions/${QUESTION_ID}/publish \
  -H "x-role: admin" | jq

# 4) Verify read
curl -s "http://localhost:3000/questions/${QUESTION_ID}" | j
````
