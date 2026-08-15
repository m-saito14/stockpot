import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Modal } from "./modal";

/** 汎用モーダル。背景クリック / Esc で閉じる。 */
const meta = {
  title: "UI/Modal",
  component: Modal,
  args: { open: true, onClose: () => {} },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {
  args: {
    title: "在庫を追加",
    children: <p className="text-sm text-slate-600">ここに本文が入ります。</p>,
  },
};

/** タイトルなし（生成中の表示など、見出しを出したくない場面） */
export const WithoutTitle: Story = {
  args: {
    children: <p className="text-sm text-slate-600">タイトルのないモーダル。</p>,
  },
};

/** 本文が長いときは max-h-[90dvh] の内側でスクロールする */
export const LongContent: Story = {
  args: {
    title: "長い本文",
    children: (
      <div className="space-y-3 text-sm text-slate-600">
        {Array.from({ length: 30 }, (_, i) => `スクロール確認用の行 ${i + 1}`).map(
          (line) => (
            <p key={line}>{line}</p>
          ),
        )}
      </div>
    ),
  },
};

/** 閉じている状態では何も描画しない */
export const Closed: Story = {
  args: { open: false, title: "閉じている", children: <p>表示されない</p> },
};
