"use client";

import type { EffortMode, MealType } from "@stockpot/shared";
import { useState } from "react";
import { ApiError, type RecipeDto } from "../../lib/api";
import { useSuggestRecipes } from "../../lib/hooks";
import { EFFORT_LABEL, MEAL_LABEL, MEAL_ORDER } from "../../lib/labels";
import { useEffortMode } from "../../lib/use-effort-mode";
import { Modal } from "../ui/modal";
import { RecipeCard } from "./recipe-card";
import { StagedProgress } from "./staged-progress";

/**
 * 生成トリガー（設計書 §13.1）と生成中/結果表示（§13.2）。
 * 朝食/昼食/夕食ボタン × お手軽/本格モードでレシピ 3 件を生成する。
 */
export function SuggestionBar() {
  const [effortMode, setEffortMode] = useEffortMode();
  const suggest = useSuggestRecipes();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<RecipeDto[]>([]);

  function generate(mealType: MealType) {
    setOpen(true);
    setResults([]);
    suggest.mutate(
      { mealType, effortMode },
      { onSuccess: (res) => setResults(res.recipes) },
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <ModeSwitch value={effortMode} onChange={setEffortMode} />

      <div className="flex gap-2">
        {MEAL_ORDER.map((meal) => (
          <button
            key={meal}
            type="button"
            onClick={() => generate(meal)}
            className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white transition hover:bg-brand-600"
          >
            {MEAL_LABEL[meal]}を提案
          </button>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={suggest.isPending ? undefined : "提案されたレシピ"}
      >
        {suggest.isPending && <StagedProgress />}

        {suggest.isError && <ErrorView error={suggest.error} />}

        {suggest.isSuccess && results.length > 0 && (
          <div className="space-y-3">
            {results.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
            <p className="pt-1 text-center text-xs text-slate-400">
              レシピは自動保存されました。詳細は「レシピ」から確認できます。
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ModeSwitch({
  value,
  onChange,
}: {
  value: EffortMode;
  onChange: (m: EffortMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm">
      {(["EASY", "ELABORATE"] as EffortMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1.5 font-medium transition ${
            value === m ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
          }`}
        >
          {EFFORT_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function ErrorView({ error }: { error: unknown }) {
  const emptyInventory = error instanceof ApiError && error.status === 409;
  return (
    <div className="py-6 text-center">
      <p className="text-4xl">🥕</p>
      <p className="mt-3 font-medium text-slate-700">
        {emptyInventory ? "食材を追加してください" : "レシピの生成に失敗しました"}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {emptyInventory
          ? "在庫が空のためレシピを作れません。"
          : "時間をおいて再度お試しください。"}
      </p>
    </div>
  );
}
