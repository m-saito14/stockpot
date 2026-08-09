import type { EffortMode, MealType, RecipeList } from "@stockpot/shared";
import type { NewRecipe } from "../domain/recipe.js";

/**
 * LLM の構造化出力（RecipeList）をドメインエンティティへ変換する（設計書 §18.5）。
 *
 * これがテスト対象。LLM の出力「内容」はテストしない（毎回変わる・遅い・課金される）。
 * 「スキーマ通りの JSON が来たら正しくドメインに変換できるか」だけを見る。
 *
 * mealType / effortMode は入力値なのでここで付与する（§15.4）。
 */
export function toDomain(
  list: RecipeList,
  context: { mealType: MealType; effortMode: EffortMode },
): NewRecipe[] {
  return list.recipes.map((r) => ({
    title: r.title,
    description: r.description,
    mealType: context.mealType,
    effortMode: context.effortMode,
    estimatedMin: r.estimatedMin,
    ingredients: r.ingredients.map((ing) => ({
      name: ing.name,
      amountText: ing.amountText,
      sourceItemId: ing.sourceItemId,
      deductQuantity: ing.deductQuantity,
      deductUnit: ing.deductUnit,
    })),
    steps: r.steps.map((s) => ({
      order: s.order,
      instruction: s.instruction,
      method: s.method,
    })),
  }));
}
