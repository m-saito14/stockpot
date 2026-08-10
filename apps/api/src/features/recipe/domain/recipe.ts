import type { CookMethod, EffortMode, MealType, Unit } from "@stockpot/shared";

/**
 * レシピのドメインエンティティ。
 * Prisma / AI SDK の生成型をここに漏らさない（設計書 §3 の 2 境界）。
 */

export interface RecipeIngredient {
  name: string; // 生成時点のスナップショット
  amountText: string; // 表示用: "200g" / "適量"
  sourceItemId: string | null; // 参照した在庫 ID（任意リンク）
  deductQuantity: number | null; // 減算用。不明なら null
  deductUnit: Unit | null;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  method: CookMethod;
}

/** 保存前の、生成されたレシピ 1 件。 */
export interface NewRecipe {
  title: string;
  description: string;
  mealType: MealType;
  effortMode: EffortMode;
  estimatedMin: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

/** 永続化済みのレシピ。 */
export interface Recipe extends NewRecipe {
  id: string;
  userId: string;
  isFavorite: boolean;
  cookedCount: number;
  lastCookedAt: Date | null;
  createdAt: Date;
}
