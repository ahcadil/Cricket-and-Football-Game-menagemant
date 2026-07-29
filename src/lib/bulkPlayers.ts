// Pure, framework-agnostic parser for bulk player import.
// Accepts CSV (comma) or Excel-paste (tab) text, RFC-4180-ish quote handling.
// Supports Google Drive links (automatically converted to direct image embed URLs).

export type Sport = "CRICKET" | "FOOTBALL";

export interface ParsedPlayer {
  line: number;              // 1-based source row (incl. header) for error messages
  name: string;
  sport: Sport;
  email: string | null;      // provided + validated, or null → generate at import time
  city: string | null;
  role: string | null;       // resolved cricketRole (BAT/BOWL/AR/WK) or footballPosition (GK/DEF/MID/FWD)
  basePrice: number;
  experienceYears: number;
  phone: string | null;
  bio: string | null;
  photoUrl: string | null;   // Converted Google Drive URL or direct image URL
  session: string | null;    // e.g. "23-24", "24-25", "25-26", "22-23"
}

export interface RowError { line: number; name: string; reason: string }

export interface ParseResult {
  rows: ParsedPlayer[];
  errors: RowError[];
  headerOk: boolean;
  missingColumns: string[];  // required columns not found in the header
  total: number;             // data rows seen (excl. header)
}

export const MAX_ROWS = 500;

export const TEMPLATE_HEADERS = [
  "name", "sport", "email", "city", "role", "basePrice", "experienceYears", "session", "phone", "bio", "photoUrl",
] as const;

export const CSV_TEMPLATE =
  TEMPLATE_HEADERS.join(",") + "\n" +
  [
    "Virat Kohli,CRICKET,,Delhi,BAT,50M,12,24-25,,Top-order batter,https://drive.google.com/open?id=1op-ECnlhkxQSfazdo5WRXgyIS7m2kW1C",
    "Jasprit Bumrah,CRICKET,jasprit@example.com,Ahmedabad,BOWL,50M,9,24-25,,Yorker specialist,",
    "Ravindra Jadeja,CRICKET,,Rajkot,AR,50M,11,23-24,,Left-arm spin all-rounder,",
    "Lionel Messi,FOOTBALL,,Rosario,FWD,100M,20,24-25,,Playmaker & finisher,",
    "Virgil van Dijk,FOOTBALL,,Breda,DEF,50M,13,23-24,,Commanding centre-back,",
  ].join("\n") + "\n";

/** Convert Google Drive links into high-speed direct CDN image embed URLs */
export function convertGoogleDriveUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Pattern 2: https://drive.google.com/open?id=FILE_ID or /uc?id=FILE_ID or ?id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  }

  // Direct image URL or local relative path
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed;
}

// ── header synonyms → canonical key ───────────────────────────────────────
const HEADER_ALIASES: Record<string, string> = {
  name: "name", playername: "name", fullname: "name", player: "name",
  sport: "sport", game: "sport",
  email: "email", mail: "email", emailaddress: "email",
  city: "city", town: "city", location: "city",
  role: "role", position: "role", pos: "role", cricketrole: "role", footballposition: "role",
  baseprice: "basePrice", base: "basePrice", price: "basePrice",
  experienceyears: "experienceYears", experience: "experienceYears", exp: "experienceYears", years: "experienceYears",
  session: "session", season: "session", year: "session", playersession: "session",
  phone: "phone", mobile: "phone", contact: "phone",
  bio: "bio", about: "bio", notes: "bio", description: "bio",
  photourl: "photoUrl", photo: "photoUrl", image: "photoUrl", img: "photoUrl", drive: "photoUrl", drivelink: "photoUrl", picture: "photoUrl", avatar: "photoUrl",
};

const CRICKET_ROLES: Record<string, string> = {
  bat: "BAT", batsman: "BAT", batter: "BAT", batting: "BAT",
  bowl: "BOWL", bowler: "BOWL", bowling: "BOWL",
  ar: "AR", allrounder: "AR", "all-rounder": "AR", allround: "AR",
  wk: "WK", keeper: "WK", wicketkeeper: "WK", "wicket-keeper": "WK", wkbatsman: "WK",
};
const FOOTBALL_POS: Record<string, string> = {
  gk: "GK", goalkeeper: "GK", keeper: "GK",
  def: "DEF", defender: "DEF", defence: "DEF", defense: "DEF", cb: "DEF", fullback: "DEF",
  mid: "MID", midfielder: "MID", midfield: "MID", cm: "MID",
  fwd: "FWD", forward: "FWD", striker: "FWD", st: "FWD", attacker: "FWD", winger: "FWD",
};

function normKey(s: string) {
  return s.trim().toLowerCase().replace(/[\s_]+/g, "");
}

/** State-machine parse handling quoted fields, escaped quotes, and quoted newlines. */
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\r") {
      // ignore; \n handles the break
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  row.push(field);
  rows.push(row);
  // drop fully-empty rows
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.includes("\t") ? "\t" : ",";
}

