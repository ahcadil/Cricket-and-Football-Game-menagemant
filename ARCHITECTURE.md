# 📐 ArenaCast — System Architecture & Technical Specifications

This document outlines the software architecture, database data model, real-time event streaming engine, authentication flow, and business logic specs of **ArenaCast**.

---

## 🏛️ High-Level System Architecture

ArenaCast utilizes Next.js 15 App Router, leveraging Server Components for optimized data fetching, Server Actions for mutation workflows, and a custom SSE (Server-Sent Events) engine for real-time scorecards and live auction bidding.

```mermaid
graph TD
    Client["Client Web Browsers (Admin / Owner / Spectator)"]
    
    subgraph NextServer ["Next.js 15 Server Node Process"]
        Middleware["middleware.ts (Jose JWT Verification & RBAC)"]
        AppRouter["App Router (RSC Pages & Layouts)"]
        ServerActions["Server Actions (/src/server/actions)"]
        APIStream["API Stream Handlers (/api/*/stream)"]
        PubSub["In-Memory SSE Pub/Sub Engine (/src/lib/sse.ts)"]
    end

    subgraph DataStore ["Database Layer"]
        Prisma["Prisma ORM Client"]
        Database["SQLite (Dev) / PostgreSQL (Prod)"]
    end

    Client -->|HTTP Request| Middleware
    Middleware -->|Authorized| AppRouter
    Client -->|Invoke Server Action| ServerActions
    Client -->|EventSource SSE Stream| APIStream
    
    ServerActions -->|Mutation & Broadcast| PubSub
    ServerActions -->|Query / Mutate| Prisma
    APIStream -->|Subscribe| PubSub
    PubSub -->|Push Event Bytes| Client
    Prisma -->|SQL Query| Database
```

---

## 🗄️ Database Schema & Entity Relationships

