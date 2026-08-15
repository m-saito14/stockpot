import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StagedProgress } from "./staged-progress";

/**
 * レシピ生成中の段階表示（設計書 §13.2）。
 * 実際の進捗とは非連動で、2.5 秒ごとに文言が進む。体感速度のための演出。
 */
const meta = {
  title: "Recipe/StagedProgress",
  component: StagedProgress,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StagedProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
