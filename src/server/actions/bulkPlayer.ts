"use server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str } from "@/lib/validators";
import { parsePlayers, slugifyName, MAX_ROWS, type ParsedPlayer } from "@/lib/bulkPlayers";

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("Admins only");
  return sess;
}

export type BulkImportResult = {
  ok?: true;
  error?: string;
  imported?: number;
  skipped?: number;
  failures?: { line: number; name: string; reason: string }[];
  defaultPassword?: string;
  emailDomain?: string;
} | null;

const EMAIL_DOMAIN = "arenacast.local";

/** Build a unique email for a row, avoiding both DB and same-batch collisions. */
async function uniqueEmail(name: string, taken: Set<string>): Promise<string> {
  const local = slugifyName(name);
  for (let i = 0; i < 1000; i++) {
    const candidate = `${local}${i === 0 ? "" : i + 1}@${EMAIL_DOMAIN}`;
    if (taken.has(candidate)) continue;
    const exists = await prisma.user.findUnique({ where: { email: candidate }, select: { id: true } });
    if (!exists) { taken.add(candidate); return candidate; }
    taken.add(candidate);
  }
  // extreme fallback — effectively never hit
  const rand = `${local}.${Date.now().toString(36)}@${EMAIL_DOMAIN}`;
  taken.add(rand);
  return rand;
}

export async function bulkImportPlayersAction(
  _prev: BulkImportResult,
  formData: FormData,
): Promise<BulkImportResult> {
  try {
    await adminGuard();

    const raw = str(formData.get("data"), { required: true });
    const password = str(formData.get("password"), { required: true, min: 6, max: 100 });

    // Re-parse server-side — never trust the client's preview.
    const { rows, errors, headerOk, missingColumns } = parsePlayers(raw);

    if (!headerOk) {
      return { error: `Missing required column(s): ${missingColumns.join(", ")}. The header row must include at least "name" and "sport".` };
    }
    if (rows.length === 0) {
      return { error: errors.length ? `No valid rows — every row had an error (${errors.length}).` : "No data rows found. Paste rows below the header." };
    }
    if (rows.length > MAX_ROWS) {
      return { error: `Too many rows (${rows.length}). Import at most ${MAX_ROWS} at a time.` };
    }

    const passwordHash = await hashPassword(password);
    const failures = errors.map(e => ({ line: e.line, name: e.name, reason: e.reason }));
    const takenEmails = new Set<string>();
    let imported = 0;

    // Pre-resolve emails (needs DB lookups) before opening the write transaction.
    const prepared: { row: ParsedPlayer; email: string; provided: boolean }[] = [];
    for (const row of rows) {
      if (row.email) {
        const dup = await prisma.user.findUnique({ where: { email: row.email }, select: { id: true } });
        if (dup || takenEmails.has(row.email)) {
          failures.push({ line: row.line, name: row.name, reason: `email "${row.email}" already registered — skipped` });
          continue;
        }
        takenEmails.add(row.email);
        prepared.push({ row, email: row.email, provided: true });
      } else {
        const email = await uniqueEmail(row.name, takenEmails);
        prepared.push({ row, email, provided: false });
      }
    }

    // Insert each player + draft profile. One transaction per player keeps a
    // single bad row from nuking the whole batch, while staying atomic per user.
    for (const { row, email } of prepared) {
      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email, name: row.name, role: "PLAYER", passwordHash },
          });
          await tx.playerProfile.create({
            data: {
              userId: user.id,
              sport: row.sport,
              status: "SUBMITTED", // lands in the admin Pending queue
              basePrice: row.basePrice,
              city: row.city,
              phone: row.phone,
              bio: row.bio,
              photoUrl: row.photoUrl,
              session: row.session,
              experienceYears: row.experienceYears,
              cricketRole: row.sport === "CRICKET" ? row.role : null,
              footballPosition: row.sport === "FOOTBALL" ? row.role : null,
            },
          });
        });
        imported++;
      } catch (e) {
        failures.push({ line: row.line, name: row.name, reason: e instanceof Error ? e.message : "insert failed" });
      }
    }

    revalidatePath("/admin/players");
    revalidatePath("/players");

    if (imported === 0) {
      return { error: "Nothing imported — see the row errors below.", imported: 0, skipped: failures.length, failures };
    }

    return {
      ok: true,
      imported,
      skipped: failures.length,
      failures,
      defaultPassword: password,
      emailDomain: EMAIL_DOMAIN,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed" };
  }
}
