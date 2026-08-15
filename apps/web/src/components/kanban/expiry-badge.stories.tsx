import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { dateFromToday, inventoryItem } from "../../lib/fixtures";
import { ExpiryBadge } from "./expiry-badge";

/**
 * 期限バッジ（設計書 §13.1）。
 * 判定は `packages/shared` の `getExpiryStatus`。消費期限（安全）と
 * 賞味期限（品質）で色を分けるのが仕様の要点。
 */
const meta = {
  title: "Kanban/ExpiryBadge",
  component: ExpiryBadge,
} satisfies Meta<typeof ExpiryBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 消費期限が当日以前 → 🔴 期限切れ（強調） */
export const Expired: Story = {
  args: {
    item: inventoryItem({
      expiryDate: dateFromToday(-1),
      expiryType: "CONSUME_BY",
    }),
  },
};

/** 消費期限が 3 日以内 → 🔴 期限間近 */
export const Urgent: Story = {
  args: {
    item: inventoryItem({
      expiryDate: dateFromToday(2),
      expiryType: "CONSUME_BY",
    }),
  },
};

/** 賞味期限が 3 日以内 → 🟡 期限間近 */
export const Warning: Story = {
  args: {
    item: inventoryItem({
      expiryDate: dateFromToday(2),
      expiryType: "BEST_BEFORE",
    }),
  },
};

/** それ以外 → ⚪ 日付のみ */
export const Normal: Story = {
  args: {
    item: inventoryItem({
      expiryDate: dateFromToday(14),
      expiryType: "BEST_BEFORE",
    }),
  },
};

/** 期限未設定 → バッジを描画しない（何も表示されないのが正） */
export const NoExpiry: Story = {
  args: { item: inventoryItem() },
};
