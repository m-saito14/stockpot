import type { EffortMode, MealType } from "@stockpot/shared";
import type { NewRecipe, Recipe } from "./recipe.js";
import type { Deduction } from "./deduction.js";
import type { CookPlanIngredient } from "./cook-plan.js";

/** GET /recipes のフィルタ・ソート（設計書 §14）。 */
export interface RecipeQuery {
  favorite?: boolean;
  mealType?: MealType;
  effortMode?: EffortMode;
  sort?: "createdAt" | "cookedCount" | "lastCookedAt";
}

/** POST /recipes/:id/cook のトランザクション結果。 */
export interface CookResult {
  deletedItemIds: string[];
  updatedItemIds: string[];
}

/**
 * ★ ORM 境界のポート（設計書 §3 ②）。レシピと調理確定を扱う。
 */
export interface RecipeRepository {
  saveMany(userId: string, recipes: NewRecipe[]): Promise<Recipe[]>;
  findMany(userId: string, query: RecipeQuery): Promise<Recipe[]>;
  findById(userId: string, id: string): Promise<Recipe | null>;

  /**
   * cook-plan 用に、材料を ingredientId 付きで返す（設計書 §16.1）。
   * レシピが存在しなければ null。
   */
  findCookPlanIngredients(
    userId: string,
    recipeId: string,
  ): Promise<CookPlanIngredient[] | null>;

  setFavorite(userId: string, id: string, isFavorite: boolean): Promise<Recipe | null>;
  delete(userId: string, id: string): Promise<boolean>;

  /**
   * 設計書 §16.2 のトランザクション:
   * 1. 各 itemId の quantity を減算
   * 2. 0 以下を削除
   * 3. Recipe.cookedCount++ / lastCookedAt 更新
   * 4. CookLog を作成
   * 対象レシピが存在しない（他ユーザー含む）場合は null。
   */
  cook(
    userId: string,
    recipeId: string,
    deductions: Deduction[],
  ): Promise<CookResult | null>;
}
