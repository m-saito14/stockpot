import type { ExpiryType } from "./enums.js";

/**
 * 期限バッジの状態（設計書 §13.1 の表示ルール）。
 *
 * - EXPIRED : 🔴 消費期限が当日以前（期限切れ・強調）
 * - URGENT  : 🔴 消費期限が 3 日以内
 * - WARNING : 🟡 賞味期限が 3 日以内
 * - NORMAL  : ⚪ それ以外
 * - NONE    : バッジなし（期限未設定）
 *
 * 消費期限は「安全」、賞味期限は「品質」で意味が異なるため色を分ける。
 */
export type ExpiryStatus = "EXPIRED" | "URGENT" | "WARNING" | "NORMAL" | "NONE";

/** 期限バッジ判定に必要な最小限のフィールド。 */
export interface ExpiryInput {
  expiryDate?: Date | null;
  expiryType?: ExpiryType | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 時刻を切り捨てた「日数の差」を返す（target - base、日単位）。
 *
 * `expiryDate` は Prisma の `@db.Date`（UTC 深夜として復元される）なので、
 * ローカルタイムの日付境界と混ぜないよう UTC の暦日で比較する。
 */
function diffInDays(base: Date, target: Date): number {
  const b = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
  const t = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.floor((t - b) / MS_PER_DAY);
}

/**
 * 期限バッジの状態を返す純粋関数。
 *
 * 設計書 §18.7: `new Date()` を関数内で呼ばない。`today` を引数で受け取ることで
 * テストで日付をモックせずに済む。Web / モバイル両方から使うため
 * `packages/shared` に置く（UI に埋め込まない）。
 */
export function getExpiryStatus(item: ExpiryInput, today: Date): ExpiryStatus {
  if (item.expiryDate == null || item.expiryType == null) {
    return "NONE";
  }

  const days = diffInDays(today, item.expiryDate);

  if (item.expiryType === "CONSUME_BY") {
    // 消費期限（安全）
    if (days <= 0) return "EXPIRED"; // 当日以前
    if (days <= 3) return "URGENT";
    return "NORMAL";
  }

  // BEST_BEFORE（賞味期限・品質）
  if (days <= 3) return "WARNING";
  return "NORMAL";
}
