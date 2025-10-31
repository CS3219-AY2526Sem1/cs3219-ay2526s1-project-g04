# README for collaboration service

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

## Summary of Service Dependecies

| Source Service    | Target Service    | Protocol       | Purpose                                           |
| ----------------- | ----------------- | -------------- | ------------------------------------------------- |
| **Collaboration** | **Question**      | HTTP REST      | Fetch question details for the active session     |
| **Collaboration** | **User**          | HTTP REST      | Retrieve collaborator profile info                |
| **Collaboration** | **Code Runner**   | HTTP REST      | Execute user code against predefined test cases   |
| **Matching**      | **Collaboration** | RabbitMQ       | Trigger creation of new collaboration sessions    |
| **Frontend**      | **Collaboration** | HTTP REST      | Retrieve past sessions or documents               |
| **Frontend**      | **Collaboration** | WebSocket      | Real-time code, chat, and drawing synchronization |
| **Collaboration** | **Redis**         | Redis Protocol | Store and retrieve temporary session state        |
