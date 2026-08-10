"use client";

import { useDraggable } from "@dnd-kit/core";
import { applyStep } from "@stockpot/shared";
import { type FormEvent, useState } from "react";
import type { InventoryItemDto } from "../../lib/api";
import { useDeleteInventory, useUpdateInventory } from "../../lib/hooks";
import { UNIT_LABEL } from "../../lib/labels";
import { ExpiryBadge } from "./expiry-badge";

/**
 * 在庫カード（設計書 §13.1）。
 * - 数量 ± は unit ごとの刻み幅（packages/shared の applyStep）
 * - 食材名はインライン編集
 * - dnd-kit で列またぎのドラッグが可能（移動先の列で storageType を更新）
 */
export function ItemCard({ item }: { item: InventoryItemDto }) {
  const update = useUpdateInventory();
  const remove = useDeleteInventory();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { storageType: item.storageType },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  function setQuantity(next: number) {
    update.mutate({ id: item.id, patch: { quantity: next } });
  }

  function commitName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== item.name) {
      update.mutate({ id: item.id, patch: { name: trimmed } });
    } else {
      setName(item.name);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <form onSubmit={commitName} className="flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              // biome-ignore lint/a11y/noAutofocus: インライン編集開始時にフォーカスするのが自然
              autoFocus
              className="w-full rounded border border-slate-300 px-1 py-0.5 text-sm"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left font-medium"
          >
            {item.name}
          </button>
        )}

        {/* ドラッグハンドル */}
        <button
          type="button"
          className="cursor-grab px-1 text-slate-300 hover:text-slate-500"
          aria-label="移動"
          {...listeners}
          {...attributes}
        >
          ⠿
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setQuantity(applyStep(item.quantity, item.unit, -1))}
          disabled={update.isPending || item.quantity <= 0}
          className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-lg leading-none disabled:opacity-40"
          aria-label="減らす"
        >
          −
        </button>
        <span className="min-w-14 text-center tabular-nums">
          {item.quantity}
          <span className="ml-0.5 text-xs text-slate-500">{UNIT_LABEL[item.unit]}</span>
        </span>
        <button
          type="button"
          onClick={() => setQuantity(applyStep(item.quantity, item.unit, 1))}
          disabled={update.isPending}
          className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-lg leading-none disabled:opacity-40"
          aria-label="増やす"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm(`「${item.name}」を削除しますか？`)) remove.mutate(item.id);
          }}
          className="ml-auto text-slate-300 hover:text-danger"
          aria-label="削除"
        >
          🗑
        </button>
      </div>

      {(item.expiryDate || item.note) && (
        <div className="mt-2 flex items-center gap-2">
          <ExpiryBadge item={item} />
          {item.note && (
            <span className="truncate text-xs text-slate-400">{item.note}</span>
          )}
        </div>
      )}
    </div>
  );
}
