# ArenaCast — Cricket & Football Tournament Platform

End-to-end tournament management: player registration → admin approval → admin-driven auction → live ball-by-ball / minute-by-minute scoring → auto-derived standings.

## Stack

- **Next.js 15** App Router + React 19 RC + TypeScript
- **Prisma 5** + **PostgreSQL**
- **JWT** auth (jose) + httpOnly cookies, **bcryptjs** for hashes
- **Tailwind** with a sports-themed palette (`brand` green pitch / `gold` accents)
- **Server-Sent Events (SSE)** for the live auction & live match feeds — no extra infra

## Setup

```bash
# 1. install deps (creates the .prisma client)
npm install

# 2. point DATABASE_URL in .env at a real Postgres
#    e.g. postgresql://postgres:postgres@localhost:5432/arenacast?schema=public

# 3. push the schema
npm run db:push

# 4. seed admin + sample owners + teams + players
npm run db:seed

# 5. run
npm run dev
```

## Seed accounts

| Role        | Email                          | Password    |
|-------------|--------------------------------|-------------|
| Admin       | `admin@arenacast.local`        | `changeme`  |
| Team Owner  | `owner.mum@arenacast.local`    | `ownerpass` |
| Team Owner  | `owner.del@arenacast.local`    | `ownerpass` |
| Team Owner  | `owner.lon@arenacast.local`    | `ownerpass` |
| Team Owner  | `owner.brc@arenacast.local`    | `ownerpass` |
| Player      | `rohit@arenacast.local`        | `playerpass` |
| Player      | `messi@arenacast.local`        | `playerpass` |

(plus 6 more players — see `prisma/seed.ts`)

## Routes

### Public (no auth)
- `/` — landing with live tile + KPIs
- `/players` — searchable roster (sport, role, status, name)
- `/players/[id]` — full player profile
- `/teams` — all teams
- `/teams/[id]` — team detail (roster, budget, fixtures)
- `/matches` — Live / Upcoming / Results tabs
- `/matches/[id]` — live scoreboard (SSE)
- `/auction` — live auction view (SSE)
- `/standings` — derived points table for both sports

### Authenticated
- `/login`, `/register`
- `/profile` — player edits sport-aware profile (cricket vs football fields)
- `/dashboard` — player home
- `/my-team` — team-owner cockpit

### Admin only
- `/admin` — KPIs + quick actions
- `/admin/players` — approve / reject / set base price
- `/admin/teams` — create team, assign existing user or invite a new owner
- `/admin/auction` — pick player on block, assign to team at sold price
- `/admin/matches` — schedule fixtures
- `/admin/matches/[id]/score` — live scoring panel (cricket = ball-by-ball, football = event-driven)

## Live updates (SSE)

- `GET /api/auction/stream` — broadcasts `ON_BLOCK | SOLD | UNSOLD | CLEAR` events to all connected viewers.
- `GET /api/matches/[id]/stream` — broadcasts per-match score events.

A tiny in-process pub/sub lives in `src/lib/sse.ts` — swap to Postgres `LISTEN/NOTIFY` or Redis when you go multi-instance.

## Architecture map

```
src/
  app/
    (auth)/        login, register
    (public)/      players, teams, matches, auction, standings
    (player)/      profile, dashboard
    (owner)/       my-team
    (admin)/       admin/* (players, teams, auction, matches, scoring)
    api/           auth/{login,register,logout}, auction/stream,
                   matches/[id]/stream, upload
  lib/             db, auth, sse, validators, standings, cn
  server/actions/  auth, player, adminPlayer, team, auction, match, score
  components/      ui/  layout/  player/  team/  match/  auction/
  middleware.ts    route gates by role
prisma/
  schema.prisma    User, PlayerProfile, Team, Match, CricketInnings,
                   CricketEvent, FootballEvent, AuctionLog
  seed.ts          demo data
```

## Advanced features baked in (beyond the basic ask)

1. **Per-team budget cap** — auction blocks sales that exceed remaining budget.
2. **Base price tier (A / B / C)** — derived from base price thresholds in `src/lib/validators.ts`.
3. **Sport-aware profile form** — fields swap on a single radio toggle.
4. **Live cricket scorecard** — runs / wickets / overs / CRR / projected score, last 6 balls, full ball-by-ball commentary, fall of wickets.
5. **Live football scoreboard** — minute-stamped timeline with goal / card / sub icons, score derived from events (own-goals attributed correctly).
6. **Auction ticker** — recent sales feed updates via SSE.
7. **Auto-computed standings** — points (2 win / 1 tie), goals/runs for/against, GD.
8. **MOTM honours** — tagged per match, surfaced on player profile.
9. **Search + filter** on `/players` (sport, role, status, name).
10. **AuctionLog** — every sale stored with admin id + timestamp for audit.
11. **Photo upload** — `/api/upload` writes to `public/uploads/`.
12. **Role-aware nav** + `middleware.ts` route gates.
13. **Undo recent ball / event** during scoring — re-derives innings totals.
14. **Reopen sold player** — refunds team budget atomically.

## Ideas for the next pass

- **Bracket / knockouts** — `Match.round`, single-elimination renderer
- **Player stats aggregation** — career totals over multiple matches (already easy from `CricketEvent` / `FootballEvent`)
- **Push notifications** — wrap SSE in Web Push for mobile
- **Spectator chat per match** — another SSE topic
- **Image upload widget** — wire `/api/upload` into the profile form
- **Multi-tenant** — `Tournament` model owning everything (today: single tournament per DB)
- **Vote MOTM** — fan voting feeding into admin's final call
- **Webhooks** — outbound on sale / goal for Discord / Twitter posts
- **i18n** — single `t()` helper, JSON dictionaries
- **PWA + offline scoring** — IndexedDB queue while connectivity flickers
