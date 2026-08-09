import type { CookPlan } from "@stockpot/shared";
import type { InventoryRepository } from "../../inventory/domain/inventory-repository.js";
import { buildCookPlan } from "../domain/cook-plan.js";
import type { RecipeRepository } from "../domain/recipe-repository.js";
import { RecipeNotFoundError } from "./errors.js";

export interface GetCookPlanCommand {
  userId: string;
  recipeId: string;
}

/**
 * 現在庫と突き合わせた減算案を返す（設計書 §16.1）。
 * 減算案の計算はサーバー側に置く（フロントに置くと Web / モバイルで二重実装になる）。
 */
export class GetCookPlan {
  constructor(
    private readonly recipes: RecipeRepository,
    private readonly inventory: InventoryRepository,
  ) {}

  async execute(cmd: GetCookPlanCommand): Promise<CookPlan> {
    const ingredients = await this.recipes.findCookPlanIngredients(
      cmd.userId,
      cmd.recipeId,
    );
    if (ingredients === null) {
      throw new RecipeNotFoundError();
    }

    const items = await this.inventory.findAll(cmd.userId);
    const plan = buildCookPlan(
      ingredients,
      items.map((it) => ({ id: it.id, quantity: it.quantity, unit: it.unit })),
    );
    return { items: plan };
  }
}
