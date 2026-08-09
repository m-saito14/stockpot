import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  CreateInventoryItemSchema,
  StorageTypeSchema,
  UpdateInventoryItemSchema,
  type CreateInventoryItemInput,
  type StorageType,
  type UpdateInventoryItemInput,
} from "@stockpot/shared";
import type { AuthVariables } from "../../../shared/auth/middleware.js";
import { authMiddleware } from "../../../shared/auth/middleware.js";
import type { InventoryRepository } from "../domain/inventory-repository.js";
import type {
  InventoryItem,
  NewInventoryItem,
  UpdateInventoryFields,
} from "../domain/inventory-item.js";

const ItemResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    storageType: StorageTypeSchema,
    quantity: z.number(),
    unit: z.string(),
    expiryDate: z.string().nullable(),
    expiryType: z.string().nullable(),
    note: z.string().nullable(),
  })
  .openapi("InventoryItem");

function toResponse(it: InventoryItem) {
  return {
    id: it.id,
    name: it.name,
    storageType: it.storageType,
    quantity: it.quantity,
    unit: it.unit,
    expiryDate: it.expiryDate ? it.expiryDate.toISOString().slice(0, 10) : null,
    expiryType: it.expiryType,
    note: it.note,
  };
}

/** 作成入力（期限文字列）をドメインの NewInventoryItem（Date）へ。 */
function toCreate(input: CreateInventoryItemInput): NewInventoryItem {
  return {
    name: input.name,
    storageType: input.storageType,
    quantity: input.quantity,
    unit: input.unit,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    expiryType: input.expiryType ?? null,
    note: input.note ?? null,
  };
}

/** 更新入力（部分・期限文字列）をドメインの部分フィールドへ。 */
function toUpdate(input: UpdateInventoryItemInput): UpdateInventoryFields {
  const fields: UpdateInventoryFields = {};
  if (input.name !== undefined) fields.name = input.name;
  if (input.storageType !== undefined) fields.storageType = input.storageType;
  if (input.quantity !== undefined) fields.quantity = input.quantity;
  if (input.unit !== undefined) fields.unit = input.unit;
  if (input.expiryDate !== undefined)
    fields.expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;
  if (input.expiryType !== undefined) fields.expiryType = input.expiryType ?? null;
  if (input.note !== undefined) fields.note = input.note ?? null;
  return fields;
}

/**
 * 在庫ルート（設計書 §14）。composition root からリポジトリを注入する。
 * 全ルートに authMiddleware を適用し、userId は c.get で取得する。
 */
export function createInventoryRoutes(repo: InventoryRepository) {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>();
  app.use("*", authMiddleware);

  // GET /inventory — storageType でグルーピングして返す
  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      operationId: "listInventory",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                PANTRY: z.array(ItemResponseSchema),
                FRIDGE: z.array(ItemResponseSchema),
                FREEZER: z.array(ItemResponseSchema),
              }),
            },
          },
          description: "在庫を保存場所ごとにグルーピングして返す",
        },
      },
    }),
    async (c) => {
      const items = await repo.findAll(c.get("userId"));
      const grouped: Record<StorageType, ReturnType<typeof toResponse>[]> = {
        PANTRY: [],
        FRIDGE: [],
        FREEZER: [],
      };
      for (const it of items) grouped[it.storageType].push(toResponse(it));
      return c.json(grouped, 200);
    },
  );

  // POST /inventory
  app.openapi(
    createRoute({
      method: "post",
      path: "/",
      operationId: "createInventory",
      request: {
        body: {
          content: { "application/json": { schema: CreateInventoryItemSchema } },
        },
      },
      responses: {
        201: {
          content: { "application/json": { schema: ItemResponseSchema } },
          description: "作成した在庫",
        },
      },
    }),
    async (c) => {
      const input = c.req.valid("json");
      const created = await repo.create(c.get("userId"), toCreate(input));
      return c.json(toResponse(created), 201);
    },
  );

  // PATCH /inventory/:id — 数量 / 保存場所 / 期限 / メモ（カード移動も含む）
  app.openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      operationId: "updateInventory",
      request: {
        params: z.object({ id: z.string() }),
        body: {
          content: { "application/json": { schema: UpdateInventoryItemSchema } },
        },
      },
      responses: {
        200: {
          content: { "application/json": { schema: ItemResponseSchema } },
          description: "更新後の在庫",
        },
        404: { description: "見つからない" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const updated = await repo.update(c.get("userId"), id, toUpdate(input));
      if (!updated) return c.json({ message: "見つかりません" }, 404);
      return c.json(toResponse(updated), 200);
    },
  );

  // DELETE /inventory/:id
  app.openapi(
    createRoute({
      method: "delete",
      path: "/{id}",
      operationId: "deleteInventory",
      request: { params: z.object({ id: z.string() }) },
      responses: {
        204: { description: "削除完了" },
        404: { description: "見つからない" },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const ok = await repo.delete(c.get("userId"), id);
      if (!ok) return c.json({ message: "見つかりません" }, 404);
      return c.body(null, 204);
    },
  );

  return app;
}

// 型の export は feature 単位で行う（設計書 §5: tsc 性能対策）
export type InventoryRoutes = ReturnType<typeof createInventoryRoutes>;
