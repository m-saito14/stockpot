import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { prisma } from "./shared/db/prisma.js";
import { createRecipeGenerator } from "./shared/llm/model.js";
import { PrismaInventoryRepository } from "./features/inventory/infrastructure/prisma-inventory-repository.js";
import { PrismaRecipeRepository } from "./features/recipe/infrastructure/prisma-recipe-repository.js";
import { SuggestRecipes } from "./features/recipe/application/suggest-recipes.js";
import { GetCookPlan } from "./features/recipe/application/get-cook-plan.js";
import { CookRecipe } from "./features/recipe/application/cook-recipe.js";
import { createInventoryRoutes } from "./features/inventory/presentation/routes.js";
import { createRecipeRoutes } from "./features/recipe/presentation/routes.js";
import { createAuthRoutes } from "./features/auth/presentation/routes.js";

/**
 * composition root（設計書 §3: DI は手書き配線で足りる）。
 * ここでポート → 実装の配線を集約する。
 */
export function createApp() {
  // infrastructure（ORM 境界 / LLM 境界の実装）
  const inventoryRepo = new PrismaInventoryRepository(prisma);
  const recipeRepo = new PrismaRecipeRepository(prisma);
  const generator = createRecipeGenerator();

  // application（ユースケース）
  const suggestRecipes = new SuggestRecipes(inventoryRepo, generator, recipeRepo);
  const getCookPlan = new GetCookPlan(recipeRepo, inventoryRepo);
  const cookRecipe = new CookRecipe(recipeRepo);

  const app = new OpenAPIHono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.route("/auth", createAuthRoutes());
  app.route("/inventory", createInventoryRoutes(inventoryRepo));
  app.route(
    "/recipes",
    createRecipeRoutes({ repo: recipeRepo, suggestRecipes, getCookPlan, cookRecipe }),
  );

  // OpenAPI スペック（@hono/zod-openapi により初日から存在する / 設計書 §5）
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: { title: "stockpot API", version: "0.1.0" },
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ message: err.message }, err.status);
    }
    console.error(err);
    return c.json({ message: "サーバーエラー" }, 500);
  });

  return app;
}
