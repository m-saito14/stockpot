"use client";

import { Board } from "../components/kanban/board";
import { SuggestionBar } from "../components/recipe/suggestion-bar";
import { useInventory } from "../lib/hooks";

/** メイン画面（カンバン）。設計書 §13.1 / §13.2。 */
export default function HomePage() {
  const { data, isLoading, isError } = useInventory();

  return (
    <div>
      <SuggestionBar />

      {isLoading && <BoardSkeleton />}
      {isError && (
        <p className="rounded-xl bg-danger-soft p-4 text-sm text-danger">
          在庫の取得に失敗しました。API が起動しているか確認してください。
        </p>
      )}
      {data && <Board inventory={data} />}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex-1 space-y-2 rounded-2xl bg-slate-100 p-3">
          <div className="skeleton h-6 w-20 rounded" />
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
