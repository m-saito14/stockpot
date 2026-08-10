"use client";

import type {
  CreateInventoryItemInput,
  EffortMode,
  MealType,
  UpdateInventoryItemInput,
} from "@stockpot/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type GroupedInventory,
  type RecipeDto,
  type RecipeQueryParams,
  api,
} from "./api";

/**
 * React Query フック（設計書 §5）。
 * コンポーネントから直接 fetch/hc を呼ばず、この層を経由する。
 */

const keys = {
  inventory: ["inventory"] as const,
  recipes: (q: RecipeQueryParams) => ["recipes", q] as const,
  recipe: (id: string) => ["recipe", id] as const,
  cookPlan: (id: string) => ["cook-plan", id] as const,
};

// ── 在庫 ────────────────────────────────────────────────────

export function useInventory() {
  return useQuery<GroupedInventory>({
    queryKey: keys.inventory,
    queryFn: api.listInventory,
  });
}

export function useCreateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInventoryItemInput) => api.createInventory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.inventory }),
  });
}

export function useUpdateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInventoryItemInput }) =>
      api.updateInventory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.inventory }),
  });
}

export function useDeleteInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInventory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.inventory }),
  });
}

// ── レシピ ──────────────────────────────────────────────────

export function useSuggestRecipes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { mealType: MealType; effortMode: EffortMode }) =>
      api.suggestRecipes(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useRecipes(query: RecipeQueryParams = {}) {
  return useQuery<{ recipes: RecipeDto[] }>({
    queryKey: keys.recipes(query),
    queryFn: () => api.listRecipes(query),
  });
}

export function useRecipe(id: string) {
  return useQuery<RecipeDto>({
    queryKey: keys.recipe(id),
    queryFn: () => api.getRecipe(id),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.setFavorite(id, isFavorite),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.setQueryData(keys.recipe(recipe.id), recipe);
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRecipe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

// ── 調理フロー ──────────────────────────────────────────────

export function useCookPlan(id: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.cookPlan(id),
    queryFn: () => api.getCookPlan(id),
    enabled,
  });
}

export function useCookRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      deductions,
    }: {
      id: string;
      deductions: { itemId: string; quantity: number }[];
    }) => api.cookRecipe(id, deductions),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: keys.inventory });
      qc.invalidateQueries({ queryKey: keys.recipe(id) });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
