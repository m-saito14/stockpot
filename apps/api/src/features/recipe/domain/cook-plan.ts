import type { CookPlanItem, Unit } from "@stockpot/shared";

/**
 * 減算案の 3 分類ロジック（設計書 §16.1）。★ 最重要の純粋関数。
 *
 * 名前による在庫マッチングは行わない。表記ゆれ（豚バラ / 豚ばら肉 / 豚バラスライス）
 * で必ず外れるため、`sourceItemId` のみを信頼する（設計書 §16.2）。
 */

/** cook-plan の入力となる、レシピ材料 1 件。 */
export interface CookPlanIngredient {
  ingredientId: string;
  name: string;
  sourceItemId: string | null;
  deductQuantity: number | null;
  deductUnit: Unit | null;
}

/** 現在の在庫（`sourceItemId` で引ける形）。 */
export interface CurrentInventoryItem {
  id: string;
  quantity: number;
  unit: Unit;
}

/**
 * レシピ材料と現在庫を突き合わせ、3 分類した減算案を返す。
 *
 * | 条件 | 分類 |
 * |---|---|
 * | 在庫あり かつ deductQuantity != null かつ deductUnit == item.unit | SUGGESTED |
 * | 在庫あり かつ（deductQuantity == null または 単位不一致） | MANUAL |
 * | 在庫なし | NOT_FOUND |
 */
export function buildCookPlan(
  ingredients: CookPlanIngredient[],
  currentItems: CurrentInventoryItem[],
): CookPlanItem[] {
  const itemsById = new Map(currentItems.map((it) => [it.id, it]));

  return ingredients.map((ing): CookPlanItem => {
    const item = ing.sourceItemId ? itemsById.get(ing.sourceItemId) : undefined;

    // 在庫が存在しない（sourceItemId が null、または在庫が削除済み）
    if (!item) {
      return {
        ingredientId: ing.ingredientId,
        name: ing.name,
        itemId: null,
        currentQuantity: null,
        unit: null,
        suggestedDeduction: null,
        status: "NOT_FOUND",
      };
    }

    const canSuggest = ing.deductQuantity != null && ing.deductUnit === item.unit;

    return {
      ingredientId: ing.ingredientId,
      name: ing.name,
      itemId: item.id,
      currentQuantity: item.quantity,
      unit: item.unit,
      suggestedDeduction: canSuggest ? ing.deductQuantity : null,
      status: canSuggest ? "SUGGESTED" : "MANUAL",
    };
  });
}
