## Matchmaking Flow

The following sequence diagram shows the sequence for the endpoints for the Matching Service:

```mermaid
sequenceDiagram
    participant Frontend
    participant MS as Matching Service
    participant Redis

    Frontend->>MS: POST /match/request
    MS->>Redis: equeue user + TTL
    Redis-->>MS: OK
    MS-->>Frontend: 200 OK

    loop Every 1-3 seconds
        Frontend->>MS: GET /match/status/{userId}
        MS->>Redis: QUERY userId pool
        Redis-->>MS: waiting / matched / timeout

        alt User in waiting pool
            MS-->>Frontend: 200, waiting + timeRemaining

        else User in matched pool
            MS-->>Frontend: 200, matched + sessionId

        else User in timeout pool
            MS-->>Frontend: 200, timeout
        end
    end
```

The following component diagram shows the Redis structures used by the Matching Service:

``` mermaid
graph TD
    MS(Matching Service) --> Redis

    subgraph RedisPools["Redis Structures"]
        EQ("Entry Queue (List)")
        WPool("Waiting Pool (Hash)")
        MPool("Matched Pool (Set)")
        TPool("Timeout Pool (Set)")
    end

    Redis --> EQ
    Redis --> WPool
    Redis --> MPool
    Redis --> TPool
```