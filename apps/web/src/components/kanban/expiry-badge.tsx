import { getExpiryStatus } from "@stockpot/shared";
import type { InventoryItemDto } from "../../lib/api";
import { EXPIRY_BADGE } from "../../lib/labels";

/**
 * 期限バッジ（設計書 §13.1）。判定ロジックは packages/shared の純粋関数を使う。
 * `today` はローカル日付を UTC 深夜に正規化して渡す（@db.Date と揃える / §18.7）。
 */
export function ExpiryBadge({ item }: { item: InventoryItemDto }) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const status = getExpiryStatus(
    {
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      expiryType: item.expiryType,
    },
    today,
  );

  const badge = EXPIRY_BADGE[status];
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${badge.className}`}
    >
      <span>{badge.dot}</span>
      {item.expiryDate && <span>{item.expiryDate.slice(5)}</span>}
      {badge.text && <span>{badge.text}</span>}
    </span>
  );
}
