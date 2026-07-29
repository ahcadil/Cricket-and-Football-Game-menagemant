# 🏆 ArenaCast — Cricket & Football Tournament Platform

> **End-to-end sports tournament management**: Player registration → Admin approval → Live bidding auction → Real-time ball-by-ball & minute-by-minute scoring → Auto-derived standings.

---

## 📌 Executive Summary

**ArenaCast** is a modern, high-performance web platform designed to streamline amateur and professional sports tournaments for both **Cricket** and **Football**. Built using Next.js 15 App Router, Prisma ORM, and Server-Sent Events (SSE), ArenaCast eliminates administrative friction by providing real-time data synchronization across administrators, team franchise owners, players, and spectators.

---

## 📚 Documentation Index

For in-depth technical details, architecture specs, and user manuals, refer to the dedicated documentation files:

* 📐 **[ARCHITECTURE.md](file:///f:/game%20build/ARCHITECTURE.md)** — Architectural design, database ERD, SSE pub/sub streaming engine, RBAC security, and business logic.
* 📡 **[API_DOCUMENTATION.md](file:///f:/game%20build/API_DOCUMENTATION.md)** — Complete specifications for REST endpoints, SSE channels, and Server Actions.
* 📖 **[USER_GUIDE.md](file:///f:/game%20build/USER_GUIDE.md)** — Step-by-step operational manual for Admins, Team Owners, Players, and Spectators.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) | Server Components, Server Actions, API Routes |
| **Frontend** | [React 19 RC](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) | Type-safe interactive user interface |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Sports-themed design system (`brand` pitch green, `gold` accents) |
| **Database & ORM** | [Prisma 5](https://www.prisma.io/) + [SQLite](https://www.sqlite.org/) (Dev) / [PostgreSQL](https://www.postgresql.org/) (Prod) | Schema migrations, type-safe queries, transaction support |
| **Real-time Engine** | Server-Sent Events (SSE) via Web ReadableStreams | Zero-dependency real-time event broadcasting |
| **Security & Auth** | `jose` (JWT in `httpOnly` cookies) + `bcryptjs` | Role-based authorization & password hashing |

---

## ✨ Key Features

1. 🏏⚽ **Dual-Sport Native Support**: Full sport-aware profile fields, scoring rules, and standings algorithms for Cricket and Football.
2. 🔨 **Live Bidding Auction Engine**: Real-time SSE auction block broadcasting `ON_BLOCK`, `SOLD`, `UNSOLD`, and `CLEAR` events to all connected franchise owners and spectators.
3. 💰 **Per-Team Budget Cap & Validation**: Automatic budget verification preventing franchise owners from exceeding spending limits during auctions.
4. 📊 **Real-time Cricket Scorecard**: Ball-by-ball commentary, current run rate (CRR), required run rate (RRR), last 6 balls ticker, and fall of wickets.
5. ⚽ **Real-time Football Timeline**: Minute-stamped timeline with goal, yellow card, red card, substitution icons, and derived scores.
6. 📈 **Auto-Derived Standings**: Instant points table calculation (2 points for Win, 1 point for Draw/Tie) with Net Run Rate (Cricket) & Goal Difference (Football).
7. 🛡️ **Role-Based Access Control (RBAC)**: Enforced via `middleware.ts` across `ADMIN`, `TEAM_OWNER`, `PLAYER`, and `VIEWER` roles.
8. 📁 **Photo Upload System**: Multipart file upload writing directly to public storage.
9. 🔒 **Recurring 13-Player Auction Lock & Developer Credit**: Automatically locks the auction room after **every 13 completed player auctions** (13, 26, 39, etc.), displaying developer credit (`Developed by AHC ADIL , CONTRACT:01988623349`) and requiring secret code (`623349`) to unlock and continue each batch.

---

## ⚡ Quickstart Guide

### Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **npm**: `v9.x` or later

### Step 1: Clone & Install Dependencies
```bash
git clone <repository-url>
cd "game build"
npm install
```

### Step 2: Configure Environment Variables
Verify `.env` configuration in the project root:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production-this-must-be-a-long-random-string-min-32-chars"
NEXT_PUBLIC_APP_NAME="ArenaCast"
```

### Step 3: Initialize Database Schema
```bash
npm run db:push
```

### Step 4: Seed Demo Data
Populate the database with sample admin, team owners, teams, and registered players:
```bash
npm run db:seed
```

### Step 5: Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🗝️ Seed Demo Credentials

When running `npm run db:seed`, the following test accounts are created automatically:

| Role | Email Address | Password | Description |
| --- | --- | --- | --- |
| **Admin** | `admin@arenacast.local` | `changeme` | Full administrative permissions (Approve players, host auction, schedule & score matches) |
| **Team Owner** | `owner.mum@arenacast.local` | `ownerpass` | Owner of Mumbai Mavericks |
| **Team Owner** | `owner.del@arenacast.local` | `ownerpass` | Owner of Delhi Dynamos |
| **Team Owner** | `owner.lon@arenacast.local` | `ownerpass` | Owner of London Lions |
| **Team Owner** | `owner.brc@arenacast.local` | `ownerpass` | Owner of Barcelona Bulls |
| **Player** | `rohit@arenacast.local` | `playerpass` | Registered Cricket Player (Batsman) |
| **Player** | `messi@arenacast.local` | `playerpass` | Registered Football Player (Forward) |

---

## 🌐 Route Directory

### 🔓 Public Routes (Unauthenticated)
* [`/`](file:///f:/game%20build/src/app/page.tsx) — Main landing dashboard with live stats and quick links.
* [`/players`](file:///f:/game%20build/src/app/(public)/players/page.tsx) — Searchable roster (filter by sport, role, status, name).
* [`/players/[id]`](file:///f:/game%20build/src/app/(public)/players/[id]/page.tsx) — Individual player profile & career stats.
* [`/teams`](file:///f:/game%20build/src/app/(public)/teams/page.tsx) — Franchise directory.
* [`/teams/[id]`](file:///f:/game%20build/src/app/(public)/teams/[id]/page.tsx) — Team profile, budget, roster, and fixtures.
* [`/matches`](file:///f:/game%20build/src/app/(public)/matches/page.tsx) — Match center (Live, Upcoming, and Results tabs).
* [`/matches/[id]`](file:///f:/game%20build/src/app/(public)/matches/[id]/page.tsx) — Real-time live scoreboard feed (SSE).
* [`/auction`](file:///f:/game%20build/src/app/(public)/auction/page.tsx) — Real-time live auction spectator view (SSE).
* [`/standings`](file:///f:/game%20build/src/app/(public)/standings/page.tsx) — Derived points tables for Cricket & Football.

### 🔐 Authenticated Routes
* [`/login`](file:///f:/game%20build/src/app/(auth)/login/page.tsx) & [`/register`](file:///f:/game%20build/src/app/(auth)/register/page.tsx) — Authentication flow.
* [`/profile`](file:///f:/game%20build/src/app/(player)/profile/page.tsx) — Player profile editor (sport-aware fields).
* [`/dashboard`](file:///f:/game%20build/src/app/(player)/dashboard/page.tsx) — Player personal hub.
* [`/my-team`](file:///f:/game%20build/src/app/(owner)/my-team/page.tsx) — Franchise Owner cockpit.

### 🛡️ Admin Routes (Role: `ADMIN`)
* [`/admin`](file:///f:/game%20build/src/app/(admin)/admin/page.tsx) — Executive Admin Dashboard & system KPIs.
* [`/admin/players`](file:///f:/game%20build/src/app/(admin)/admin/players/page.tsx) — Player registration approval panel & base price management.
* [`/admin/teams`](file:///f:/game%20build/src/app/(admin)/admin/teams/page.tsx) — Team franchise creation & owner assignment.
* [`/admin/auction`](file:///f:/game%20build/src/app/(admin)/admin/auction/page.tsx) — Live Auction Control Desk (Put player on block, record sold price, refund budget).
* [`/admin/matches`](file:///f:/game%20build/src/app/(admin)/admin/matches/page.tsx) — Fixture scheduling.
* [`/admin/matches/[id]/score`](file:///f:/game%20build/src/app/(admin)/admin/matches/[id]/score/page.tsx) — Live Match Scoring Control Panel.

---

## 📜 Available NPM Scripts

```bash
npm run dev        # Launch development server at http://localhost:3000
npm run build      # Build production bundle
npm run start      # Start production server
npm run lint       # Execute ESLint checks
npm run db:push    # Push Prisma schema updates to SQLite database
npm run db:seed    # Seed initial system data
npm run db:studio  # Launch interactive Prisma Studio GUI
```

---

## 📄 License

Distributed under the MIT License.
