"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { StorageType } from "@stockpot/shared";
import type { GroupedInventory } from "../../lib/api";
import { useUpdateInventory } from "../../lib/hooks";
import { STORAGE_ORDER } from "../../lib/labels";
import { Column } from "./column";

/**
 * カンバン本体（設計書 §13.1）。
 * ドラッグ&ドロップは列をまたぐ移動のみ → PATCH /inventory/:id { storageType }。
 * 手動並び替えは実装しない（期限昇順の自動ソートはサーバー側）。
 */
export function Board({ inventory }: { inventory: GroupedInventory }) {
  const update = useUpdateInventory();
  // 8px 動かすまでドラッグ開始しない（クリック操作と競合させない）
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const target = e.over?.id as StorageType | undefined;
    const from = e.active.data.current?.storageType as StorageType | undefined;
    if (!target || !from || target === from) return;
    update.mutate({ id: String(e.active.id), patch: { storageType: target } });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {STORAGE_ORDER.map((storage) => (
          <Column key={storage} storageType={storage} items={inventory[storage]} />
        ))}
      </div>
    </DndContext>
  );
}
