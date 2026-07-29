import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Configure SQLite WAL mode & 64MB RAM query cache for lightning fast database reads/writes
prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;").catch(() => {});
prisma.$queryRawUnsafe("PRAGMA cache_size=-64000;").catch(() => {});
prisma.$queryRawUnsafe("PRAGMA temp_store=MEMORY;").catch(() => {});
prisma.$queryRawUnsafe("PRAGMA mmap_size=268435456;").catch(() => {});
