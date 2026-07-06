// SQLite stores these as strings; application validators (validators.ts) gate writes.
// If you migrate to Postgres, re-introduce real enums in schema.prisma and
// replace these with `import type { Role, Sport, ... } from "@prisma/client"`.

export type Role = "ADMIN" | "PLAYER" | "TEAM_OWNER" | "VIEWER";
export type Sport = "CRICKET" | "FOOTBALL";
export type PlayerStatus =
  | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
  | "ON_AUCTION" | "SOLD" | "UNSOLD";
export type CricketRole = "BAT" | "BOWL" | "AR" | "WK";
export type FootballPosition = "GK" | "DEF" | "MID" | "FWD";
export type Foot = "LEFT" | "RIGHT" | "BOTH";
export type MatchStatus = "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
export type TossDecision = "BAT" | "BOWL";
export type WicketType = "BOWLED" | "CAUGHT" | "LBW" | "RUNOUT" | "STUMPED" | "HITWICKET";
export type ExtraType = "WIDE" | "NOBALL" | "BYE" | "LEGBYE";
export type FootballEventType =
  | "GOAL" | "OWN_GOAL" | "YELLOW" | "RED"
  | "SUB_IN" | "SUB_OUT" | "PENALTY" | "MISSED_PEN";
