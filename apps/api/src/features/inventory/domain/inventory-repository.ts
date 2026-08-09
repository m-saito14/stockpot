import type {
  InventoryItem,
  NewInventoryItem,
  UpdateInventoryFields,
} from "./inventory-item.js";

/**
 * ★ ORM 境界のポート（設計書 §3 ②）。
 * Prisma の生成型を domain / application に漏らさないための境界。
 */
export interface InventoryRepository {
  findAll(userId: string): Promise<InventoryItem[]>;
  findById(userId: string, id: string): Promise<InventoryItem | null>;
  create(userId: string, input: NewInventoryItem): Promise<InventoryItem>;
  update(
    userId: string,
    id: string,
    fields: UpdateInventoryFields,
  ): Promise<InventoryItem | null>;
  delete(userId: string, id: string): Promise<boolean>;
}
