import type { Deduction } from "../domain/deduction.js";
import type {
  CookResult,
  RecipeRepository,
} from "../domain/recipe-repository.js";
import { RecipeNotFoundError } from "./errors.js";

export interface CookRecipeCommand {
  userId: string;
  recipeId: string;
  deductions: Deduction[];
}

/**
 * 調理確定（設計書 §16.2）。減算・0 削除・cookedCount 更新・CookLog 作成は
 * リポジトリ実装が 1 トランザクションで行う。ここでは所有権を担保し、
 * 存在しなければ 404 相当のエラーに変換する。
 */
export class CookRecipe {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(cmd: CookRecipeCommand): Promise<CookResult> {
    const result = await this.recipes.cook(
      cmd.userId,
      cmd.recipeId,
      cmd.deductions,
    );
    if (result === null) {
      throw new RecipeNotFoundError();
    }
    return result;
  }
}
