import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { AuthVariables } from "../../../shared/auth/middleware.js";
import { authMiddleware } from "../../../shared/auth/middleware.js";

/**
 * POST /auth/session — Firebase ID トークン検証 + User の JIT 作成（設計書 §14 / §17）。
 * JIT 作成は authMiddleware 内の upsert が担う。ここは検証済みの userId を返すだけ。
 */
export function createAuthRoutes() {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>();
  app.use("*", authMiddleware);

  app.openapi(
    createRoute({
      method: "post",
      path: "/session",
      operationId: "createSession",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ userId: z.string(), authUid: z.string() }),
            },
          },
          description: "検証済みユーザー",
        },
      },
    }),
    (c) => c.json({ userId: c.get("userId"), authUid: c.get("authUid") }, 200),
  );

  return app;
}

export type AuthRoutes = ReturnType<typeof createAuthRoutes>;
