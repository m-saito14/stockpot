import { describe, expect, it, vi } from "vitest";
import type { InventoryItem } from "../../inventory/domain/inventory-item.js";
import { InMemoryInventoryRepository } from "../../inventory/infrastructure/in-memory-inventory-repository.js";
import type { RecipeRepository } from "../domain/recipe-repository.js";
import type { NewRecipe, Recipe } from "../domain/recipe.js";
import { StubRecipeGenerator } from "../infrastructure/stub-generator.js";
import { EmptyInventoryError } from "./errors.js";
import { SuggestRecipes } from "./suggest-recipes.js";

const USER = "user_1";

function item(over: Partial<InventoryItem>): InventoryItem {
  return {
    id: "itm_1",
    userId: USER,
    name: "玉ねぎ",
    storageType: "PANTRY",
    quantity: 2,
    unit: "PIECE",
    expiryDate: null,
    expiryType: null,
    note: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  };
}

/** saveMany だけ実装した最小の RecipeRepository。 */
function fakeRecipeRepo(): RecipeRepository {
  return {
    saveMany: vi.fn(async (userId: string, recipes: NewRecipe[]) =>
      recipes.map(
        (r, i): Recipe => ({
          ...r,
          id: `rcp_${i}`,
          userId,
          isFavorite: false,
          cookedCount: 0,
          lastCookedAt: null,
          createdAt: new Date(0),
        }),
      ),
    ),
    findMany: vi.fn(),
    findById: vi.fn(),
    setFavorite: vi.fn(),
    delete: vi.fn(),
    cook: vi.fn(),
  } as unknown as RecipeRepository;
}

describe("SuggestRecipes", () => {
  it("在庫が0件なら LLM を呼ばずに EmptyInventoryError を返す", async () => {
    const generator = new StubRecipeGenerator();
    const spy = vi.spyOn(generator, "generate");
    const useCase = new SuggestRecipes(
      new InMemoryInventoryRepository([]),
      generator,
      fakeRecipeRepo(),
    );

    await expect(
      useCase.execute({ userId: USER, mealType: "DINNER", effortMode: "EASY" }),
    ).rejects.toBeInstanceOf(EmptyInventoryError);

    // ← 課金防止の回帰テスト（設計書 §18.6）
    expect(spy).not.toHaveBeenCalled();
  });

  it("在庫があれば生成して保存し、3件返す", async () => {
    const generator = new StubRecipeGenerator();
    const repo = fakeRecipeRepo();
    const useCase = new SuggestRecipes(
      new InMemoryInventoryRepository([item({})]),
      generator,
      repo,
    );

    const recipes = await useCase.execute({
      userId: USER,
      mealType: "DINNER",
      effortMode: "EASY",
    });

    expect(recipes).toHaveLength(3);
    expect(repo.saveMany).toHaveBeenCalledOnce();
    // 入力値がレシピに付与されている
    expect(recipes.every((r) => r.mealType === "DINNER")).toBe(true);
  });
});
