import type { EffortMode, MealType } from "@stockpot/shared";
import type { InventoryItem } from "../../inventory/domain/inventory-item.js";
import type { InventoryRepository } from "../../inventory/domain/inventory-repository.js";
import type {
  InventorySnapshotItem,
  RecipeGenerator,
} from "../domain/recipe-generator.js";
import type { RecipeRepository } from "../domain/recipe-repository.js";
import type { Recipe } from "../domain/recipe.js";
import { EmptyInventoryError } from "./errors.js";

export interface SuggestRecipesCommand {
  userId: string;
  mealType: MealType;
  effortMode: EffortMode;
}

function toSnapshot(item: InventoryItem): InventorySnapshotItem {
  return {
    id: item.id,
    name: item.name,
    storageType: item.storageType,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate,
    expiryType: item.expiryType,
  };
}

/**
 * 在庫に基づくレシピ提案（設計書 §15）。application 層が主戦場（§18.6）。
 *
 * ポートを注入するため DB も LLM も無しで検証できる。特に「在庫 0 件なら
 * LLM を呼ばない」は課金防止の回帰テスト対象（§18.6）。
 */
export class SuggestRecipes {
  constructor(
    private readonly inventory: InventoryRepository,
    private readonly generator: RecipeGenerator,
    private readonly recipes: RecipeRepository,
  ) {}

  async execute(cmd: SuggestRecipesCommand): Promise<Recipe[]> {
    const items = await this.inventory.findAll(cmd.userId);

    // 設計書 §15.5: 在庫 0 件なら生成せずエラー（LLM を叩かない）
    if (items.length === 0) {
      throw new EmptyInventoryError();
    }

    const generated = await this.generator.generate({
      items: items.map(toSnapshot),
      mealType: cmd.mealType,
      effortMode: cmd.effortMode,
    });

    return this.recipes.saveMany(cmd.userId, generated);
  }
}
