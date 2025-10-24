# Question Service (PeerPrep)

> **Stack:** Express.js · TypeScript · PostgreSQL · RabbitMQ · AWS (RDS, S3, CloudFront, ECS/ALB)

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
                               ├─ PostgreSQL (RDS): questions, versions, session_reservations
                               ├─ S3: image objects  → CloudFront (optional)
                               └─ RabbitMQ (Amazon MQ): events

```

---

## Folder Structure

```
backend/services/question_service/
├── .gitignore
├── .env.example
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── index.ts
    ├── app/
    │   ├── ExpressApp.ts
    │   └── routes.ts
    ├── controllers/
    │   ├── AdminController.ts
    │   └── QuestionController.ts
    ├── middleware/
    │   └── auth.ts
    ├── repositories/
    │   ├── prisma.ts
    │   ├── QuestionRepository.ts
    │   └── ReservationRepository.ts
    ├── services/
    │   ├── MarkdownService.ts
    │   ├── QuestionService.ts
    │   └── SelectionService.ts
    └── utils/
        ├── logger.ts
        └── s3Signer.ts

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
npm ci
```

### 2) Environment

Create `.env` from the example below:

| Variable                 | Example                                            | Notes                  |
| ------------------------ | -------------------------------------------------- | ---------------------- |
| `PORT`                   | `3000`                                             | Service port           |
| `NODE_ENV`               | `development`                                      | `production` in prod   |
| `DATABASE_URL`           | `postgresql://postgres:postgres@localhost:5432/qs` | Postgres DSN           |
| `AMQP_URL`               | `amqp://guest:guest@localhost:5672`                | RabbitMQ connection    |
| `JWT_ISSUER`             | `https://auth.example/`                            | Token issuer to verify |
| `JWKS_URL`               | `https://auth.example/.well-known/jwks.json`       | Public keys (RS256)    |
| `SIGNED_URL_TTL_SECONDS` | `900`                                              | Default: 15 minutes    |
| `S3_BUCKET`              | `peerprep-questions`                               | Bucket for attachments |
| `AWS_REGION`             | `ap-southeast-1`                                   | Region for S3/signing  |

### 3) Start Postgres & RabbitMQ

```bash
docker compose up -d postgres
```

### 4) Migrate DB

```bash
# Apply schema
docker compose exec -T postgres psql -U postgres -d qs -v ON_ERROR_STOP=1 -f - < ./migrations/0001_init.sql

# Seed
docker compose exec -T postgres psql -U postgres -d qs -v ON_ERROR_STOP=1 -f - < ./migrations/999_seed_data.sql

# Verify
docker compose exec -T postgres psql -U postgres -d qs -c "SELECT status, COUNT(*) FROM questions GROUP BY 1 ORDER BY 1;"
```

### 5) Run the API

```bash
npm run dev          # hot reload
# or
npm run start        # compiled
```

Service is now at **[http://localhost:3000](http://localhost:3000)**.

---

## 📚 API (MVP)

### Health

`GET /healthz` → `{ ok: true }`

### Read

- **GET `/questions/{id}`** → returns a **published** question or `404`. Includes `body_html` (sanitized) and `body_md`.
- **GET `/questions?difficulty=&topics=&q=&page=&size=`** → paginated list (stable order: `updated_at desc`).

### Selection

- **POST `/select`** → body:

```json
{
  "session_id": "sess-123",
  "difficulty": "medium",
  "topics": ["graphs"],
  "exclude_ids": ["two-sum"],
  "recent_ids": ["palindrome-linked-list"],
  "seed": 42
}
```

**Behavior**

- Returns one **eligible, published** question.
- **Idempotent**: same `session_id` within **10 minutes** returns the same question (reservation in DB).
- Respects `exclude_ids`/`recent_ids` when possible; falls back if the pool is too small.

### Admin (if enabled)

- `POST /admin/questions` → create (`draft`)
- `PATCH /admin/questions/{id}` → edit
- `POST /admin/questions/{id}/publish` → publish & version
- `DELETE /admin/questions/{id}` → archive (soft delete)

All `/admin/**` routes require role **`admin`**.

---

## 🗃 Data Model (simplified)

### Tables

`questions`

```
id text primary key
title text not null
body_md text not null
difficulty text check (difficulty in ('easy','medium','hard')) not null
topics jsonb not null default '[]'
attachments jsonb not null default '[]'
status text check (status in ('draft','published','archived')) not null
version int not null default 1
rand_key double precision not null default random()  -- for fast random selection
created_at timestamptz default now()
updated_at timestamptz default now()
```

`question_versions`

```
(id, version) primary key
...snapshot fields...
published_at timestamptz
```

`session_reservations` (idempotency window)

```
session_id text primary key
question_id text not null
expires_at timestamptz not null
```

### Indexes

- `(status, difficulty)`
- `gin(to_tsvector('english', title || ' ' || body_md))` (basic FTS)
- `btree(rand_key)`

---

## 📈 Observability

- **Logs**: JSON with `correlation_id` (trace incoming → DB/RabbitMQ).
- **Metrics**: request rate, latency p50/p95/p99, error %, selection success.
- **Health**: `/healthz` (liveness), `/readyz` (readiness: DB reachable).

---

## 📄 License

MIT (or your org’s license).
