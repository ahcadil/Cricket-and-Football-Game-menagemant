# 📡 ArenaCast — API & Server Actions Reference

This document provides complete technical specifications for the REST endpoints, Server-Sent Events (SSE) streaming topics, and Next.js Server Actions powering **ArenaCast**.

---

## 🌐 1. HTTP REST Endpoints

### Auth Endpoints (`/api/auth/*`)

#### `POST /api/auth/login`
Authenticates a user and sets an `httpOnly` JWT session cookie.
- **Request Body**:
  ```json
  {
    "email": "admin@arenacast.local",
    "password": "changeme"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "user": {
      "id": "cmr3df...",
      "email": "admin@arenacast.local",
      "name": "Tournament Admin",
      "role": "ADMIN"
    }
  }
  ```
- **Response `401 Unauthorized`**:
  ```json
  {
    "error": "Invalid email or password"
  }
  ```

---

#### `POST /api/auth/register`
Creates a new user account with default role `PLAYER` or `VIEWER`.
- **Request Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "password": "securepassword123",
    "name": "John Doe",
    "role": "PLAYER"
  }
  ```
- **Response `200 OK`**: Sets `arenacast_session` cookie and returns user object.

---

#### `POST /api/auth/logout`
Clears the `arenacast_session` cookie.
- **Response `200 OK`**:
  ```json
  { "success": true }
  ```

---

### Upload Endpoint (`/api/upload`)

#### `POST /api/upload`
Uploads player profile photos or team logos to server storage.
- **Content-Type**: `multipart/form-data`
- **Body**: Form data containing `file` blob.
- **Response `200 OK`**:
  ```json
  {
    "url": "/uploads/1722295600000-avatar.png"
  }
  ```

---

## 📡 2. Real-Time SSE Streams (Server-Sent Events)

### Live Auction Stream

#### `GET /api/auction/stream`
Broadcasts real-time auction bidding updates to connected viewers.
- **Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

#### Broadcast Event Payloads

##### Event: `ON_BLOCK` (Player placed on auction block)
```json
{
  "event": "ON_BLOCK",
  "player": {
    "id": "cmr3df...",
    "user": { "name": "Rohit Sharma" },
    "sport": "CRICKET",
    "cricketRole": "BAT",
    "basePrice": "50000",
    "photoUrl": "/uploads/rohit.jpg"
  }
}
```

##### Event: `SOLD` (Player assigned to winning team)
```json
{
  "event": "SOLD",
  "player": {
    "id": "cmr3df...",
    "user": { "name": "Rohit Sharma" },
    "soldPrice": "250000"
  },
  "team": {
    "id": "cmr3team...",
    "name": "Mumbai Mavericks"
  }
}
```

##### Event: `UNSOLD` (Player passed without bids)
```json
{
  "event": "UNSOLD",
  "playerId": "cmr3df..."
}
```

##### Event: `CLEAR` (Auction block cleared)
```json
{
  "event": "CLEAR"
}
```

---

### Live Match Scorecard Stream

#### `GET /api/matches/[id]/stream`
Broadcasts real-time ball-by-ball or event updates for a specific match.
- **Topic**: `match:[id]`
- **Payload Example (Cricket Ball Event)**:
  ```json
  {
    "event": "CRICKET_EVENT",
    "matchId": "cmr3match...",
    "over": 4,
    "ball": 3,
    "runs": 6,
    "isWicket": false,
    "batsmanName": "Rohit Sharma",
    "bowlerName": "Jasprit Bumrah",
    "currentInnings": {
      "runs": 42,
      "wickets": 1,
      "ballsBowled": 27
    }
  }
  ```

---

## ⚡ 3. Server Actions Reference (`/src/server/actions/*`)

ArenaCast uses Next.js Server Actions for secure, type-safe data mutations.

### Player Actions (`src/server/actions/player.ts`)

#### `updatePlayerProfileAction(formData: FormData)`
Updates current user's player profile details.
- **Permissions**: Authenticated (`PLAYER` role).
- **Parameters**: `sport`, `phone`, `city`, `experienceYears`, `cricketRole`, `battingStyle`, `bowlingStyle`, `footballPosition`, `preferredFoot`.
- **Returns**: `{ success: boolean, error?: string }`.

---

### Admin Player Actions (`src/server/actions/adminPlayer.ts`)

#### `approvePlayerAction(playerId: string, basePrice: bigint)`
Approves a submitted player profile and sets their auction base price.
- **Permissions**: `ADMIN` role.
- **Returns**: `{ success: true }`.

#### `rejectPlayerAction(playerId: string, reason: string)`
Rejects a submitted player profile with a note.
- **Permissions**: `ADMIN` role.

---

### Bulk Player Import Actions (`src/server/actions/bulkPlayer.ts`)

#### `bulkImportPlayersAction(data: BulkImportRow[])`
Imports multiple player profiles with base prices and assignable teams in a single transaction.
- **Permissions**: `ADMIN` role.

---

### Team Actions (`src/server/actions/team.ts`)

#### `createTeamAction(formData: FormData)`
Creates a new franchise team and assigns a team owner.
- **Permissions**: `ADMIN` role.
- **Inputs**: `name`, `sport`, `ownerId`, `budget`, `primaryColor`, `tagline`.

#### `updateTeamAction(teamId: string, formData: FormData)`
Updates team tagline, primary color, or logo.
- **Permissions**: `ADMIN` or assigned `TEAM_OWNER`.

---

### Auction Control Actions (`src/server/actions/auction.ts`)

#### `putPlayerOnBlockAction(playerId: string)`
Sets player status to `ON_AUCTION` and broadcasts `ON_BLOCK` event via SSE.
- **Permissions**: `ADMIN` role.

#### `sellPlayerAction(playerId: string, teamId: string, soldPrice: bigint)`
Sells a player on the block to a team. Checks remaining budget before committing.
- **Permissions**: `ADMIN` role.
- **Atomic Operations**:
  1. Verifies `team.budget - team.spent >= soldPrice`.
  2. Updates `team.spent += soldPrice`.
  3. Updates `player.status = "SOLD"`, `player.soldPrice = soldPrice`, `player.teamId = teamId`.
  4. Creates `AuctionLog` record.
  5. Publishes `SOLD` event to `/api/auction/stream`.

#### `unsellPlayerAction(playerId: string)`
Reopens a sold player, refunds the purchasing team's budget, and updates status back to `ON_AUCTION` or `APPROVED`.
- **Permissions**: `ADMIN` role.

---

### Match & Live Scoring Actions (`src/server/actions/score.ts`)

#### `scheduleMatchAction(formData: FormData)`
Creates a new fixture between two teams.
- **Permissions**: `ADMIN` role.

#### `recordCricketBallAction(matchId: string, ballData: CricketBallInput)`
Records a ball event (runs, wicket type, extras) and recalculates innings totals.
- **Permissions**: `ADMIN` role.
- **Broadcasts**: Pushes updated scorecard state to `match:[id]` SSE subscribers.

#### `undoLastCricketBallAction(matchId: string)`
Removes the most recent ball event and re-derives innings statistics cleanly.
- **Permissions**: `ADMIN` role.

#### `recordFootballEventAction(matchId: string, eventData: FootballEventInput)`
Records a minute-stamped match event (Goal, Yellow Card, Sub).
- **Permissions**: `ADMIN` role.

#### `undoLastFootballEventAction(matchId: string)`
Deletes the last football event and re-computes team match scores.
- **Permissions**: `ADMIN` role.
