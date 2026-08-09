import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * PrismaClient のシングルトン。
 * Prisma 7: driver adapter を PrismaClient に渡す。
 * 設計書 §8: Cloud Run では DB プールをインスタンスあたり 2〜5 に絞る。
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
    // 設計書 §8: インスタンスあたりのプールを 2〜5 に絞る
    max: Number(process.env.DB_POOL_MAX ?? "5"),
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__prisma__ ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}
