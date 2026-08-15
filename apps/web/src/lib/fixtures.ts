import type { InventoryItemDto, RecipeDto } from "./api";

/**
 * Storybook 用のサンプルデータ。**アプリ本体からは import しない**。
 *
 * 期限バッジは `new Date()` を基準に判定される（ExpiryBadge）ため、
 * 固定日付ではなく「今日から N 日後」で組み立てる。
 */

/** 今日から `days` 日後の日付を "YYYY-MM-DD"（UTC 暦日）で返す。 */
export function dateFromToday(days: number): string {
  const now = new Date();
  const base = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function inventoryItem(
  overrides: Partial<InventoryItemDto> = {},
): InventoryItemDto {
  return {
    id: "item-1",
    name: "にんじん",
    storageType: "FRIDGE",
    quantity: 3,
    unit: "PIECE",
    expiryDate: null,
    expiryType: null,
    note: null,
    ...overrides,
  };
}

export function recipe(overrides: Partial<RecipeDto> = {}): RecipeDto {
  return {
    id: "recipe-1",
    title: "にんじんと豚肉のしりしり",
    description:
      "冷蔵庫のにんじんと豚こまで作る作り置き向けの一品。卵でまとめると主菜にもなります。",
    mealType: "DINNER",
    effortMode: "EASY",
    estimatedMin: 15,
    isFavorite: false,
    cookedCount: 0,
    ingredients: [
      { name: "にんじん", amountText: "2 本", sourceItemId: "item-1" },
      { name: "豚こま切れ肉", amountText: "150 g", sourceItemId: "item-2" },
      { name: "ごま油", amountText: "適量", sourceItemId: null },
    ],
    steps: [
      { order: 1, instruction: "にんじんを千切りにする", method: "PREP" },
      { order: 2, instruction: "フライパンで豚肉を炒める", method: "STOVE" },
      { order: 3, instruction: "にんじんを加えて全体を炒め合わせる", method: "STOVE" },
    ],
    ...overrides,
  };
}
