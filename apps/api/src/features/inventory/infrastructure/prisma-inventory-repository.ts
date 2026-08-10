import type { PrismaClient, InventoryItem as PrismaItem } from "@prisma/client";
import { toNumberStrict } from "../../../shared/db/decimal.js";
import type {
  InventoryItem,
  NewInventoryItem,
  UpdateInventoryFields,
} from "../domain/inventory-item.js";
import type { InventoryRepository } from "../domain/inventory-repository.js";

/**
 * ★ ORM 境界の実装（設計書 §3 ② / §18.2）。
 * Prisma の生成型を toDomain で境界の外に出さない。
 */
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(userId: string): Promise<InventoryItem[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { userId },
      // 期限昇順の自動ソート。期限なしは末尾（設計書 §13.1）
      orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
    return rows.map(toDomain);
  }

  async findById(userId: string, id: string): Promise<InventoryItem | null> {
    const row = await this.prisma.inventoryItem.findFirst({ where: { id, userId } });
    return row ? toDomain(row) : null;
  }

  async create(userId: string, input: NewInventoryItem): Promise<InventoryItem> {
    const row = await this.prisma.inventoryItem.create({
      data: {
        userId,
        name: input.name,
        storageType: input.storageType,
        quantity: input.quantity,
        unit: input.unit,
        expiryDate: input.expiryDate ?? null,
        expiryType: input.expiryType ?? null,
        note: input.note ?? null,
      },
    });
    return toDomain(row);
  }

  async update(
    userId: string,
    id: string,
    fields: UpdateInventoryFields,
  ): Promise<InventoryItem | null> {
    // 所有権を where に含めることで他ユーザーの更新を防ぐ（IDOR 対策）
    const result = await this.prisma.inventoryItem.updateMany({
      where: { id, userId },
      data: fields,
    });
    if (result.count === 0) return null;
    return this.findById(userId, id);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.inventoryItem.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
}

/** ← ここが ORM 境界。Prisma 行をドメインエンティティへ写像する。 */
function toDomain(row: PrismaItem): InventoryItem {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    storageType: row.storageType,
    quantity: toNumberStrict(row.quantity),
    unit: row.unit,
    expiryDate: row.expiryDate,
    expiryType: row.expiryType,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
