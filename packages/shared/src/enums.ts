import { z } from "zod";

/**
 * ドメイン列挙。Prisma スキーマの enum と 1:1 で対応させる（設計書 §12）。
 * Zod enum を単一の真実とし、そこから TS 型を導出する。
 */

export const StorageTypeSchema = z.enum(["PANTRY", "FRIDGE", "FREEZER"]); // 常温 / 冷蔵 / 冷凍
export type StorageType = z.infer<typeof StorageTypeSchema>;

export const ExpiryTypeSchema = z.enum(["BEST_BEFORE", "CONSUME_BY"]); // 賞味期限 / 消費期限
export type ExpiryType = z.infer<typeof ExpiryTypeSchema>;

export const UnitSchema = z.enum(["PIECE", "GRAM", "MILLILITER", "PACK", "BUNCH"]);
export type Unit = z.infer<typeof UnitSchema>;

export const MealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const EffortModeSchema = z.enum(["EASY", "ELABORATE"]); // お手軽 / 本格
export type EffortMode = z.infer<typeof EffortModeSchema>;

export const CookMethodSchema = z.enum([
  "PREP", // 下ごしらえ 🔪
  "STOVE", // コンロ 🔥
  "MICROWAVE", // レンジ ⚡️
  "OVEN", // オーブン 🔆
  "TOASTER", // トースター 🍞
  "THAW", // 解凍 ❄️
  "NONE",
]);
export type CookMethod = z.infer<typeof CookMethodSchema>;
