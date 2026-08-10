import type {
  GenerateRecipesParams,
  RecipeGenerator,
} from "../domain/recipe-generator.js";
import type { NewRecipe } from "../domain/recipe.js";

/**
 * スタブの RecipeGenerator（設計書 §18.4）。
 * `__mocks__` に置かず、プロダクションコードとして infrastructure に置く:
 * - ローカル開発で UI を触るとき（トークンを消費しない）
 * - `USE_STUB_LLM=true` で API キーなしで起動する
 *
 * 在庫の先頭数件を材料に使い、常に 3 件返す（RecipeListSchema を満たす）。
 */
export class StubRecipeGenerator implements RecipeGenerator {
  async generate(params: GenerateRecipesParams): Promise<NewRecipe[]> {
    const { items, mealType, effortMode } = params;
    const used = items.slice(0, 3);

    return [0, 1, 2].map((i): NewRecipe => {
      const primary = used[i % Math.max(used.length, 1)];
      return {
        title: `スタブレシピ ${i + 1}`,
        description: `${used.map((it) => it.name).join("・") || "在庫"}で作る${
          effortMode === "EASY" ? "お手軽" : "本格"
        }レシピ`,
        mealType,
        effortMode,
        estimatedMin: effortMode === "EASY" ? 15 : 45,
        ingredients: primary
          ? [
              {
                name: primary.name,
                amountText: `${primary.quantity}${primary.unit}`,
                sourceItemId: primary.id,
                deductQuantity: primary.quantity,
                deductUnit: primary.unit,
              },
            ]
          : [],
        steps: [
          { order: 1, instruction: "材料を切る", method: "PREP" },
          { order: 2, instruction: "加熱する", method: "STOVE" },
        ],
      };
    });
  }
}
