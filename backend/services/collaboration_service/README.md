# README for collaboration service

## Technology Stack

### YJS (CRDT)

Collaboration service uses WebSockets (via the ws library) for persistent bi-directional communication between clients and the backend.

```ts
import { WebSocketServer } from 'ws';

export class Collab {
  public async start() {
    // Initialize WebSocket server attached to HTTP server
    const server = this.initServer(app, pgdb);
    const webSocketServer = new WebSocketServer({ server });

    // Create session manager to handle WebSocket connections
    const sessionManager = new SessionManager(
      redis,
      postgresDb,
      webSocketServer,
      pgdb,
    );
  }
}
```

Real-time document synchronization is handled by Yjs. Each user edits on their own copy of the shared document, then Yjs generates incremental updates of the changes made automatically. These updates are then shared to other clients connected within the same session through the WebSocket layer, where they are merged in a conflict-free manner using CRDT (Conflict-free Replicated Data Type), which is a structure that Google docs use.

Because Yjs merges updates without requiring a central authority, it eliminates race conditions which avoids the complexity of operational transforms. This allows users to edit the same document concurrently and have all the changes converge to the same state once reconnected.

#### Other uses

Also used for communication nice-to-haves like messaging and drawing.

### Monaco Editor (y-monaco)

On the client side, Monaco Editor is integrated with Yjs through y-monaco.

### Database: Prisma ORM

Handles tables for sessions, users, and code document updates.

### Enabling Code Persistence through Y-PostgreSQL

Y-PostgreSQL creates a table called `yjs-documents` which stores CRDT updates.

Function to view full document string:

```
const ydoc = await pgdb.getYDoc(docName); // docname is the session id
const yText = ydoc.getText('monaco');
const content = yText.toString();
```

## Architectural Decisions

**WebSocket-Based Architecture**

- Uses `WebSocketServer` from the `ws` library for persistent bi-directional connections
- Provides low-latency communication essential for real-time collaboration

```typescript
// WebSocket server initialization
const webSocketServer = new WebSocketServer({ server });
const sessionManager = new SessionManager(
  redis,
  postgresDb,
  webSocketServer,
  pgdb,
);
```

**Connection Handling**

- Each WebSocket connection is managed through `SessionManager.handleConnection`
- User authentication and session routing via URL parameters
- Automatic session lifecycle management (creation, ready state, cleanup)

```typescript
this.wss.on('connection', (ws, req) => {
  this.handleConnection(ws, req);
});
```

### 2. **CRDT-Based Document Synchronization**

**Yjs for Conflict-Free Replication**

- Uses **Yjs CRDT** framework to enable concurrent editing without conflicts
- Each session has a unique `Y.Doc` instance
- Changes are automatically merged using operational transformation
- Eliminates race conditions and avoids complex conflict resolution logic

```typescript
const ydoc = new Y.Doc();
const docName = sessionId.toString();
setupWSConnection(ws, req, { docName: sessionId.toString() });
```

**Monaco Editor Integration**

- Frontend uses `y-monaco` binding for seamless editor synchronization
- Real-time cursor positions and selections via awareness protocol

```typescript
const binding = new MonacoBinding(
  yText,
  model,
  new Set([editor]),
  provider.awareness,
);
```

### 3. **Session Management Architecture**

**State Machine Design**

- Sessions follow a defined state lifecycle: `created → active → end`
- User states tracked independently: `waiting → ready → left → end`

```typescript
export enum SESSIONSTATE {
  created = 'created',
  active = 'active',
  end = 'end',
}
```

**Session Creation Flow**

1. Receive matched users from matching service via RabbitMQ
2. Create session in PostgreSQL via `PostgresPrisma.createSessionDataModel`
3. Initialize Yjs document and persist to PostgreSQL
4. Store session metadata in Redis for fast lookups
5. Wait for both users to connect and mark ready

```typescript
public async createSession(matchedId: string) {
  const sessionId = await this.db.createSessionDataModel(
    Number(matchedData['user_a']),
    Number(matchedData['user_b'])
  );

  const session = new Session(sessionId, userA, userB);
  this.sessions[sessionId] = { session, matchedId };
}
```

### 4. **Data Persistence Strategy**

**Automatic Code Persistence**

- Document updates are automatically persisted on change
- Binding state restoration on reconnection
- Data is stored in the `yjs-documents` table in Prisma DB

