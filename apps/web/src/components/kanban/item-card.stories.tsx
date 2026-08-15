import { DndContext } from "@dnd-kit/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { dateFromToday, inventoryItem } from "../../lib/fixtures";
import { ItemCard } from "./item-card";

/**
 * 在庫カード（設計書 §13.1）。
 * 数量 ± の刻み幅は unit ごと（`applyStep`）。名前はクリックでインライン編集。
 *
 * 数量変更・削除は API を叩くため Storybook では成功しない。見た目と
 * 単位ごとの刻み幅の確認が目的。
 */
const meta = {
  title: "Kanban/ItemCard",
  component: ItemCard,
  decorators: [
    // useDraggable を実アプリと同じ文脈で動かす
    (Story) => (
      <DndContext>
        <div className="w-72">
          <Story />
        </div>
      </DndContext>
    ),
  ],
} satisfies Meta<typeof ItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { item: inventoryItem() },
};

/** 期限とメモの両方がある状態（カード下段が出る） */
export const WithExpiryAndNote: Story = {
  args: {
    item: inventoryItem({
      name: "牛乳",
      unit: "MILLILITER",
      quantity: 500,
      expiryDate: dateFromToday(2),
      expiryType: "CONSUME_BY",
      note: "開封済み",
    }),
  },
};

/** GRAM は ± 50 刻み（`stepFor`） */
export const GramUnit: Story = {
  args: {
    item: inventoryItem({ name: "豚こま切れ肉", unit: "GRAM", quantity: 300 }),
  },
};

/** 数量 0 は「減らす」が disabled になる */
export const OutOfStock: Story = {
  args: { item: inventoryItem({ name: "たまご", quantity: 0 }) },
};

/** 長い食材名でレイアウトが崩れないこと */
export const LongName: Story = {
  args: {
    item: inventoryItem({
      name: "北海道産じゃがいも（男爵）大きめ",
      note: "カレー用に買ったもの",
    }),
  },
};