ArenaCast uses Prisma ORM with SQLite for local development and direct Postgres migration path. 

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o| PLAYER_PROFILE : "has"
    USER ||--o| TEAM : "owns"
    USER ||--o{ AUCTION_LOG : "manages"
    
    TEAM ||--o{ PLAYER_PROFILE : "roster"
    TEAM ||--o{ MATCH : "teamA / teamB"
    TEAM ||--o{ CRICKET_INNINGS : "bats"
    TEAM ||--o{ FOOTBALL_EVENT : "scores"
    TEAM ||--o{ AUCTION_LOG : "buys"

    MATCH ||--o{ CRICKET_INNINGS : "contains"
    MATCH ||--o{ CRICKET_EVENT : "records"
    MATCH ||--o{ FOOTBALL_EVENT : "records"
    MATCH }|--o| PLAYER_PROFILE : "MOTM"

    PLAYER_PROFILE ||--o{ CRICKET_EVENT : "batsman / bowler"
    PLAYER_PROFILE ||--o{ FOOTBALL_EVENT : "player"
    PLAYER_PROFILE ||--o{ AUCTION_LOG : "sold"
```

### Core Schema Specifications

#### 1. `User`
Stores user identities, hashed credentials, and system roles.
- `id` (String CUID, Primary Key)
- `email` (String, Unique)
- `passwordHash` (String)
- `name` (String)
- `role` (String: `ADMIN` | `PLAYER` | `TEAM_OWNER` | `VIEWER`)

#### 2. `PlayerProfile`
Contains player physical data, sport-specific attributes, registration status, base price, and team association.
- `id` (String CUID, Primary Key)
- `userId` (String, Unique FK -> User)
- `sport` (String: `CRICKET` | `FOOTBALL`)
- `status` (String: `DRAFT` | `SUBMITTED` | `APPROVED` | `REJECTED` | `ON_AUCTION` | `SOLD` | `UNSOLD`)
- `basePrice` (BigInt)
- `soldPrice` (BigInt)
- `teamId` (String FK -> Team)
- `cricketRole` (`BAT` | `BOWL` | `AR` | `WK`)
- `footballPosition` (`GK` | `DEF` | `MID` | `FWD`)

#### 3. `Team`
Represents tournament franchises owned by team owner users.
- `id` (String CUID, Primary Key)
- `name` (String, Unique)
- `sport` (String: `CRICKET` | `FOOTBALL`)
- `ownerId` (String, Unique FK -> User)
- `budget` (BigInt, Default: 1,000,000)
- `spent` (BigInt, Default: 0)

#### 4. `Match`
Defines fixtures between Team A and Team B.
- `id` (String CUID, Primary Key)
- `sport` (`CRICKET` | `FOOTBALL`)
- `teamAId`, `teamBId` (FKs -> Team)
- `scheduledAt` (DateTime)
- `status` (`UPCOMING` | `LIVE` | `FINISHED` | `CANCELLED`)
- `winnerId` (FK -> Team)
- `motmId` (FK -> PlayerProfile)

#### 5. `CricketInnings` & `CricketEvent`
Tracks ball-by-ball events in cricket matches.
- `CricketInnings`: `runs`, `wickets`, `ballsBowled`, `extras`, `order` (1 or 2).
- `CricketEvent`: `over`, `ball`, `batsmanId`, `bowlerId`, `runs`, `isWicket`, `wicketType`, `extraType`.

#### 6. `FootballEvent`
Minute-stamped timeline of football matches.
- `FootballEvent`: `minute`, `teamId`, `playerId`, `type` (`GOAL` | `OWN_GOAL` | `YELLOW` | `RED` | `SUB_IN` | `SUB_OUT` | `PENALTY` | `MISSED_PEN`).

#### 7. `AuctionLog`
Audit log tracking player sales during live auctions.
- `id`, `playerId`, `teamId`, `soldPrice`, `soldAt`, `adminId`.

---

## 📡 Real-time SSE Engine Architecture

ArenaCast features a lightweight, zero-infra real-time pub/sub engine built directly into the Next.js runtime (`src/lib/sse.ts`).

### Pub/Sub Channel Architecture

```
channels Map: Topic String -> Set<ReadableStreamDefaultController>
  ├── "auction" -> [ Controller1, Controller2, ... ]
  ├── "match:cmr3df..." -> [ ControllerA, ControllerB, ... ]
  └── "match:cmr9kz..." -> [ ControllerX, ControllerY, ... ]
```

### Event Streaming Flow
1. **Subscription**: Client initiates `new EventSource('/api/auction/stream')`.
2. **Controller Registration**: The API route handler adds the stream's `controller` to `channels.get('auction')`.
3. **Heartbeat Loop**: An active 25-second interval pushes `: ping\n\n` comments to prevent browser timeout/proxy disconnection.
4. **Publishing**: Admin actions call `publish('auction', payload)`. The SSE engine serializes the payload to `event: message\ndata: ...\n\n` and enqueues bytes to all controllers in the topic set.
5. **Auto-Cleanup**: Disconnected streams automatically delete their controller from the channel `Set` on exception or stream cancel.

### Scaling to Multi-Instance Production
For horizontal scaling across multiple web server instances:
- Replace the `src/lib/sse.ts` in-process `Map` with **Redis Pub/Sub** or **PostgreSQL LISTEN / NOTIFY**.

---

## 🔐 Authentication & Middleware Authorization Flow

ArenaCast uses stateless JSON Web Tokens (JWT) stored in secure, `httpOnly` cookies (`arenacast_session`).

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant MW as Middleware (src/middleware.ts)
    participant Auth as Auth Server Action
    participant DB as Prisma Database

    User->>Auth: Submit credentials (email, password)
    Auth->>DB: Query user by email & verify bcrypt password
    DB-->>Auth: User record (id, role)
    Auth->>User: Set httpOnly cookie 'arenacast_session' (JWT signed with secret)
    
    User->>MW: Request protected route (e.g. /admin/auction)
    MW->>MW: Read cookie & verify JWT via jose library
    alt Token Missing or Invalid Role
        MW-->>User: Redirect to /login or /
    else Valid Token & Correct Role
        MW-->>User: Next.js Pass-through to Page
    end
```

---

## 🧮 Core Business Logic & Algorithms

### 1. Per-Team Budget Cap Enforcement (`src/server/actions/auction.ts`)
During live bidding, when an admin sells a player to a team:
$$\text{Remaining Budget} = \text{Team.budget} - \text{Team.spent}$$
If $\text{soldPrice} > \text{Remaining Budget}$, the transaction is blocked with an error. Upon a successful sale, `Team.spent` is incremented, `PlayerProfile.status` is set to `SOLD`, and an `AuctionLog` audit record is created atomically.

### 2. Standings Algorithm (`src/lib/standings.ts`)
Tournament standings tables are computed dynamically:
- **Cricket**:
  - Points: 2 per Win, 1 per Tie/No Result.
  - Net Run Rate (NRR):
    $$\text{NRR} = \left(\frac{\text{Total Runs Scored}}{\text{Total Overs Faced}}\right) - \left(\frac{\text{Total Runs Conceded}}{\text{Total Overs Bowled}}\right)$$
- **Football**:
  - Points: 3 per Win, 1 per Draw, 0 per Loss.
  - Goal Difference (GD): $\text{Goals For} - \text{Goals Against}$.

---

## 📁 File & Module Directory Structure

```
f:\game build\
├── prisma/
│   ├── schema.prisma         # Database schema & indexes
│   └── seed.ts               # Demo data seeder script
├── src/
│   ├── app/                  # Next.js 15 App Router pages & API handlers
│   │   ├── (admin)/admin/    # Admin portal pages
│   │   ├── (auth)/           # Login & Register routes
│   │   ├── (owner)/my-team/  # Franchise owner cockpit
│   │   ├── (player)/         # Player profile & dashboard
│   │   ├── (public)/         # Public tournament pages
│   │   └── api/              # API route handlers & SSE streams
│   ├── components/           # UI components (auction, match, team, player, ui)
│   ├── lib/                  # Utilities (db, auth, sse, standings, cricket)
│   └── server/actions/       # Server actions (admin, team, auction, score)
└── middleware.ts             # Global RBAC route protection
```