```typescript
setPersistence({
  provider: pgdb,
  bindState: async (docName, ydoc) => {
    const persistedYDoc = await pgdb.getYDoc(docName);
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYDoc));

    ydoc.on('update', async (update: Uint8Array) => {
      await pgdb.storeUpdate(docName, update);
    });
  },
});
```

### 6. **Executing Code**

**Shared Code Context**

- `CodeContext` provides code and test case state
- Real-time code from Monaco editor sent to execution service
- Results displayed in `TestCases` component

```typescript
const { code, language, testCases, setResults } = useCodeContext();

// Execute code with test inputs
runBatchCode(
  code,
  testCases.map((t) => t.input),
);
```

Collecting workspace information# View Toward Scaling and Compatibility with Other Services

## Collaboration Service

### Horizontal Scaling Strategy

**Stateless Service Design**

- The collaboration service is designed to be **stateless** at the application layer
- Session state is externalized to Redis and PostgreSQL, enabling multiple instances to run in parallel
- WebSocket connections can be distributed across instances using load balancing

```typescript
// Shared state through Redis
const redis = await CollabRedis.getInstance();
await redis.addSessionDataToUser(sessionId, matchedId, state);

// Persistent storage through PostgreSQL
const sessionId = await this.db.createSessionDataModel(userAId, userBId);
```

**Load Balancing Considerations**

- Use **sticky sessions** (session affinity) for WebSocket connections
- Alternative: Implement WebSocket connection migration using Redis pub/sub
- Scale based on active session count and WebSocket connection metrics

### Service Discovery & Communication

**Message Broker Integration**

- Uses RabbitMQ for **asynchronous, loosely-coupled** communication with other services
- Listens for `CollaborationService` message types from matching service
- Can scale consumers independently

```typescript
export class MessageListener {
  private TYPES_TO_LISTEN = [MESSAGE_TYPES.CollaborationService];

  private messageHandler(msgType: MESSAGE_TYPES, msg: string) {
    const msgJson = JSON.parse(msg);
    if (msgJson['type'] === 'matched') {
      this.handleStartSession(msgJson['matchedId']);
    }
  }
}
```

**REST API Endpoints for Service Integration**

- `GET /sessions/:userId` - Query user's past sessions
- `GET /document/:sessionId` - Retrieve session code document
- Stateless endpoints enable easy integration with API gateways

```typescript
app.get('/sessions/:userId', async (req, res) => {
  const sessions = await db.getPastSessionsByUser(userId);
  res.json(sessions);
});

app.get('/document/:sessionId', async (req, res) => {
  const ydoc = await pgdb.getYDoc(sessionId);
  const content = yText.toString();
  res.json({ sessionId, content });
});
```

### Data Layer Scalability

**PostgreSQL Scaling**

- Uses connection pooling via Prisma for efficient database access
- Separate tables for session metadata (`Session`) and CRDT updates (`yjs_documents`)
- Read replicas can be added for session history queries

**Redis for Distributed State**

- Session metadata cached in Redis for fast lookups
- Supports Redis Cluster for horizontal scaling
- TTL-based cleanup prevents unbounded growth

```typescript
public async addSessionDataToUser(
  sessionId: string,
  matchedId: string,
  state: SESSIONSTATE
) {
  const sessionData = {
    session_id: sessionId,
    session_state: state.valueOf()
  };
  await this.redis.setDictValueByKey(matchedId, sessionData);
}
```

### Compatibility with Other Services

**Matching Service Integration**

- Receives matched user pairs via RabbitMQ message broker
- Creates sessions based on matching service data structure
- Returns session IDs back to matching service via Redis

```typescript
public async createSession(matchedId: string) {
  const matchedData = await this.redis.getMatchedUser(matchedId);
  const sessionId = await this.db.createSessionDataModel(
    Number(matchedData['user_a']),
    Number(matchedData['user_b'])
  );
}
```

**Question Service Integration**

- Session document can store question ID for retrieval
- Direct API calls to fetch question details
  - Question itself, test cases (input and output), starter code
- Stored in session metadata for history tracking

**Code Execution Service Integration for Interpreter**

- Frontend retrieves code from collaboration service
- Sends to code execution service for running test cases
- Results displayed in `TestCases` component

```typescript
async function runBatchCode(code: string, inputs: any[]) {
  const response = await fetch('http://localhost:5000/batch-run', {
    method: 'POST',
    body: JSON.stringify({ code, inputs }),
  });
}
```
