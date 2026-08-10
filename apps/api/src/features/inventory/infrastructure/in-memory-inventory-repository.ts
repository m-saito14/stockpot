import type {
  InventoryItem,
  NewInventoryItem,
  UpdateInventoryFields,
} from "../domain/inventory-item.js";
import type { InventoryRepository } from "../domain/inventory-repository.js";

/**
 * テスト用・ローカル開発用のインメモリ実装。
 * 設計書 §18.4: スタブ／テスト用実装はプロダクションコードとして infrastructure に置く。
 * `__mocks__` に置かない（DB なしで application 層を検証するために使う）。
 */
export class InMemoryInventoryRepository implements InventoryRepository {
  private seq = 0;
  private readonly items = new Map<string, InventoryItem>();

  constructor(seed: InventoryItem[] = []) {
    for (const it of seed) this.items.set(it.id, it);
  }

  async findAll(userId: string): Promise<InventoryItem[]> {
    return [...this.items.values()].filter((it) => it.userId === userId);
  }

  async findById(userId: string, id: string): Promise<InventoryItem | null> {
    const it = this.items.get(id);
    return it && it.userId === userId ? it : null;
  }

  async create(userId: string, input: NewInventoryItem): Promise<InventoryItem> {
    const now = new Date(0);
    const item: InventoryItem = {
      id: `itm_mem_${++this.seq}`,
      userId,
      name: input.name,
      storageType: input.storageType,
      quantity: input.quantity,
      unit: input.unit,
      expiryDate: input.expiryDate ?? null,
      expiryType: input.expiryType ?? null,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  async update(
    userId: string,
    id: string,
    fields: UpdateInventoryFields,
  ): Promise<InventoryItem | null> {
    const existing = await this.findById(userId, id);
    if (!existing) return null;
    const updated: InventoryItem = { ...existing, ...fields, id, userId };
    this.items.set(id, updated);
    return updated;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await this.findById(userId, id);
    if (!existing) return false;
    return this.items.delete(id);
  }
}
