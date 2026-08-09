import { describe, expect, it } from "vitest";
import { getExpiryStatus, type ExpiryStatus } from "./expiry.js";
import type { ExpiryType } from "./enums.js";

const TODAY = new Date("2026-08-10T09:00:00Z");

/** today からの相対日数で期限日を作る。 */
function dateAfter(days: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

describe("getExpiryStatus", () => {
  it.each<[ExpiryType, number, ExpiryStatus]>([
    ["CONSUME_BY", -1, "EXPIRED"], // 消費期限が昨日 → 期限切れ
    ["CONSUME_BY", 0, "EXPIRED"], // 消費期限が当日 → 期限切れ扱い
    ["CONSUME_BY", 2, "URGENT"], // 消費期限が 3 日以内 → 🔴
    ["CONSUME_BY", 3, "URGENT"], // 境界: 3 日
    ["CONSUME_BY", 4, "NORMAL"], // 4 日以降は通常
    ["BEST_BEFORE", -1, "WARNING"], // 賞味期限切れは品質なので 🟡（3 日以内に含む）
    ["BEST_BEFORE", 2, "WARNING"], // 賞味期限が 3 日以内 → 🟡
    ["BEST_BEFORE", 3, "WARNING"], // 境界: 3 日
    ["BEST_BEFORE", 10, "NORMAL"], // 十分先 → 通常
  ])("%s / %d日後 → %s", (expiryType, days, expected) => {
    expect(
      getExpiryStatus({ expiryType, expiryDate: dateAfter(days) }, TODAY),
    ).toBe(expected);
  });

  it("期限日がなければ NONE", () => {
    expect(getExpiryStatus({ expiryDate: null, expiryType: "CONSUME_BY" }, TODAY)).toBe(
      "NONE",
    );
  });

  it("期限種別がなければ NONE", () => {
    expect(getExpiryStatus({ expiryDate: dateAfter(1), expiryType: null }, TODAY)).toBe(
      "NONE",
    );
  });

  it("時刻が違っても同日なら消費期限は EXPIRED（時刻を切り捨てて日で比較）", () => {
    const sameDayLater = new Date("2026-08-10T23:59:00Z");
    expect(
      getExpiryStatus({ expiryType: "CONSUME_BY", expiryDate: sameDayLater }, TODAY),
    ).toBe("EXPIRED");
  });
});
