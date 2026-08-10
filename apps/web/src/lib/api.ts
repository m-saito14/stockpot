import { createFetch } from "@stockpot/api-client";
import type {
  CookPlanStatus,
  CreateInventoryItemInput,
  EffortMode,
  ExpiryType,
  MealType,
  StorageType,
  Unit,
  UpdateInventoryItemInput,
} from "@stockpot/shared";
import { getIdToken } from "./firebase";

/**
 * API 呼び出しの薄いラッパ（設計書 §9）。
 * データの読み書きは必ず Hono API 経由。Server Actions にロジックを置かない。
 * 認証は api-client の createFetch（Bearer トークン付与）を使う。
 */
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const authedFetch = createFetch({ baseUrl, getToken: getIdToken });

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // レスポンスが JSON でない場合はステータステキストのまま
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const body = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });

// ── DTO（API レスポンス形。route の Zod と対応） ──────────────

export interface InventoryItemDto {
  id: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: Unit;
  expiryDate: string | null; // "YYYY-MM-DD"
  expiryType: ExpiryType | null;
  note: string | null;
}

export type GroupedInventory = Record<StorageType, InventoryItemDto[]>;

export interface RecipeIngredientDto {
  name: string;
  amountText: string;
  sourceItemId: string | null;
}

export interface RecipeStepDto {
  order: number;
  instruction: string;
  method: string;
}

export interface RecipeDto {
  id: string;
  title: string;
  description: string;
  mealType: MealType;
  effortMode: EffortMode;
  estimatedMin: number;
  isFavorite: boolean;
  cookedCount: number;
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
}

export interface SuggestResult {
  status: string;
  recipes: RecipeDto[];
}

export interface CookPlanItemDto {
  ingredientId: string;
  name: string;
  itemId: string | null;
  currentQuantity: number | null;
  unit: Unit | null;
  suggestedDeduction: number | null;
  status: CookPlanStatus;
}

export interface RecipeQueryParams {
  favorite?: boolean;
  mealType?: MealType;
  effortMode?: EffortMode;
  sort?: "createdAt" | "cookedCount" | "lastCookedAt";
}

// ── API 関数 ────────────────────────────────────────────────

export const api = {
  createSession: () =>
    request<{ userId: string; authUid: string }>("/auth/session", {
      method: "POST",
    }),

  listInventory: () => request<GroupedInventory>("/inventory"),

  createInventory: (input: CreateInventoryItemInput) =>
    request<InventoryItemDto>("/inventory", { method: "POST", ...body(input) }),

  updateInventory: (id: string, patch: UpdateInventoryItemInput) =>
    request<InventoryItemDto>(`/inventory/${id}`, {
      method: "PATCH",
      ...body(patch),
    }),

  deleteInventory: (id: string) =>
    request<void>(`/inventory/${id}`, { method: "DELETE" }),

  suggestRecipes: (input: { mealType: MealType; effortMode: EffortMode }) =>
    request<SuggestResult>("/recipes/suggest", { method: "POST", ...body(input) }),

  listRecipes: (query: RecipeQueryParams = {}) => {
    const params = new URLSearchParams();
    if (query.favorite !== undefined) params.set("favorite", String(query.favorite));
    if (query.mealType) params.set("mealType", query.mealType);
    if (query.effortMode) params.set("effortMode", query.effortMode);
    if (query.sort) params.set("sort", query.sort);
    const qs = params.toString();
    return request<{ recipes: RecipeDto[] }>(`/recipes${qs ? `?${qs}` : ""}`);
  },

  getRecipe: (id: string) => request<RecipeDto>(`/recipes/${id}`),

  setFavorite: (id: string, isFavorite: boolean) =>
    request<RecipeDto>(`/recipes/${id}`, { method: "PATCH", ...body({ isFavorite }) }),

  deleteRecipe: (id: string) => request<void>(`/recipes/${id}`, { method: "DELETE" }),

  getCookPlan: (id: string) =>
    request<{ items: CookPlanItemDto[] }>(`/recipes/${id}/cook-plan`),

  cookRecipe: (id: string, deductions: { itemId: string; quantity: number }[]) =>
    request<{ updatedItemIds: string[]; deletedItemIds: string[] }>(
      `/recipes/${id}/cook`,
      { method: "POST", ...body({ deductions }) },
    ),
};
