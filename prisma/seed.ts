import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ArenaCast…");

  const adminPw = await bcrypt.hash("changeme", 10);
  const ownerPw = await bcrypt.hash("ownerpass", 10);
  const playerPw = await bcrypt.hash("playerpass", 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@arenacast.local" },
    update: {},
    create: { email: "admin@arenacast.local", name: "Tournament Admin", role: "ADMIN", passwordHash: adminPw },
  });

  // Owners (4)
  const ownerSpecs = [
    { email: "owner.mum@arenacast.local", name: "Mumbai Owner" },
    { email: "owner.del@arenacast.local", name: "Delhi Owner" },
    { email: "owner.lon@arenacast.local", name: "London Owner" },
    { email: "owner.brc@arenacast.local", name: "Barcelona Owner" },
  ];
  const owners = await Promise.all(ownerSpecs.map(o =>
    prisma.user.upsert({
      where: { email: o.email },
      update: { role: "TEAM_OWNER" },
      create: { email: o.email, name: o.name, role: "TEAM_OWNER", passwordHash: ownerPw },
    })
  ));

  // Teams (2 cricket + 2 football)
  const teamSpecs = [
    { name: "Mumbai Mavericks", sport: "CRICKET" as const, ownerId: owners[0].id, primaryColor: "#0ea5e9", tagline: "Born to roar." },
    { name: "Delhi Dynamos",   sport: "CRICKET" as const, ownerId: owners[1].id, primaryColor: "#dc2626", tagline: "Capital fire." },
    { name: "London Lions",    sport: "FOOTBALL" as const, ownerId: owners[2].id, primaryColor: "#f59e0b", tagline: "On the prowl." },
    { name: "Barcelona Bulls", sport: "FOOTBALL" as const, ownerId: owners[3].id, primaryColor: "#7c3aed", tagline: "Charge ahead." },
  ];
  const teams: { id: string; sport: "CRICKET" | "FOOTBALL"; name: string }[] = [];
  for (const t of teamSpecs) {
    const team = await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: { ...t, budget: 5_000_000, spent: 0 },
    });
    teams.push({ id: team.id, sport: team.sport as "CRICKET" | "FOOTBALL", name: team.name });
  }

  // Players — 8 total, mix of statuses
  const playerSpecs = [
    // Cricket
    { email: "rohit@arenacast.local",  name: "Rohit Strike",   sport: "CRICKET" as const, cricketRole: "BAT" as const,  city: "Mumbai",    status: "APPROVED" as const,  basePrice: 600_000 },
    { email: "jadeja@arenacast.local", name: "Jasper Hadley",  sport: "CRICKET" as const, cricketRole: "AR" as const,   city: "Delhi",     status: "APPROVED" as const,  basePrice: 400_000 },
    { email: "bumrah@arenacast.local", name: "Bumi Rahman",    sport: "CRICKET" as const, cricketRole: "BOWL" as const, city: "Ahmedabad", status: "SUBMITTED" as const, basePrice: 0 },
    { email: "dhoni@arenacast.local",  name: "Mahi Kapoor",    sport: "CRICKET" as const, cricketRole: "WK" as const,   city: "Ranchi",    status: "APPROVED" as const,  basePrice: 800_000 },
    // Football
    { email: "messi@arenacast.local",  name: "Leo Mendoza",    sport: "FOOTBALL" as const, footballPosition: "FWD" as const, city: "Rosario",     status: "APPROVED" as const,  basePrice: 900_000 },
    { email: "ronaldo@arenacast.local",name: "Cris Ronaldo",   sport: "FOOTBALL" as const, footballPosition: "FWD" as const, city: "Madeira",     status: "APPROVED" as const,  basePrice: 850_000 },
    { email: "modric@arenacast.local", name: "Luka Marković",  sport: "FOOTBALL" as const, footballPosition: "MID" as const, city: "Zagreb",      status: "APPROVED" as const,  basePrice: 500_000 },
    { email: "vandyk@arenacast.local", name: "Virgil Stone",   sport: "FOOTBALL" as const, footballPosition: "DEF" as const, city: "Amsterdam",   status: "DRAFT" as const,     basePrice: 0 },
  ];

  for (const p of playerSpecs) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { email: p.email, name: p.name, role: "PLAYER", passwordHash: playerPw },
    });
    await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        sport: p.sport,
        city: p.city,
        status: p.status,
        basePrice: p.basePrice,
        experienceYears: 5,
        heightCm: 175,
        weightKg: 72,
        cricketRole: "cricketRole" in p ? p.cricketRole : undefined,
        footballPosition: "footballPosition" in p ? p.footballPosition : undefined,
        approvedById: p.status === "APPROVED" ? admin.id : null,
        approvedAt: p.status === "APPROVED" ? new Date() : null,
      },
    });
  }

  console.log("✅ Seed complete.");
  console.log("   Admin:        admin@arenacast.local / changeme");
  console.log("   Team Owners:  owner.mum@arenacast.local / ownerpass  (4 total)");
  console.log("   Players:      rohit@arenacast.local / playerpass     (8 total)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
