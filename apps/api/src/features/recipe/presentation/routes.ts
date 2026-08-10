import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  CookRecipeInputSchema,
  EffortModeSchema,
  MealTypeSchema,
  SuggestRecipesInputSchema,
} from "@stockpot/shared";
import type { AuthVariables } from "../../../shared/auth/middleware.js";
import { authMiddleware } from "../../../shared/auth/middleware.js";
import type { CookRecipe } from "../application/cook-recipe.js";
import { EmptyInventoryError, RecipeNotFoundError } from "../application/errors.js";
import type { GetCookPlan } from "../application/get-cook-plan.js";
import type { SuggestRecipes } from "../application/suggest-recipes.js";
import type { RecipeRepository } from "../domain/recipe-repository.js";
import type { Recipe } from "../domain/recipe.js";

export interface RecipeDeps {
  repo: RecipeRepository;
  suggestRecipes: SuggestRecipes;
  getCookPlan: GetCookPlan;
  cookRecipe: CookRecipe;
}

const RecipeResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    mealType: MealTypeSchema,
    effortMode: EffortModeSchema,
    estimatedMin: z.number(),
    isFavorite: z.boolean(),
    cookedCount: z.number(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amountText: z.string(),
        sourceItemId: z.string().nullable(),
      }),
    ),
    steps: z.array(
      z.object({ order: z.number(), instruction: z.string(), method: z.string() }),
    ),
  })
  .openapi("Recipe");

function toResponse(r: Recipe) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    mealType: r.mealType,
    effortMode: r.effortMode,
    estimatedMin: r.estimatedMin,
    isFavorite: r.isFavorite,
    cookedCount: r.cookedCount,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      amountText: i.amountText,
      sourceItemId: i.sourceItemId,
    })),
    steps: r.steps.map((s) => ({
      order: s.order,
      instruction: s.instruction,
      method: s.method,
    })),
  };
}

export function createRecipeRoutes(deps: RecipeDeps) {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>();
  app.use("*", authMiddleware);

  // POST /recipes/suggest — 設計書 §7: status を最初から含める（将来 pending 対応の保険）
  app.openapi(
    createRoute({
      method: "post",
      path: "/suggest",
      operationId: "suggestRecipes",
      request: {
        body: {
          content: { "application/json": { schema: SuggestRecipesInputSchema } },
        },
      },
      responses: {
        200: { description: "生成したレシピ 3 件" },
        409: { description: "在庫が空" },
      },
    }),
    async (c) => {
      const input = c.req.valid("json");
      try {
        const recipes = await deps.suggestRecipes.execute({
          userId: c.get("userId"),
          ...input,
        });
        return c.json({ status: "done", recipes: recipes.map(toResponse) }, 200);
      } catch (e) {
        if (e instanceof EmptyInventoryError) {
          return c.json({ status: "empty_inventory", message: e.message }, 409);
        }
        throw e;
      }
    },
  );

  // GET /recipes — ?favorite=&mealType=&effortMode=&sort=
  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      operationId: "listRecipes",
      request: {
        query: z.object({
          favorite: z.enum(["true", "false"]).optional(),
          mealType: MealTypeSchema.optional(),
          effortMode: EffortModeSchema.optional(),
          sort: z.enum(["createdAt", "cookedCount", "lastCookedAt"]).optional(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ recipes: z.array(RecipeResponseSchema) }),
            },
          },
          description: "レシピ一覧",
        },
      },
    }),
    async (c) => {
      const q = c.req.valid("query");
      const recipes = await deps.repo.findMany(c.get("userId"), {
        favorite: q.favorite ? q.favorite === "true" : undefined,
        mealType: q.mealType,
        effortMode: q.effortMode,
        sort: q.sort,
      });
      return c.json({ recipes: recipes.map(toResponse) }, 200);
    },
  );

  // GET /recipes/:id
  app.openapi(
    createRoute({
      method: "get",
      path: "/{id}",
      operationId: "getRecipe",
      request: { params: z.object({ id: z.string() }) },
      responses: {
        200: {
          content: { "application/json": { schema: RecipeResponseSchema } },
          description: "レシピ詳細",
        },
        404: { description: "見つからない（存在を漏らさない）" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const recipe = await deps.repo.findById(c.get("userId"), id);
      if (!recipe) return c.json({ message: "見つかりません" }, 404);
      return c.json(toResponse(recipe), 200);
    },
  );

  // PATCH /recipes/:id — お気に入り切替
  app.openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      operationId: "updateRecipe",
      request: {
        params: z.object({ id: z.string() }),
        body: {
          content: {
            "application/json": { schema: z.object({ isFavorite: z.boolean() }) },
          },
        },
      },
      responses: {
        200: {
          content: { "application/json": { schema: RecipeResponseSchema } },
          description: "更新後",
        },
        404: { description: "見つからない" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const { isFavorite } = c.req.valid("json");
      const updated = await deps.repo.setFavorite(c.get("userId"), id, isFavorite);
      if (!updated) return c.json({ message: "見つかりません" }, 404);
      return c.json(toResponse(updated), 200);
    },
  );

  // DELETE /recipes/:id
  app.openapi(
    createRoute({
      method: "delete",
      path: "/{id}",
      operationId: "deleteRecipe",
      request: { params: z.object({ id: z.string() }) },
      responses: {
        204: { description: "削除完了" },
        404: { description: "見つからない" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const ok = await deps.repo.delete(c.get("userId"), id);
      if (!ok) return c.json({ message: "見つかりません" }, 404);
      return c.body(null, 204);
    },
  );

  // GET /recipes/:id/cook-plan — 現在庫と突き合わせた減算案
  app.openapi(
    createRoute({
      method: "get",
      path: "/{id}/cook-plan",
      operationId: "getCookPlan",
      request: { params: z.object({ id: z.string() }) },
      responses: {
        200: { description: "減算案" },
        404: { description: "見つからない" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      try {
        const plan = await deps.getCookPlan.execute({
          userId: c.get("userId"),
          recipeId: id,
        });
        return c.json(plan, 200);
      } catch (e) {
        if (e instanceof RecipeNotFoundError) return c.json({ message: e.message }, 404);
        throw e;
      }
    },
  );

  // POST /recipes/:id/cook — 確定内容で減算 + CookLog 記録
  app.openapi(
    createRoute({
      method: "post",
      path: "/{id}/cook",
      operationId: "cookRecipe",
      request: {
        params: z.object({ id: z.string() }),
        body: { content: { "application/json": { schema: CookRecipeInputSchema } } },
      },
      responses: {
        200: { description: "調理記録の結果" },
        404: { description: "見つからない" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const { deductions } = c.req.valid("json");
      try {
        const result = await deps.cookRecipe.execute({
          userId: c.get("userId"),
          recipeId: id,
          deductions,
        });
        return c.json(result, 200);
      } catch (e) {
        if (e instanceof RecipeNotFoundError) return c.json({ message: e.message }, 404);
        throw e;
      }
    },
  );

  return app;
}

// 型の export は feature 単位で行う（設計書 §5）
export type RecipeRoutes = ReturnType<typeof createRecipeRoutes>;
