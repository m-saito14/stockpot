"use client";

import { useDroppable } from "@dnd-kit/core";
import type { StorageType } from "@stockpot/shared";
import { useState } from "react";
import type { InventoryItemDto } from "../../lib/api";
import { STORAGE_LABEL } from "../../lib/labels";
import { AddItemForm } from "./add-item-form";
import { ItemCard } from "./item-card";

const ACCENT: Record<StorageType, string> = {
  PANTRY: "border-t-pantry",
  FRIDGE: "border-t-fridge",
  FREEZER: "border-t-freezer",
};

/** カンバンの 1 列（保存場所）。ドロップ先になる（設計書 §13.1）。 */
export function Column({
  storageType,
  items,
}: {
  storageType: StorageType;
  items: InventoryItemDto[];
}) {
  const [adding, setAdding] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: storageType });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-72 flex-1 flex-col rounded-2xl border-t-4 bg-slate-100/70 p-3 transition ${
        ACCENT[storageType]
      } ${isOver ? "ring-2 ring-brand-400" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-bold">
          {STORAGE_LABEL[storageType]}
          <span className="ml-2 text-sm font-normal text-slate-400">{items.length}</span>
        </h2>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">在庫がありません</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-3 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600"
      >
        + 追加
      </button>

      <AddItemForm
        storageType={storageType}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </section>
  );
}
