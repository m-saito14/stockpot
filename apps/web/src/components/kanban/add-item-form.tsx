"use client";

import type { ExpiryType, StorageType, Unit } from "@stockpot/shared";
import { type FormEvent, useState } from "react";
import { useCreateInventory } from "../../lib/hooks";
import { UNIT_LABEL } from "../../lib/labels";
import { Modal } from "../ui/modal";

const UNITS: Unit[] = ["PIECE", "GRAM", "MILLILITER", "PACK", "BUNCH"];

/** 在庫追加フォーム（設計書 §13.1 の [+ 追加]）。 */
export function AddItemForm({
  storageType,
  open,
  onClose,
}: {
  storageType: StorageType;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateInventory();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>("PIECE");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryType, setExpiryType] = useState<ExpiryType>("BEST_BEFORE");
  const [note, setNote] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      name: name.trim(),
      storageType,
      quantity: Number(quantity),
      unit,
      expiryDate: expiryDate || null,
      expiryType: expiryDate ? expiryType : null,
      note: note.trim() || null,
    });
    reset();
    onClose();
  }

  function reset() {
    setName("");
    setQuantity("1");
    setUnit("PIECE");
    setExpiryDate("");
    setNote("");
  }

  return (
    <Modal open={open} onClose={onClose} title="在庫を追加">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">食材名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-600">数量</span>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-600">単位</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABEL[u]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-600">期限（任意）</span>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-sm text-slate-600">期限種別</span>
            <select
              value={expiryType}
              onChange={(e) => setExpiryType(e.target.value as ExpiryType)}
              disabled={!expiryDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              <option value="BEST_BEFORE">賞味期限</option>
              <option value="CONSUME_BY">消費期限</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">メモ（任意）</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        {create.isError && <p className="text-sm text-danger">追加に失敗しました。</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-slate-500 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            追加する
          </button>
        </div>
      </form>
    </Modal>
  );
}
