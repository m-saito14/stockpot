import { DndContext } from "@dnd-kit/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { dateFromToday, inventoryItem } from "../../lib/fixtures";
import { Column } from "./column";

/**
 * カンバンの 1 列（保存場所）。上辺の色で常温 / 冷蔵 / 冷凍を区別する（設計書 §13.1）。
 */
const meta = {
  title: "Kanban/Column",
  component: Column,
  decorators: [
    (Story) => (
      <DndContext>
        <div className="w-80">
          <Story />
        </div>
      </DndContext>
    ),
  ],
} satisfies Meta<typeof Column>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fridge: Story = {
  args: {
    storageType: "FRIDGE",
    items: [
      inventoryItem({
        id: "1",
        name: "牛乳",
        unit: "MILLILITER",
        quantity: 500,
        expiryDate: dateFromToday(1),
        expiryType: "CONSUME_BY",
      }),
      inventoryItem({ id: "2", name: "たまご", unit: "PACK", quantity: 1 }),
      inventoryItem({
        id: "3",
        name: "にんじん",
        quantity: 3,
        expiryDate: dateFromToday(10),
        expiryType: "BEST_BEFORE",
      }),
    ],
  },
};

export const Pantry: Story = {
  args: {
    storageType: "PANTRY",
    items: [
      inventoryItem({ id: "4", name: "米", unit: "GRAM", quantity: 2000 }),
      inventoryItem({ id: "5", name: "玉ねぎ", quantity: 4 }),
    ],
  },
};

export const Freezer: Story = {
  args: {
    storageType: "FREEZER",
    items: [inventoryItem({ id: "6", name: "冷凍うどん", unit: "PACK", quantity: 3 })],
  },
};

/** 空状態（「在庫がありません」＋ [+ 追加] だけ） */
export const Empty: Story = {
  args: { storageType: "FREEZER", items: [] },
};
