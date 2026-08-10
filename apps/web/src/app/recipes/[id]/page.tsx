"use client";

import type { CookMethod } from "@stockpot/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CookModal } from "../../../components/recipe/cook-modal";
import { useDeleteRecipe, useRecipe, useToggleFavorite } from "../../../lib/hooks";
import { EFFORT_LABEL, MEAL_LABEL, METHOD_ICON, METHOD_LABEL } from "../../../lib/labels";

/** レシピ詳細（設計書 §13.4）。材料・手順（method アイコン）・[作った]。 */
export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading, isError } = useRecipe(id);
  const toggle = useToggleFavorite();
  const remove = useDeleteRecipe();
  const [cooking, setCooking] = useState(false);

  if (isLoading) return <p className="text-slate-400">読み込み中…</p>;
  if (isError || !recipe)
    return (
      <div className="py-12 text-center text-slate-400">
        <p>レシピが見つかりません。</p>
        <Link href="/recipes" className="mt-2 inline-block text-brand-600">
          一覧に戻る
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/recipes" className="text-sm text-slate-500">
        ← レシピ一覧
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-1">
            <Tag>{MEAL_LABEL[recipe.mealType]}</Tag>
            <Tag>{EFFORT_LABEL[recipe.effortMode]}</Tag>
            {recipe.estimatedMin > 0 && <Tag>約{recipe.estimatedMin}分</Tag>}
          </div>
          <h1 className="text-2xl font-bold">{recipe.title}</h1>
          <p className="mt-1 text-slate-500">{recipe.description}</p>
        </div>
        <button
          type="button"
          onClick={() => toggle.mutate({ id: recipe.id, isFavorite: !recipe.isFavorite })}
          className="text-2xl"
          aria-label="お気に入り"
        >
          {recipe.isFavorite ? "⭐️" : "☆"}
        </button>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 font-bold">材料</h2>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {recipe.ingredients.map((ing, i) => (
            <li key={`${ing.name}-${i}`} className="flex justify-between px-4 py-2.5">
              <span>{ing.name}</span>
              <span className="text-slate-500">{ing.amountText}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-bold">手順</h2>
        <ol className="space-y-3">
          {recipe.steps.map((step) => (
            <li key={step.order} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                {step.order}
              </span>
              <p className="flex-1">
                <MethodIcon method={step.method as CookMethod} /> {step.instruction}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCooking(true)}
          className="flex-1 rounded-xl bg-brand-500 py-3 text-lg font-bold text-white transition hover:bg-brand-600"
        >
          作った
        </button>
        <button
          type="button"
          onClick={async () => {
            if (confirm("このレシピを削除しますか？")) {
              await remove.mutateAsync(recipe.id);
              router.push("/recipes");
            }
          }}
          className="rounded-xl border border-slate-300 px-4 py-3 text-slate-500 hover:bg-slate-100"
        >
          削除
        </button>
      </div>

      <CookModal
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        open={cooking}
        onClose={() => setCooking(false)}
        onCooked={() => undefined}
      />
    </div>
  );
}

function MethodIcon({ method }: { method: CookMethod }) {
  if (method === "NONE") return null;
  return (
    <span title={METHOD_LABEL[method]} className="mr-0.5">
      {METHOD_ICON[method]}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}