function parseSport(v: string): Sport | null {
  const s = v.trim().toLowerCase();
  if (["cricket", "c", "🏏"].includes(s)) return "CRICKET";
  if (["football", "soccer", "f", "⚽"].includes(s)) return "FOOTBALL";
  return null;
}

function parseRole(v: string, sport: Sport): string | null {
  const s = v.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const map = sport === "CRICKET" ? CRICKET_ROLES : FOOTBALL_POS;
  return map[s] ?? null;
}

/** Parse "5M" / "500k" / "5,00,000" / "₹900000" → integer rupees. Returns NaN on garbage. */
export function parseMoney(v: string): number {
  let s = v.trim().toLowerCase().replace(/[₹$,\s]/g, "");
  if (s === "") return 0;
  let mult = 1;
  if (s.endsWith("m")) { mult = 1_000_000; s = s.slice(0, -1); }
  else if (s.endsWith("k")) { mult = 1_000; s = s.slice(0, -1); }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * mult) : NaN;
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Parse raw pasted/uploaded text into validated player rows + per-row errors. */
export function parsePlayers(text: string): ParseResult {
  const delim = detectDelimiter(text);
  const grid = parseDelimited(text, delim);

  if (grid.length === 0) {
    return { rows: [], errors: [], headerOk: false, missingColumns: ["name", "sport"], total: 0 };
  }

  // header → canonical column index
  const header = grid[0].map(h => HEADER_ALIASES[normKey(h)] ?? normKey(h));
  const idx = (key: string) => header.indexOf(key);
  const missing = ["name", "sport"].filter(k => idx(k) === -1);
  if (missing.length) {
    return { rows: [], errors: [], headerOk: false, missingColumns: missing, total: grid.length - 1 };
  }

  const cell = (r: string[], key: string) => {
    const i = idx(key);
    return i === -1 ? "" : (r[i] ?? "").trim();
  };

  const rows: ParsedPlayer[] = [];
  const errors: RowError[] = [];

  for (let g = 1; g < grid.length; g++) {
    const line = g + 1; // 1-based, header is line 1
    const r = grid[g];
    const name = cell(r, "name");
    const nameForErr = name || "(unnamed)";

    if (!name || name.length < 2) { errors.push({ line, name: nameForErr, reason: "name is required (min 2 chars)" }); continue; }
    if (name.length > 80) { errors.push({ line, name: nameForErr, reason: "name too long (max 80)" }); continue; }

    const sport = parseSport(cell(r, "sport"));
    if (!sport) { errors.push({ line, name: nameForErr, reason: `sport must be CRICKET or FOOTBALL (got "${cell(r, "sport")}")` }); continue; }

    const emailRaw = cell(r, "email");
    let email: string | null = null;
    if (emailRaw) {
      const e = emailRaw.toLowerCase();
      if (!isEmail(e)) { errors.push({ line, name: nameForErr, reason: `invalid email "${emailRaw}"` }); continue; }
      email = e;
    }

    const roleRaw = cell(r, "role");
    const role = roleRaw ? parseRole(roleRaw, sport) : null;
    if (roleRaw && !role) {
      errors.push({ line, name: nameForErr, reason: `unknown ${sport === "CRICKET" ? "role" : "position"} "${roleRaw}"` });
      continue;
    }

    const basePrice = parseMoney(cell(r, "basePrice"));
    if (Number.isNaN(basePrice)) { errors.push({ line, name: nameForErr, reason: `invalid basePrice "${cell(r, "basePrice")}"` }); continue; }
    if (basePrice < 0) { errors.push({ line, name: nameForErr, reason: "basePrice cannot be negative" }); continue; }

    const expRaw = cell(r, "experienceYears");
    let experienceYears = 0;
    if (expRaw) {
      const n = Number(expRaw);
      if (!Number.isInteger(n) || n < 0 || n > 60) { errors.push({ line, name: nameForErr, reason: `invalid experienceYears "${expRaw}"` }); continue; }
      experienceYears = n;
    }

    const photoRaw = cell(r, "photoUrl");
    const photoUrl = convertGoogleDriveUrl(photoRaw);
    const session = cell(r, "session") || null;

    rows.push({
      line, name, sport, email,
      city: cell(r, "city") || null,
      role,
      basePrice,
      experienceYears,
      phone: cell(r, "phone") || null,
      bio: (cell(r, "bio") || null)?.slice(0, 500) ?? null,
      photoUrl,
      session,
    });
  }

  return { rows, errors, headerOk: true, missingColumns: [], total: grid.length - 1 };
}

/** name → email local part, e.g. "Virat Kohli" → "virat.kohli". */
export function slugifyName(name: string): string {
  const base = name
    .normalize("NFKD").replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return base || "player";
}
