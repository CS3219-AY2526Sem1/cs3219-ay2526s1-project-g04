# Collaboration Service Overview

Collaboration service is in charge of handling sessions between 2 users. This readme covers the workflow of the collaboration service in the backend.

## Project Structure

File structure:

```
backend/services/collaboration_service/
├── Dockerfile
├── README.md
├── package.json
├── tsconfig.json
├── public.pem
├── generated/
│   └── prisma/
├── middleware/
│   └── auth.ts
├── src/
│   ├── main.ts
│   ├── collab.ts
│   ├── app.ts
│   ├── listener.ts
│   ├── data/
│   │   ├── collab_redis.ts
│   │   └── postgres/
│   │       └── postgres.ts
│   └── session/
│       ├── session.ts
│       └── session_manager.ts
```

## How to run

Install packages through `pnpm i`.

Execute the docker through `docker compose up`. Ensure to add the .env with your server details.

## Managing sessions

Sessions are managed and created within the session folder. When a "session" is created, the following happens:

1. **Collaboration Service creates a new session record**
   - Retrieves match details (e.g., `userAId`, `userBId`, `questionId`) from **Redis**, using the `matchId` shared by the Matching Service.
   - A new session entry is inserted into the **PostgreSQL** database (via Prisma), generating a unique `sessionId`.

2. **Session state is cached in Redis**
   - The service stores the `sessionId` and session state (`created`, `active`, etc.) in Redis, so that other microservices (like Communication Service) can quickly access session metadata.
   - Redis acts as the central state store and coordination point across services.

3. **Yjs document is initialized**
   - A **Yjs `Doc`** is created for collaborative code editing, with a shared text type (`monaco`).
   - The Collaboration Service fetches the corresponding question from the **Question Service** using `QUESTIONURL` and preloads its `starter_code` into the Yjs document.
   - The initial Yjs document state is stored using the **`y-postgresql`** adapter.
     - Code documents are persistent.
     - Currently no versisioning of documents is implemented.

4. **Session is published to Communication Service**
   - A message is sent through the **message broker** to create another yjs document specifically for communication purposes (messaging, drawing).

5. **WebSocket connections are established**
   - Clients connect to the Collaboration Service using a WebSocket endpoint:

     ```
     ws://<collaboration-service-host>/<sessionId>?userId=<id>
     ```

   - The `SessionManager` validates the session and user through the **Redis**, then attaches the connection to the Yjs WebSocket server using `setupWSConnection`.

6. **Users become ready**
   - When both users connect, the session transitions from `created` ->`active`.
   - Session state is updated in Redis to `active`, which will cause the FE to redirect to the collaboration page, and both clients start real-time code collaboration.

7. **Session persistence & end**
   - During editing, Yjs continuously persists document updates to PostgreSQL via `PostgresqlPersistence`.

8. **Ending a session**
   - When a session ends (either by user or timeout), the Collaboration Service:
     - Marks the session as **ended** in Redis and PostgreSQL.
     - Notifies Communication Service of termination.
     - Deletes the session from memory.

## Session States

`created`: Session is created, waiting for users to join
`active`: Both users have joined session
`end`: Sesssion is terminated by user or timeout

## API

## Architecture

# Decisions made

## Technology Stack

### 1. **WebSocket Communication Layer**

**Technology: `ws` (WebSocket) library**

- Chosen for **persistent bi-directional communication** between clients and backend
- Enables **real-time updates** with sub-second latency essential for collaborative editing

---

### 2. **CRDT Framework: Yjs**

**Technology: Yjs (Conflict-free Replicated Data Type)**

- Enables **conflict-free collaborative editing** without central coordination
- Automatically merges concurrent edits from multiple users
- Similar to Google Docs' operational transformation but simpler implementation

---

### 3. **Code Editor: Monaco Editor**

**Technology: Monaco Editor (VS Code's editor) with `y-monaco` binding**

- Industry-standard code editor used in VS Code
- Rich features: syntax highlighting, IntelliSense, multi-cursor support
- Seamless integration with Yjs via `y-monaco`

---

### 4. **Data Storage**

**PostgreSQL with Prisma ORM + Y-PostgreSQL**

- Use Prisma for session metadata like session id and user id
- Use Y-PostgreSQL for code persistence

---

## How Collab Service creates a session

### 1. Trigger: Message from Matching Service

Matching Service will first find 2 compatible users and publishes a message to the message broker (RabbitMQ): `type: 'matched'`

### 2. Creating session with SessionManager

The SessionManager does the following

1. Fetch user pairing data from Redis using matchedId to identify both participants
2. Creates a new session entry in PostgreSQL using Prisma, linking both users to the session
3. Instantiates an in-memory Session object to manage runtime state
4. Updates Redis with the new session ID and state (`created`) for quick reference and lookup
5. Initializes the Yjs documents that will serve as shared CRDT state for collaborative editing and other communication services
6. Persists the initial Yjs state to PostgreSQL via `y-postgresql` so that the document can be reconstructed even after the server resets.

**State Machine Design**

- Sessions follow a defined state lifecycle: `created → active → end`
- User states tracked independently: `waiting → ready → left → end`

## Architectural Decisions

### 1. **CRDT-Based Document Synchronization**

**Yjs for Conflict-Free Replication**

- Uses **Yjs CRDT** (Conflict-free Replicated Data Types) framework to merge concurrent updates across multiple replicas without conflicts
- Each session has a unique `Y.Doc` instance
- Changes are automatically merged using operational transformation
- Eliminates race conditions and avoids complex conflict resolution logic

> Fufils F15, F15.1

### 2. **Data Persistence Strategy**

**Automatic Code Persistence**

- Document updates are automatically persisted on change
- Binding state restoration on reconnection
- Data is stored in the `yjs-documents` table in Prisma DB

Retrieving full code document from `yjs-documents`:

```ts
// Step 1: Get Y.Doc from PostgreSQL yjs_documents table
const ydoc = await pgdb.getYDoc(sessionId);

// Step 2: Access the text in the 'monaco' namespace
const yText = ydoc.getText('monaco');

// Step 3: Convert to plain string
const content = yText.toString();
```

### 3. **Executing Code**

**Code runner Service**

- Created to **isolate code execeution** from the Collab Service environment
  - Prevents user programs from running in the same runtime as collab backend
  - Ensures that crashes or errors in code execution does ont disrupt collab features
- Each program runs inside its own ephemeral Docker container, which is automatically deleted after execution
  - Provides full sandboxing and zero data leakage between runs

### 4. **Communication Service**

- Handles instant messaging and collaborative drawing within a session using Yjs shared documents bound to WebSocket connections
- Each Collaboration session maintains dedicated Yjs documents for text chat and drawing data, so that participants can see updates immediately and without conflicts

## View Toward Scaling and Compatibility with Other Services

**Scalability**

- Collaboration service is stateless: session state and CRDT documents are stored in the database and redis, allows multiple instances to run in parallel
- Supports horizontal scaling
  - The system can handle more users or traffic by running multiple instances of the same service

**Compaibility**

- Store past session records in db so the User Service can retrieve and display user history or past collaboration (will be used to show analytics)
- Can easily integrate with future extensions like leaderboard through session and performance data
