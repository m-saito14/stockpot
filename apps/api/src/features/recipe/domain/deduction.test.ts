import { describe, expect, it } from "vitest";
import { applyDeductions } from "./deduction.js";

const items = [
  { id: "itm_a1", quantity: 300 }, // 豚バラ肉
  { id: "itm_b1", quantity: 1 }, // 白菜
  { id: "itm_c1", quantity: 2 }, // 玉ねぎ
];

describe("applyDeductions", () => {
  it("減算後 0 超は更新対象になる", () => {
    const { updates, deletions } = applyDeductions(items, [
      { itemId: "itm_a1", quantity: 200 },
    ]);
    expect(updates).toEqual([{ itemId: "itm_a1", newQuantity: 100 }]);
    expect(deletions).toEqual([]);
  });

  it("減算後ちょうど 0 は削除対象になる", () => {
    const { updates, deletions } = applyDeductions(items, [
      { itemId: "itm_b1", quantity: 1 },
    ]);
    expect(updates).toEqual([]);
    expect(deletions).toEqual(["itm_b1"]);
  });

  it("減算後マイナスも削除対象になる", () => {
    const { deletions } = applyDeductions(items, [{ itemId: "itm_c1", quantity: 5 }]);
    expect(deletions).toContain("itm_c1");
  });

  it("在庫に存在しない指示は無視する", () => {
    const { updates, deletions } = applyDeductions(items, [
      { itemId: "itm_unknown", quantity: 10 },
    ]);
    expect(updates).toEqual([]);
    expect(deletions).toEqual([]);
  });

  it("同一 itemId への複数指示は合算する", () => {
    const { updates, deletions } = applyDeductions(items, [
      { itemId: "itm_a1", quantity: 100 },
      { itemId: "itm_a1", quantity: 250 }, // 合計 350 > 300
    ]);
    expect(updates).toEqual([]);
    expect(deletions).toEqual(["itm_a1"]);
  });

  it("複数材料をまとめて処理できる", () => {
    const { updates, deletions } = applyDeductions(items, [
      { itemId: "itm_a1", quantity: 200 }, // 300→100 更新
      { itemId: "itm_b1", quantity: 1 }, // 1→0 削除
      { itemId: "itm_c1", quantity: 1 }, // 2→1 更新
    ]);
    expect(updates).toEqual([
      { itemId: "itm_a1", newQuantity: 100 },
      { itemId: "itm_c1", newQuantity: 1 },
    ]);
    expect(deletions).toEqual(["itm_b1"]);
  });
});
