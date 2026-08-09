import type { EffortMode, MealType, Unit } from "@stockpot/shared";
import type { NewRecipe } from "./recipe.js";

/**
 * ★ LLM 境界のポート（設計書 §3 ①）。
 *
 * AI SDK / Mastra の型を domain / application に漏らさない。この interface の
 * おかげで、LangChain → Vercel AI SDK の変更がアダプタ 1 ファイルの差し替えで
 * 済む。テストではスタブに差し替えてトークンを消費せず検証できる。
 */

/** 生成時に LLM へ渡す在庫スナップショット。 */
export interface InventorySnapshotItem {
  id: string; // itm_xxx。LLM に返させる sourceItemId の元
  name: string;
  storageType: "PANTRY" | "FRIDGE" | "FREEZER";
  quantity: number;
  unit: Unit;
  expiryDate: Date | null;
  expiryType: "BEST_BEFORE" | "CONSUME_BY" | null;
}

export interface GenerateRecipesParams {
  items: InventorySnapshotItem[];
  mealType: MealType;
  effortMode: EffortMode;
}

export interface RecipeGenerator {
  /**
   * 在庫と条件からレシピを 3 件生成する。
   * `mealType` / `effortMode` は入力値なので実装側で各レシピに付与する。
   */
  generate(params: GenerateRecipesParams): Promise<NewRecipe[]>;
}
