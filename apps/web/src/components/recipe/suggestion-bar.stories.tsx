import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SuggestionBar } from "./suggestion-bar";

/**
 * レシピ生成のトリガー（設計書 §13.1）。
 * お手軽 / 本格の切り替えは localStorage に保存され、朝食 / 昼食 / 夕食の
 * ボタンで生成を開始する。
 *
 * 生成そのものは API（LLM）を叩くため Storybook では完了しない。
 * ボタンを押すとモーダルが開き、`StagedProgress` → エラー表示まで確認できる。
 */
const meta = {
  title: "Recipe/SuggestionBar",
  component: SuggestionBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SuggestionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
