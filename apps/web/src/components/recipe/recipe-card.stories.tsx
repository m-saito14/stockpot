import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { recipe } from "../../lib/fixtures";
import { RecipeCard } from "./recipe-card";

/**
 * レシピカード（設計書 §13.2 / §13.3）。生成結果と一覧で共用する。
 * お気に入りの ⭐️ は API を叩くため Storybook では状態が変わらない。
 */
const meta = {
  title: "Recipe/RecipeCard",
  component: RecipeCard,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { recipe: recipe() },
};

export const Favorite: Story = {
  args: { recipe: recipe({ isFavorite: true }) },
};

/** 調理済みのレシピは調理回数が出る */
export const Cooked: Story = {
  args: { recipe: recipe({ isFavorite: true, cookedCount: 5 }) },
};

/** 本格モード・長めの説明（2 行で clamp される） */
export const Elaborate: Story = {
  args: {
    recipe: recipe({
      title: "牛すね肉の赤ワイン煮込み",
      description:
        "時間はかかりますが手順は単純です。前日から下ごしらえしておくと当日は煮込むだけ。付け合わせはマッシュポテトがよく合います。",
      effortMode: "ELABORATE",
      mealType: "DINNER",
      estimatedMin: 120,
    }),
  },
};

/** 調理時間の見積もりが無い（0 分）ときはタグを出さない */
export const NoEstimate: Story = {
  args: {
    recipe: recipe({ title: "冷やしトマト", mealType: "LUNCH", estimatedMin: 0 }),
  },
};
