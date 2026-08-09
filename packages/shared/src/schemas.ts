import { z } from "zod";
import {
  CookMethodSchema,
  EffortModeSchema,
  ExpiryTypeSchema,
  MealTypeSchema,
  StorageTypeSchema,
  UnitSchema,
} from "./enums.js";

/**
 * 設計書 §15.4 の LLM 出力スキーマ。
 * API のレスポンススキーマと生成スキーマを一本化する（§6）。
 * `mealType` / `effortMode` は入力値なので LLM に返させず、サーバー側で付与する。
 */
export const GeneratedIngredientSchema = z.object({
  name: z.string(),
  amountText: z.string(), // 表示用: "200g" / "適量"
  sourceItemId: z.string().nullable(), // 生成時に参照した在庫 ID
  deductQuantity: z.number().nullable(), // 減算用。不明なら null
  deductUnit: UnitSchema.nullable(),
});
export type GeneratedIngredient = z.infer<typeof GeneratedIngredientSchema>;

export const GeneratedStepSchema = z.object({
  order: z.number().int(),
  instruction: z.string(),
  method: CookMethodSchema,
});
export type GeneratedStep = z.infer<typeof GeneratedStepSchema>;

export const GeneratedRecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  estimatedMin: z.number().int(),
  ingredients: z.array(GeneratedIngredientSchema),
  steps: z.array(GeneratedStepSchema),
});
export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;

/** LLM に必ず 3 件返させる（設計書 §15.4） */
export const RecipeListSchema = z.object({
  recipes: z.array(GeneratedRecipeSchema).length(3),
});
export type RecipeList = z.infer<typeof RecipeListSchema>;

// ── API 入力スキーマ ──────────────────────────────────────────

/** POST /recipes/suggest の入力 */
export const SuggestRecipesInputSchema = z.object({
  mealType: MealTypeSchema,
  effortMode: EffortModeSchema,
});
export type SuggestRecipesInput = z.infer<typeof SuggestRecipesInputSchema>;

/** POST /inventory の入力 */
export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1),
  storageType: StorageTypeSchema,
  quantity: z.number().nonnegative(),
  unit: UnitSchema,
  expiryDate: z.string().date().nullable().optional(), // ISO date "YYYY-MM-DD"
  expiryType: ExpiryTypeSchema.nullable().optional(),
  note: z.string().nullable().optional(),
});
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;

/** PATCH /inventory/:id の入力（数量 / 保存場所 / 期限 / メモ、カード移動含む） */
export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;

/** POST /recipes/:id/cook の入力（設計書 §16.2） */
export const CookRecipeInputSchema = z.object({
  deductions: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().positive(),
    }),
  ),
});
export type CookRecipeInput = z.infer<typeof CookRecipeInputSchema>;

// ── cook-plan（減算案）の分類 ─────────────────────────────────

/** 設計書 §16.1 の 3 分類 */
export const CookPlanStatusSchema = z.enum(["SUGGESTED", "MANUAL", "NOT_FOUND"]);
export type CookPlanStatus = z.infer<typeof CookPlanStatusSchema>;

export const CookPlanItemSchema = z.object({
  ingredientId: z.string(),
  name: z.string(),
  itemId: z.string().nullable(),
  currentQuantity: z.number().nullable(),
  unit: UnitSchema.nullable(),
  suggestedDeduction: z.number().nullable(),
  status: CookPlanStatusSchema,
});
export type CookPlanItem = z.infer<typeof CookPlanItemSchema>;

export const CookPlanSchema = z.object({
  items: z.array(CookPlanItemSchema),
});
export type CookPlan = z.infer<typeof CookPlanSchema>;
