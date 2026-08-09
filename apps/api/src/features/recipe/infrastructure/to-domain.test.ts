import { describe, expect, it } from "vitest";
import { RecipeListSchema } from "@stockpot/shared";
import { toDomain } from "./to-domain.js";
import fixture from "../__fixtures__/generated-recipe.json" with { type: "json" };

/**
 * 設計書 §18.5: LLM の出力「内容」はテストしない。マッピングのみをテストする。
 */
describe("toDomain", () => {
  // fixture が Zod スキーマ（LLM の契約）を満たすことをまず担保する
  const list = RecipeListSchema.parse(fixture);

  it("生成結果をドメインエンティティに変換できる", () => {
    const recipes = toDomain(list, { mealType: "DINNER", effortMode: "EASY" });

    expect(recipes).toHaveLength(3);
    expect(recipes[0]?.ingredients[0]?.deductQuantity).toBe(200);
    expect(recipes[0]?.steps[0]?.method).toBe("THAW");
  });

  it("入力値の mealType / effortMode を各レシピに付与する", () => {
    const recipes = toDomain(list, { mealType: "LUNCH", effortMode: "ELABORATE" });
    for (const r of recipes) {
      expect(r.mealType).toBe("LUNCH");
      expect(r.effortMode).toBe("ELABORATE");
    }
  });

  it("「適量」は deductQuantity / deductUnit が null のまま保たれる", () => {
    const recipes = toDomain(list, { mealType: "DINNER", effortMode: "EASY" });
    const miso = recipes[0]?.ingredients[1];
    expect(miso?.amountText).toBe("適量");
    expect(miso?.deductQuantity).toBeNull();
    expect(miso?.deductUnit).toBeNull();
  });
});
