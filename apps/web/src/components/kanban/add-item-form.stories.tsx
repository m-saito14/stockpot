import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddItemForm } from "./add-item-form";

/**
 * 在庫追加フォーム（設計書 §13.1 の [+ 追加]）。Modal の中身として開く。
 * 期限を入れるまで「期限種別」は disabled になる。
 */
const meta = {
  title: "Kanban/AddItemForm",
  component: AddItemForm,
  args: { open: true, onClose: () => {} },
} satisfies Meta<typeof AddItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fridge: Story = {
  args: { storageType: "FRIDGE" },
};

export const Freezer: Story = {
  args: { storageType: "FREEZER" },
};
