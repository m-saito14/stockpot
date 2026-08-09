import { describe, expect, it } from "vitest";
import {
  buildCookPlan,
  type CookPlanIngredient,
  type CurrentInventoryItem,
} from "./cook-plan.js";

const inventory: CurrentInventoryItem[] = [
  { id: "itm_a1", quantity: 300, unit: "GRAM" },
  { id: "itm_d1", quantity: 1, unit: "PACK" },
];

function ingredient(over: Partial<CookPlanIngredient>): CookPlanIngredient {
  return {
    ingredientId: "ing_x",
    name: "食材",
    sourceItemId: null,
    deductQuantity: null,
    deductUnit: null,
    ...over,
  };
}

describe("buildCookPlan", () => {
  it("在庫あり・数量確定・単位一致 → SUGGESTED（数値プリセット）", () => {
    const [plan] = buildCookPlan(
      [
        ingredient({
          ingredientId: "ing_1",
          name: "豚バラ肉",
          sourceItemId: "itm_a1",
          deductQuantity: 200,
          deductUnit: "GRAM",
        }),
      ],
      inventory,
    );

    expect(plan).toEqual({
      ingredientId: "ing_1",
      name: "豚バラ肉",
      itemId: "itm_a1",
      currentQuantity: 300,
      unit: "GRAM",
      suggestedDeduction: 200,
      status: "SUGGESTED",
    });
  });

  it("在庫あり・数量不明（deductQuantity=null）→ MANUAL", () => {
    const [plan] = buildCookPlan(
      [
        ingredient({
          ingredientId: "ing_4",
          name: "醤油",
          sourceItemId: "itm_d1",
          deductQuantity: null,
          deductUnit: null,
        }),
      ],
      inventory,
    );

    expect(plan?.status).toBe("MANUAL");
    expect(plan?.suggestedDeduction).toBeNull();
    expect(plan?.itemId).toBe("itm_d1");
  });

  it("在庫あり・単位不一致（200g vs 1パック）→ MANUAL", () => {
    const [plan] = buildCookPlan(
      [
        ingredient({
          sourceItemId: "itm_d1", // PACK
          deductQuantity: 200,
          deductUnit: "GRAM", // 不一致
        }),
      ],
      inventory,
    );

    expect(plan?.status).toBe("MANUAL");
    expect(plan?.suggestedDeduction).toBeNull();
  });

  it("sourceItemId が null → NOT_FOUND", () => {
    const [plan] = buildCookPlan(
      [ingredient({ ingredientId: "ing_5", name: "ごま油", sourceItemId: null })],
      inventory,
    );

    expect(plan?.status).toBe("NOT_FOUND");
    expect(plan?.itemId).toBeNull();
    expect(plan?.currentQuantity).toBeNull();
  });

  it("在庫が削除済み（sourceItemId は指すが在庫に無い）→ NOT_FOUND", () => {
    const [plan] = buildCookPlan(
      [ingredient({ sourceItemId: "itm_deleted", deductQuantity: 100, deductUnit: "GRAM" })],
      inventory,
    );

    expect(plan?.status).toBe("NOT_FOUND");
  });

  it("複数材料をまとめて分類できる", () => {
    const plan = buildCookPlan(
      [
        ingredient({ ingredientId: "a", sourceItemId: "itm_a1", deductQuantity: 100, deductUnit: "GRAM" }),
        ingredient({ ingredientId: "b", sourceItemId: "itm_d1" }),
        ingredient({ ingredientId: "c", sourceItemId: null }),
      ],
      inventory,
    );

    expect(plan.map((p) => p.status)).toEqual(["SUGGESTED", "MANUAL", "NOT_FOUND"]);
  });
});
