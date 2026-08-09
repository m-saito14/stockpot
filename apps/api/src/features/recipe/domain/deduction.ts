/**
 * 調理確定時の在庫減算の純粋計算（設計書 §16.2）。
 *
 * DB トランザクションから切り離した「何をいくつに減らし、どれを削除するか」の
 * 決定ロジック。減算後 0 以下になった在庫は削除対象になる。
 */

export interface Deduction {
  itemId: string;
  quantity: number;
}

export interface DeductionResult {
  /** 更新する在庫（減算後 0 超）。 */
  updates: { itemId: string; newQuantity: number }[];
  /** 削除する在庫 ID（減算後 0 以下）。 */
  deletions: string[];
}

/**
 * 現在庫と減算指示から、更新／削除を算出する。
 * 同一 itemId への複数指示は合算する。指示にない在庫は対象外。
 */
export function applyDeductions(
  currentItems: { id: string; quantity: number }[],
  deductions: Deduction[],
): DeductionResult {
  const quantityById = new Map(currentItems.map((it) => [it.id, it.quantity]));

  // 同一 itemId の指示を合算
  const totalByItem = new Map<string, number>();
  for (const d of deductions) {
    totalByItem.set(d.itemId, (totalByItem.get(d.itemId) ?? 0) + d.quantity);
  }

  const updates: DeductionResult["updates"] = [];
  const deletions: string[] = [];

  for (const [itemId, deducted] of totalByItem) {
    const current = quantityById.get(itemId);
    if (current === undefined) continue; // 在庫に存在しない指示は無視
    const next = current - deducted;
    if (next <= 0) {
      deletions.push(itemId);
    } else {
      updates.push({ itemId, newQuantity: next });
    }
  }

  return { updates, deletions };
}
