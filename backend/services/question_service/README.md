# Question Service (PeerPrep)

> **Stack:** Express.js · TypeScript · PostgreSQL · RabbitMQ · AWS

A microservice that stores coding interview questions and reliably serves **one suitable random question** to start a collaboration session. Includes admin CRUD + publish/versioning, safe markdown rendering, image delivery via signed URLs/CDN, JWT/RBAC security, and basic search.

---

## ✨ Features

- **Question catalog**: CRUD (admin), get-by-id, list/filter with pagination, basic full‑text search.
- **Selection API**: returns one **matching, published** question; **idempotent** per `session_id` with a **10‑minute reservation** stored in Postgres.
- **Repeat‑avoidance**: excludes questions recently attempted by either peer (`recent_ids` field or via history integration).
- **Content safety**: Markdown → sanitized HTML; attachments via **S3 signed URLs**; optional **CloudFront**.
- **Security**: JWT (RS256 via JWKS) with roles: `admin`, `service` (and optional `anonymous` for read‑only).
- **Events**: `question.created|updated|published|selected` to RabbitMQ (topic exchange) for analytics/history.

---

## 🏗 Architecture

```
Client → ALB / API Gateway → Question Service (Express)
                               ├─ PostgreSQL: questions, versions, session_reservations
                               └─ S3: image objects

```

---

## 🚀 Quickstart (Local)

### Prerequisites

- Node.js **>= 20** and npm/pnpm
- Docker + Docker Compose

### 1) Install

```bash
git clone https://github.com/CS3219-AY2526Sem1/cs3219-ay2526s1-project-g04.git
cd backend/services/question_service
npm i
```

### 2) Environment

Create `.env` from the example below:

| Variable                 | Example                                            | Notes                  |
| ------------------------ | -------------------------------------------------- | ---------------------- |
| `PORT`                   | `3008`                                             | Service port           |
| `NODE_ENV`               | `development`                                      | `production` in prod   |
| `DATABASE_URL`           | `postgresql://postgres:postgres@localhost:5432/qs` | Postgres DSN           |
| `SIGNED_URL_TTL_SECONDS` | `900`                                              | Default: 15 minutes    |
| `S3_BUCKET`              | `peerprep-questions`                               | Bucket for attachments |
| `ACCESS_KEY`             |                                                    | AWS Access Key         |
| `SECRET_KEY`             |                                                    | AWS Secret Key         |
| `AWS_REGION`             | `ap-southeast-1`                                   | Region for S3/signing  |

### 3) Start Postgres

```bash
docker compose -f docker-compose.dev.yaml up -d qs-postgres
```

### 4) Migrate DB

```bash
# Apply schema and seed
npm run db:migrate:compose
npm run db:seed:compose
npm run prisma:pull
npm run prisma:gen

# Verify
docker compose exec -T postgres psql -U postgres -d qs -c "SELECT status, COUNT(*) FROM questions GROUP BY 1 ORDER BY 1;"
# Optional smoke
npm run smoke
```

### 5) Run the API

```bash
npm run dev
```

