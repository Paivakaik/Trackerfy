import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// SQLite relativo em DATABASE_URL é resolvido de forma inconsistente entre a
// CLI do Prisma (relativa a prisma/schema.prisma) e o client em runtime
// (relativa ao cwd do processo). Para o client, forçamos um caminho absoluto
// calculado a partir do cwd atual, assim o projeto funciona em qualquer pasta
// sem precisar editar o .env.
const sqliteFile =
  "file:" + path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");

const isSqlite = (process.env.DATABASE_URL || "").startsWith("file:");

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(isSqlite ? { datasources: { db: { url: sqliteFile } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
