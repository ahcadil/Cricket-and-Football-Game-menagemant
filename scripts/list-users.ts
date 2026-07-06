import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    include: { playerProfile: { include: { team: true } }, ownedTeam: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  console.log("\nTOTAL USERS:", users.length, "\n");
  for (const u of users) {
    console.log(`${u.role.padEnd(11)} | ${u.email.padEnd(34)} | ${u.name}`);
    if (u.ownedTeam) console.log(`             ↳ owns: ${u.ownedTeam.name} (budget ${u.ownedTeam.budget}, spent ${u.ownedTeam.spent})`);
    if (u.playerProfile) {
      const p = u.playerProfile;
      const role = p.sport === "CRICKET" ? p.cricketRole : p.footballPosition;
      console.log(`             ↳ player: ${p.sport} ${role ?? "-"} | status=${p.status} | base=${p.basePrice}${p.team ? ` | team=${p.team.name}` : ""}`);
    }
  }
  await prisma.$disconnect();
})();
