import type {
  Prisma,
  PrismaClient,
  RecipeIngredient as PrismaIngredient,
  Recipe as PrismaRecipe,
  RecipeStep as PrismaStep,
} from "@prisma/client";
import { toNumber, toNumberStrict } from "../../../shared/db/decimal.js";
import type { CookPlanIngredient } from "../domain/cook-plan.js";
import type { Deduction } from "../domain/deduction.js";
import { applyDeductions } from "../domain/deduction.js";
import type {
  CookResult,
  RecipeQuery,
  RecipeRepository,
} from "../domain/recipe-repository.js";
import type { NewRecipe, Recipe } from "../domain/recipe.js";

type RowWithRelations = PrismaRecipe & {
  steps: PrismaStep[];
  ingredients: PrismaIngredient[];
};

const include = { steps: true, ingredients: true } as const;

/**
 * ★ ORM 境界の実装（設計書 §3 ② / §16.2）。
 */
export class PrismaRecipeRepository implements RecipeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveMany(userId: string, recipes: NewRecipe[]): Promise<Recipe[]> {
    const created = await this.prisma.$transaction(
      recipes.map((r) =>
        this.prisma.recipe.create({
          data: {
            userId,
            title: r.title,
            description: r.description,
            mealType: r.mealType,
            effortMode: r.effortMode,
            estimatedMin: r.estimatedMin,
            steps: { create: r.steps },
            ingredients: {
              create: r.ingredients.map((ing) => ({
                name: ing.name,
                amountText: ing.amountText,
                sourceItemId: ing.sourceItemId,
                deductQuantity: ing.deductQuantity,
                deductUnit: ing.deductUnit,
              })),
            },
          },
          include,
        }),
      ),
    );
    return created.map(toDomain);
  }

  async findMany(userId: string, query: RecipeQuery): Promise<Recipe[]> {
    const orderBy = sortToOrderBy(query.sort);
    const rows = await this.prisma.recipe.findMany({
      where: {
        userId,
        ...(query.favorite !== undefined ? { isFavorite: query.favorite } : {}),
        ...(query.mealType ? { mealType: query.mealType } : {}),
        ...(query.effortMode ? { effortMode: query.effortMode } : {}),
      },
      include,
      orderBy,
    });
    return rows.map(toDomain);
  }

  async findById(userId: string, id: string): Promise<Recipe | null> {
    const row = await this.prisma.recipe.findFirst({
      where: { id, userId },
      include,
    });
    return row ? toDomain(row) : null;
  }

  async findCookPlanIngredients(
    userId: string,
    recipeId: string,
  ): Promise<CookPlanIngredient[] | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, userId },
      select: { ingredients: true },
    });
    if (!recipe) return null;
    return recipe.ingredients.map((ing) => ({
      ingredientId: ing.id,
      name: ing.name,
      sourceItemId: ing.sourceItemId,
      deductQuantity: toNumber(ing.deductQuantity),
      deductUnit: ing.deductUnit,
    }));
  }

  async setFavorite(
    userId: string,
    id: string,
    isFavorite: boolean,
  ): Promise<Recipe | null> {
    const result = await this.prisma.recipe.updateMany({
      where: { id, userId },
      data: { isFavorite },
    });
    if (result.count === 0) return null;
    return this.findById(userId, id);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.recipe.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  /** 設計書 §16.2: 1 トランザクションで減算・0 削除・cookedCount 更新・CookLog 作成。 */
  async cook(
    userId: string,
    recipeId: string,
    deductions: Deduction[],
  ): Promise<CookResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findFirst({
        where: { id: recipeId, userId },
        select: { id: true },
      });
      if (!recipe) return null; // 他ユーザー含め存在しなければ null（存在を漏らさない）

      const itemIds = deductions.map((d) => d.itemId);
      const items = await tx.inventoryItem.findMany({
        where: { id: { in: itemIds }, userId },
        select: { id: true, quantity: true },
      });

      const { updates, deletions } = applyDeductions(
        items.map((it) => ({ id: it.id, quantity: toNumberStrict(it.quantity) })),
        deductions,
      );

      for (const u of updates) {
        await tx.inventoryItem.update({
          where: { id: u.itemId },
          data: { quantity: u.newQuantity },
        });
      }
      if (deletions.length > 0) {
        await tx.inventoryItem.deleteMany({ where: { id: { in: deletions }, userId } });
      }

      await tx.recipe.update({
        where: { id: recipeId },
        data: { cookedCount: { increment: 1 }, lastCookedAt: new Date() },
      });

      await tx.cookLog.create({
        data: {
          userId,
          recipeId,
          deductions: deductions as unknown as Prisma.InputJsonValue,
        },
      });

      return { updatedItemIds: updates.map((u) => u.itemId), deletedItemIds: deletions };
    });
  }
}

function sortToOrderBy(sort: RecipeQuery["sort"]): Prisma.RecipeOrderByWithRelationInput {
  switch (sort) {
    case "cookedCount":
      return { cookedCount: "desc" };
    case "lastCookedAt":
      return { lastCookedAt: { sort: "desc", nulls: "last" } };
    default:
      return { createdAt: "desc" };
  }
}

/** ← ORM 境界。Prisma 行をドメインエンティティへ写像する。 */
function toDomain(row: RowWithRelations): Recipe {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description ?? "",
    mealType: row.mealType,
    effortMode: row.effortMode,
    estimatedMin: row.estimatedMin ?? 0,
    isFavorite: row.isFavorite,
    cookedCount: row.cookedCount,
    lastCookedAt: row.lastCookedAt,
    createdAt: row.createdAt,
    ingredients: row.ingredients.map((ing) => ({
      name: ing.name,
      amountText: ing.amountText,
      sourceItemId: ing.sourceItemId,
      deductQuantity: toNumber(ing.deductQuantity),
      deductUnit: ing.deductUnit,
    })),
    steps: [...row.steps]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ order: s.order, instruction: s.instruction, method: s.method })),
  };
}
