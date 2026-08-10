"use client";

import { useEffect, useMemo, useState } from "react";
import type { CookPlanItemDto } from "../../lib/api";
import { useCookPlan, useCookRecipe } from "../../lib/hooks";
import { UNIT_LABEL } from "../../lib/labels";
import { Modal } from "../ui/modal";

interface Row {
  checked: boolean;
  quantity: string;
}

/**
 * 調理確定モーダル（設計書 §13.5 / §16）。
 * cook-plan の 3 分類（SUGGESTED / MANUAL / NOT_FOUND）に応じて UI を出し分け、
 * 確定内容で減算 + CookLog 記録を行う。
 */
export function CookModal({
  recipeId,
  recipeTitle,
  open,
  onClose,
  onCooked,
}: {
  recipeId: string;
  recipeTitle: string;
  open: boolean;
  onClose: () => void;
  onCooked: () => void;
}) {
  const { data, isLoading } = useCookPlan(recipeId, open);
  const cook = useCookRecipe();
  const [rows, setRows] = useState<Record<string, Row>>({});

  const items = data?.items;

  // cook-plan を受け取ったら初期状態を作る（設計書 §16.1）
  useEffect(() => {
    if (!items) return;
    const next: Record<string, Row> = {};
    for (const it of items) {
      next[it.ingredientId] = {
        checked: it.status === "SUGGESTED",
        quantity:
          it.status === "SUGGESTED" && it.suggestedDeduction != null
            ? String(it.suggestedDeduction)
            : "",
      };
    }
    setRows(next);
  }, [items]);

  const deductions = useMemo(() => {
    if (!items) return [];
    return items
      .filter((it) => it.itemId && rows[it.ingredientId]?.checked)
      .map((it) => ({
        itemId: it.itemId as string,
        quantity: Number(rows[it.ingredientId]?.quantity ?? "0"),
      }))
      .filter((d) => d.quantity > 0);
  }, [items, rows]);

  async function confirm() {
    await cook.mutateAsync({ id: recipeId, deductions });
    onCooked();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`「${recipeTitle}」を作りましたか？`}>
      {isLoading && <p className="py-6 text-center text-slate-400">在庫を確認中…</p>}

      {items && (
        <>
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <CookRow
                key={it.ingredientId}
                item={it}
                row={rows[it.ingredientId] ?? { checked: false, quantity: "" }}
                onChange={(row) =>
                  setRows((prev) => ({ ...prev, [it.ingredientId]: row }))
                }
              />
            ))}
          </ul>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-slate-500 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={cook.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {cook.isPending ? "記録中…" : "確定して記録"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function CookRow({
  item,
  row,
  onChange,
}: {
  item: CookPlanItemDto;
  row: Row;
  onChange: (row: Row) => void;
}) {
  const unit = item.unit ? UNIT_LABEL[item.unit] : "";

  if (item.status === "NOT_FOUND") {
    return (
      <li className="flex items-center gap-3 py-3 text-slate-400">
        <span className="w-5 text-center">—</span>
        <span className="flex-1">{item.name}</span>
        <span className="text-xs">在庫に見つかりません</span>
      </li>
    );
  }

  const deducted = Number(row.quantity || "0");
  const remaining = item.currentQuantity != null ? item.currentQuantity - deducted : null;
  const willDelete = row.checked && remaining != null && remaining <= 0;

  return (
    <li className="flex items-center gap-3 py-3">
      <input
        type="checkbox"
        checked={row.checked}
        onChange={(e) => onChange({ ...row, checked: e.target.checked })}
        className="h-4 w-4"
        aria-label={`${item.name} を減算する`}
      />
      <div className="flex-1">
        <div className="font-medium">
          {item.name}
          {willDelete && (
            <span className="ml-1" title="使い切り（削除）">
              🗑
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">
          在庫 {item.currentQuantity}
          {unit}
          {row.checked && remaining != null && (
            <>
              {" "}
              → {Math.max(remaining, 0)}
              {unit}
            </>
          )}
          {item.status === "MANUAL" && "（数量を入力してください）"}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          step="any"
          value={row.quantity}
          disabled={!row.checked}
          onChange={(e) => onChange({ ...row, quantity: e.target.value })}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50 disabled:opacity-50"
        />
        <span className="w-8 text-xs text-slate-500">{unit}</span>
      </div>
    </li>
  );
}
