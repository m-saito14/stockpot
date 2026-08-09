import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 の設定ファイル。接続 URL は schema からここへ移動した。
 * Migrate は driver adapter（@prisma/adapter-pg）経由で DB に接続する。
 * 設計書 §8: 本番は Cloud SQL Connector（Unix ソケット）を使う。
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  adapter: async () =>
    new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});
