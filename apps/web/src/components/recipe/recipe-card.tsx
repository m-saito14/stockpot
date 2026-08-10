"use client";

import Link from "next/link";
import type { RecipeDto } from "../../lib/api";
import { useToggleFavorite } from "../../lib/hooks";
import { EFFORT_LABEL, MEAL_LABEL } from "../../lib/labels";

/** レシピカード（設計書 §13.2 / §13.3）。一覧・生成結果で共用。 */
export function RecipeCard({ recipe }: { recipe: RecipeDto }) {
  const toggle = useToggleFavorite();

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => toggle.mutate({ id: recipe.id, isFavorite: !recipe.isFavorite })}
        disabled={toggle.isPending}
        className="absolute right-3 top-3 text-xl"
        aria-label={recipe.isFavorite ? "お気に入り解除" : "お気に入り登録"}
      >
        {recipe.isFavorite ? "⭐️" : "☆"}
      </button>

      <Link href={`/recipes/${recipe.id}`} className="block">
        <div className="mb-2 flex flex-wrap gap-1">
          <Tag>{MEAL_LABEL[recipe.mealType]}</Tag>
          <Tag>{EFFORT_LABEL[recipe.effortMode]}</Tag>
          {recipe.estimatedMin > 0 && <Tag>約{recipe.estimatedMin}分</Tag>}
        </div>
        <h3 className="pr-6 font-bold">{recipe.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{recipe.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <span>材料 {recipe.ingredients.length} 品</span>
          {recipe.cookedCount > 0 && <span>{recipe.cookedCount} 回調理</span>}
        </div>
      </Link>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}