Service is now at **[http://localhost:3009](http://localhost:3008)**.

---

## 📚 API

> **Auth:** JWT (RS256 via JWKS). Roles noted per route.
> **Conventions:** `page` (1-based), `page_size` (default 20).
> **Timestamps:** ISO-8601 format.

---

### 🩺 Health

- **GET `/healthz`** — Liveness probe. _(Public)_
- **GET `/readyz`** — Readiness probe (checks DB/AMQP). _(Public)_

---

### 🌐 Public Read

- **GET `/questions`** — List published questions with filters. _(Public if `ALLOW_ANONYMOUS_READS=true`, else `service|admin`)_
  Query params:
  - `difficulty`: `easy|medium|hard`
  - `topics`: CSV or repeated (e.g. `topics=arrays,graphs` or `topics=arrays&topics=graphs`)
  - `q`: full-text search query
  - `page`, `page_size`: pagination
  - `highlight`: `true|false` (optional, returns matched snippets when using `q`)

- **GET `/questions/{id}`** — Get one **published** question (returns `body_md` and sanitized `body_html`). _(Public/Read-only)_

- **GET `/questions/batch?id=...`** — Fetch multiple by ID (published only).
  Example: `/questions/batch?id=a&id=b&id=c`. _(Public/Read-only)_

- **GET `/questions/topics`** — List published topics (slug, display, color). _(Public/Read-only)_

- **GET `/questions/{id}/resources`** — Public resources bundle for a published question (e.g., images via signed URLs). _(Public/Read-only)_

---

### 🎯 Selection

- **POST `/select`** — Return one **eligible, published** question; **idempotent** per `session_id` for 10 minutes (stored in Postgres). _(Role: `service` or authenticated user token)_
  **Body:**

  ```json
  {
    "session_id": "sess-123",
    "difficulty": "easy|medium|hard",
    "topics": ["arrays", "graphs"],
    "exclude_ids": ["two-sum"],
    "recent_ids": ["palindrome-linked-list"],
    "seed": 42
  }
  ```

  **Notes:**
  - Respects `exclude_ids` and `recent_ids` when possible.
  - Deterministic within reservation window for same `session_id`.

---

### 📦 Resources (Internal/Service)

- **GET `/internal/questions/{id}/resources`** — Internal resources bundle (includes non-public metadata/attachments). _(Role: `service|admin`)_

---

### 🔐 Admin (secured)

> All routes under `/admin/**` require **`admin`** role.

- **POST `/admin/questions`** — Create a **draft** question.
  Body includes: `title`, `body_md`, `difficulty`, `topics[]`, optional `attachments[]`.

- **PATCH `/admin/questions/{id}`** — Edit an existing question (draft or published → creates new draft version).

- **POST `/admin/questions/{id}/publish`** — Publish the current draft. Creates a new immutable version in `question_versions`.

- **DELETE `/admin/questions/{id}`** — Archive (soft delete). Excluded from public reads and selection.

**Admin Attachments**

- **GET `/admin/questions/{id}/attachments`** — List attachments metadata for a question.

- **POST `/admin/questions/{id}/attachments`** — Request signed upload URL for S3.
  Returns both **upload** and **read (signed)** URLs.

- **DELETE `/admin/questions/{id}/attachments/{key}`** — Remove attachment and revoke future access.

---

### 🧪 Debug (dev/test only)

- **GET `/debug/questions/{id}`** — Preview sanitized render / debug payload for a single question.
  _(Enabled only in `development` or `test` mode.)_

---

### 📘 Common Response Shapes

**Question (public view):**

```json
{
  "id": "two-sum",
  "title": "Two Sum",
  "difficulty": "medium",
  "topics": ["arrays", "hashmap"],
  "attachments": [],
  "status": "published",
  "version": 3,
  "body_md": "...",
  "body_html": "...",
  "created_at": "2025-11-01T10:32:00Z",
  "updated_at": "2025-11-02T08:15:00Z"
}
```

**List response:**

```json
{
  "items": [ { ...Question }, ... ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

**Selection response:**

```json
{
  "session_id": "sess-123",
  "question": { ...Question },
  "reserved_until": "2025-11-12T08:15:00Z"
}
```

---

### ⚠️ Error Codes

| Code | Meaning                                     |
| ---- | ------------------------------------------- |
| 401  | Missing or invalid token                    |
| 403  | Role not allowed                            |
| 404  | Not found (e.g., unpublished ID)            |
| 409  | Conflict (e.g., invalid publish transition) |
| 422  | Validation error (bad input)                |

---

✅ **Tip:** Use `Authorization: Bearer <token>` for authenticated routes, and ensure `service` or `admin` role when accessing `/admin/**` or `/internal/**`.

---

Perfect ✅ — here’s a **concise version** of your database section (fits well in a README) plus an inline **Mermaid ERD diagram** for clarity.
You can copy and paste this directly:

---

## 🗃 Database Schema (PostgreSQL)

The Question Service stores questions, topics, versions, and runtime data.
All relationships use foreign keys with `ON DELETE CASCADE`.

### Core Tables

| Table                         | Purpose                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`questions`**               | Main catalog. Includes `title`, `body_md`, `difficulty ('Easy','Medium','Hard')`, `topics[]`, `attachments[]`, `status ('draft','published','archived')`, `version`, timestamps, and generated `tsv_en` for search. |
| **`question_versions`**       | Immutable snapshots of published/draft questions for versioning.                                                                                                                                                    |
| **`reservations`**            | Idempotent selection record per `matching_id` (expires in 10 mins).                                                                                                                                                 |
| **`topics`**                  | Canonical topic metadata (`slug`, `display`, `color_hex`).                                                                                                                                                          |
| **`question_topics`**         | Join table for many-to-many between questions and topics.                                                                                                                                                           |
| **`question_test_cases`**     | Stores `sample`/`hidden` test cases for runtime evaluation.                                                                                                                                                         |
| **`question_python_starter`** | Starter code + `entry_point` for collaborative editor.                                                                                                                                                              |

**Key Features**

- FTS (`tsv_en`) for search over title/body.
- Random selection helper via `rand_key`.
- `updated_at` maintained automatically with trigger.
- Strict constraints & cascading deletes to keep referential integrity.

---

### 🧩 ERD Overview

```mermaid
erDiagram
    QUESTIONS ||--o{ QUESTION_VERSIONS : "has versions"
    QUESTIONS ||--o{ QUESTION_TOPICS : "has topics"
    TOPICS ||--o{ QUESTION_TOPICS : "referenced by"
    QUESTIONS ||--o{ QUESTION_TEST_CASES : "has test cases"
    QUESTIONS ||--|| QUESTION_PYTHON_STARTER : "has starter"
    QUESTIONS ||--o{ RESERVATIONS : "reserved by"

    QUESTIONS {
      text id PK
      text title
      text difficulty
      text status
      jsonb topics
      jsonb attachments
      double rand_key
      timestamptz created_at
    }
    QUESTION_VERSIONS {
      text id FK
      int version PK
      timestamptz published_at
    }
    RESERVATIONS {
      text matching_id PK
      text question_id FK
      timestamptz expires_at
    }
    TOPICS {
      text slug PK
      text display
      text color_hex
    }
    QUESTION_TOPICS {
      text question_id FK
      text topic_slug FK
    }
    QUESTION_TEST_CASES {
      bigserial id PK
      text question_id FK
      text visibility
      int ordinal
    }
    QUESTION_PYTHON_STARTER {
      text question_id PK
      text starter_code
      text entry_point
    }
```

---

### Summary

- **FTS** via `tsv_en` for search
- **Versioned publishing** with `question_versions`
- **Selection idempotency** via `reservations`
- **Runtime support** (test cases, starter code) separated from content

---

Would you like me to also include this ERD as a rendered image (e.g. PNG) in your repo for the presentation slides?

---

## 📄 License

MIT (or your org’s license).
