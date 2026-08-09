/** 在庫が 0 件（設計書 §15.5: LLM を叩かずに返す）。 */
export class EmptyInventoryError extends Error {
  constructor() {
    super("在庫が空です。食材を追加してください。");
    this.name = "EmptyInventoryError";
  }
}

/** レシピが存在しない／他ユーザーのもの（404 として扱い、存在を漏らさない）。 */
export class RecipeNotFoundError extends Error {
  constructor() {
    super("レシピが見つかりません。");
    this.name = "RecipeNotFoundError";
  }
}
