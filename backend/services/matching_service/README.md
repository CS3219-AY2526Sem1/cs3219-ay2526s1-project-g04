## Matchmaking Flow

The following sequence diagram shows the sequence for the endpoints for the Matching Service:

```mermaid
sequenceDiagram
    participant Frontend
    participant MS as Matching Service
    participant Redis
    participant CS as Collaboration Service

    Frontend->>MS: POST /match/request
    MS->>Redis: enqueue user + TTL
    Redis-->>MS: OK
    MS-->>Frontend: 200 OK

    loop Every 1-3 seconds
        Frontend->>MS: GET /match/status/{userId}
        MS->>Redis: QUERY userId status
        Redis-->>MS: waiting / matched_pending / matched_ready / timeout

        alt status: waiting
            MS-->>Frontend: 200, waiting + timeRemaining
            Frontend->>Frontend: reflect timeRemaining to user

        else status: matched_pending
            MS-->>Frontend: 200, matched_pending
            Frontend->>Frontend: reflect pending redirecting page to user

        else status: matched_ready
            MS-->>Frontend: 200, matched_ready + sessionId
            Frontend->>CS: poll collaboration service for sessionId status

        else status: timeout
            MS-->>Frontend: 200, timeout
            Frontend->>Frontend: reflect timeout page to user
        end
    end
```

The following diagram shows the interactions between the Matching Service, Frontend and the Collaboration Service during `matched_ready` state:

```mermaid
flowchart TB
    FE(Frontend)

    subgraph Services
    MS(Matching Service)
    MB(Message Broker)
    CS(Collaboration Service)
        direction LR
        MS -->|1: send matched users| MB
        MB -->|2: read| CS
    end

    Redis[(Redis)]

    subgraph RS["Redis Structures"]
        subgraph MSRS["Matching Service Structures"]
            EQ("Entry Queue (List)")
            WPool("Waiting Pool (Hash)")
        end

        USHS("User Status HSET")
    end

    FE -->|"GET match/status/{userId}"| MS
    MS -->|5: 200, matched_ready + sessionId| FE 
    FE -->|6: get sessionId status| CS

    MS -->|QUERY userId status| Redis
    CS -->|3: update session ID in user status HSET| Redis
    Redis -->|4: matched_ready + session ID| MS

    Redis --> EQ
    Redis --> WPool
    Redis --> USHS

```