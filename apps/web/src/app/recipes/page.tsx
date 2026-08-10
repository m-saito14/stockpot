"use client";

import type { EffortMode, MealType } from "@stockpot/shared";
import { useState } from "react";
import { RecipeCard } from "../../components/recipe/recipe-card";
import type { RecipeQueryParams } from "../../lib/api";
import { useRecipes } from "../../lib/hooks";
import { EFFORT_LABEL, MEAL_LABEL, MEAL_ORDER } from "../../lib/labels";

type Sort = NonNullable<RecipeQueryParams["sort"]>;

const SORT_LABEL: Record<Sort, string> = {
  createdAt: "新着順",
  cookedCount: "よく作った順",
  lastCookedAt: "最終調理日",
};

/** レシピ一覧（設計書 §13.3）。フィルタ / ソート / お気に入りトグル。 */
export default function RecipesPage() {
  const [favorite, setFavorite] = useState(false);
  const [mealType, setMealType] = useState<MealType | undefined>();
  const [effortMode, setEffortMode] = useState<EffortMode | undefined>();
  const [sort, setSort] = useState<Sort>("createdAt");

  const query: RecipeQueryParams = {
    favorite: favorite || undefined,
    mealType,
    effortMode,
    sort,
  };
  const { data, isLoading, isError } = useRecipes(query);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">レシピ</h1>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip active={favorite} onClick={() => setFavorite((v) => !v)}>
          ⭐️ お気に入り
        </FilterChip>

        <Select
          value={mealType ?? ""}
          onChange={(v) => setMealType((v || undefined) as MealType | undefined)}
        >
          <option value="">食事：すべて</option>
          {MEAL_ORDER.map((m) => (
            <option key={m} value={m}>
              {MEAL_LABEL[m]}
            </option>
          ))}
        </Select>

        <Select
          value={effortMode ?? ""}
          onChange={(v) => setEffortMode((v || undefined) as EffortMode | undefined)}
        >
          <option value="">モード：すべて</option>
          <option value="EASY">{EFFORT_LABEL.EASY}</option>
          <option value="ELABORATE">{EFFORT_LABEL.ELABORATE}</option>
        </Select>

        <Select value={sort} onChange={(v) => setSort(v as Sort)}>
          {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <p className="text-slate-400">読み込み中…</p>}
      {isError && (
        <p className="rounded-xl bg-danger-soft p-4 text-sm text-danger">
          レシピの取得に失敗しました。
        </p>
      )}
      {data && data.recipes.length === 0 && (
        <p className="py-12 text-center text-slate-400">
          まだレシピがありません。在庫画面から提案してみましょう。
        </p>
      )}
      {data && data.recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-slate-300 text-slate-500 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
    >
      {children}
    </select>
  );
}
