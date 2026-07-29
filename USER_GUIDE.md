# 📖 ArenaCast — Operational User Manual & Role Guides

Welcome to the **ArenaCast** User Guide. This guide provides comprehensive, step-by-step instructions for every user role within the tournament management platform.

---

## 👥 User Roles & Access Overview

ArenaCast supports four primary user roles:

```
                  ┌───────────────────────────────┐
                  │          ADMINISTRATOR        │
                  │   Full System Control Panel   │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TEAM OWNER    │     │     PLAYER      │     │  SPECTATOR/FAN  │
│ Franchise Hub   │     │ Profile Control │     │ Public Hub View │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 👑 1. Administrator Guide (`ADMIN`)

### Demo Credentials
- **Email**: `admin@arenacast.local`
- **Password**: `changeme`

---

### Step 1: Review & Approve Player Registrations
1. Log in as Admin and navigate to [`/admin/players`](file:///f:/game%20build/src/app/(admin)/admin/players/page.tsx).
2. Filter players by status (**Submitted**, **Draft**, **Approved**, **Rejected**).
3. Click on a player's card to review their bio, physical stats, and position/role.
4. Set the player's **Base Price** (e.g. `$50,000` for Tier A, `$25,000` for Tier B).
5. Click **Approve Player**. The player is now eligible for the Live Auction.

---

### Step 2: Manage Franchises & Teams
1. Navigate to [`/admin/teams`](file:///f:/game%20build/src/app/(admin)/admin/teams/page.tsx).
2. Click **Create Team**.
3. Fill in Team Name, Sport (`CRICKET` or `FOOTBALL`), Starting Budget (Default: `$1,000,000`), and Brand Color hex code.
4. Select an existing user with `TEAM_OWNER` role or enter a new user's email to assign team ownership.

---

### Step 3: Run the Live Player Auction
1. Navigate to the Auction Control Desk at [`/admin/auction`](file:///f:/game%20build/src/app/(admin)/admin/auction/page.tsx).
2. Select an approved player from the available list and click **Put on Block**.
3. The auction screen updates in real-time for all connected team owners and spectators via SSE.
4. As franchise owners place bids offline/online, enter the final **Winning Team** and **Final Sold Price**.
5. Click **Sell Player**.
   - The system automatically deducts the amount from the team's remaining budget.
   - The player is added to the team's squad roster.
   - If a team attempts to bid higher than their remaining budget, the system blocks the sale.
6. If a player receives no bids, click **Mark Unsold**.

---

### Step 4: Schedule Fixtures & Live Match Scoring
1. Navigate to [`/admin/matches`](file:///f:/game%20build/src/app/(admin)/admin/matches/page.tsx).
2. Click **Schedule Match**, choose Sport, Team A, Team B, Date/Time, and Venue.
3. When the match starts, open [`/admin/matches/[id]/score`](file:///f:/game%20build/src/app/(admin)/admin/matches/[id]/score/page.tsx).
4. **For Cricket Matches**:
   - Record ball outcomes (`0`, `1`, `2`, `4`, `6`, Wicket type, Extras like Wide or No Ball).
   - Click **Submit Ball**. Live scorecard updates instantly across all fan screens.
   - Use **Undo Last Ball** if a miscount occurs.
5. **For Football Matches**:
   - Record events with minute stamp (Goal, Yellow Card, Red Card, Substitution).
   - Scores auto-calculate from goal events.

---

## 🏎️ 2. Team Owner Guide (`TEAM_OWNER`)

### Demo Credentials
- **Email**: `owner.mum@arenacast.local` (Mumbai Mavericks)
- **Password**: `ownerpass`

---

### Features & Workflow
1. **Franchise Cockpit**: Navigate to [`/my-team`](file:///f:/game%20build/src/app/(owner)/my-team/page.tsx).
2. **Monitor Budget**: Track Total Budget, Total Spent, and Remaining Purse in real time.
3. **Live Auction View**: Open [`/auction`](file:///f:/game%20build/src/app/(public)/auction/page.tsx) during the auction event to watch players put on block.
4. **Squad Roster**: View all acquired players, salary breakdown, and positional coverage.
5. **Team Profile**: Customize team tagline, logo image, and primary kit color.

---

## 🏏⚽ 3. Player Guide (`PLAYER`)

### Demo Credentials
- **Email**: `rohit@arenacast.local` (Cricket)
- **Password**: `playerpass`

---

### Registration & Profile Workflow
1. Navigate to [`/register`](file:///f:/game%20build/src/app/(auth)/register/page.tsx) to create an account.
2. Select role as **Player**.
3. Go to [`/profile`](file:///f:/game%20build/src/app/(player)/profile/page.tsx) to complete your athletic profile:
   - **Sport Selector**: Toggle between **Cricket** and **Football**. The form dynamically adjusts visible input fields!
   - **Cricket Fields**: Batting Style (Right-hand/Left-hand), Bowling Style, Cricket Role (Batsman, Bowler, All-Rounder, Wicket-Keeper).
   - **Football Fields**: Position (Goalkeeper, Defender, Midfielder, Forward), Preferred Foot, Jersey Number.
   - **General Stats**: Height, Weight, DOB, Bio, Profile Photo upload.
4. Click **Submit Profile for Approval**. Once approved by an Admin, you will be eligible for auction bidding!

---

## 📺 4. Spectator & Fan Guide (Public Viewers)

No login required! Anyone can access public tournament features:

1. 🏠 **Landing Page** ([`/`](file:///f:/game%20build/src/app/page.tsx)): View key tournament KPIs, live match tickers, and franchise wall.
2. 🏏 **Player Roster** ([`/players`](file:///f:/game%20build/src/app/(public)/players/page.tsx)): Search players by name, filter by sport, role, or auction status.
3. 🏎️ **Franchise Directory** ([`/teams`](file:///f:/game%20build/src/app/(public)/teams/page.tsx)): Browse team profiles and squad line-ups.
4. 🔨 **Live Auction Hub** ([`/auction`](file:///f:/game%20build/src/app/(public)/auction/page.tsx)): Watch the live bidding ticker in real-time as players get sold to franchises.
5. 📊 **Live Match Center** ([`/matches`](file:///f:/game%20build/src/app/(public)/matches/page.tsx)): Follow live ball-by-ball commentary and scorecards for Cricket and timeline events for Football.
6. 📈 **Tournament Standings** ([`/standings`](file:///f:/game%20build/src/app/(public)/standings/page.tsx)): View auto-updated points tables, Net Run Rates (NRR), and Goal Differences (GD).

---

## ❓ Frequently Asked Questions (FAQ)

#### Q: How do I change the database from SQLite to PostgreSQL for production?
A: In `prisma/schema.prisma`, update `provider = "postgresql"`, set your PostgreSQL `DATABASE_URL` in `.env`, run `npx prisma db push`, and seed with `npm run db:seed`.

#### Q: Does the live auction require websockets?
A: No! ArenaCast uses Server-Sent Events (SSE) via Web ReadableStreams. It works over standard HTTP/2 without needing socket servers or external dependencies.

#### Q: What happens if a team owner tries to buy a player beyond their budget?
A: The server action calculates $\text{remaining} = \text{budget} - \text{spent}$. If $\text{soldPrice} > \text{remaining}$, the action throws an error and prevents the transaction from committing.
