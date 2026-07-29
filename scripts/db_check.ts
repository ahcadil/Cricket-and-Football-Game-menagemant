import { prisma } from "../src/lib/db";

async function checkDatabase() {
  console.log("=== STARTING EXPERT DATABASE HEALTH & CONNECTION AUDIT ===");

  try {
    // 1. Enable WAL Journal Mode for high performance concurrent read/write
    const walResult = await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    console.log("✅ SQLite Journal Mode WAL enabled:", walResult);

    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
    console.log("✅ SQLite Synchronous PRAGMA set to NORMAL");

    // 2. Test Connection & Count All Core Entities
    const [userCount, teamCount, playerProfileCount, matchCount, auctionLogCount] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.playerProfile.count(),
      prisma.match.count(),
      prisma.auctionLog.count(),
    ]);

    console.log("✅ Database Entities Count:");
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Teams: ${teamCount}`);
    console.log(`   - Player Profiles: ${playerProfileCount}`);
    console.log(`   - Matches: ${matchCount}`);
    console.log(`   - Auction Logs: ${auctionLogCount}`);

    // 3. Foreign Key Integrity Check
    const fkCheck = await prisma.$queryRawUnsafe<any[]>("PRAGMA foreign_key_check;");
    if (fkCheck.length === 0) {
      console.log("✅ Foreign Key Integrity Check PASSED! Zero orphaned records.");
    } else {
      console.warn("⚠️ Foreign Key Violations Found:", fkCheck);
    }

    console.log("=== DATABASE HEALTH AUDIT COMPLETED CLEANLY ===");
  } catch (error) {
    console.error("❌ Database Health Audit Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
